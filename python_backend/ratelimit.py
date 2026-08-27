"""DB-backed rate limiting and IP ban enforcement.

Designed to work on PostgreSQL (production / Vercel serverless) AND SQLite
(local dev) with the same code path. Counters live in `rate_limit_hits` and
bans in `banned_ips` (both created by ensure_extra_columns / migration.sql),
so limits survive cold starts and scale across serverless instances — unlike
in-memory counters.

Behavior
--------
* Every request to ``/api/*`` (except /api/health and OPTIONS preflight) is
  counted against a per-IP window limit, bucketed into three classes:
  ``signup`` (tightest), ``auth`` (login/forgot/reset/verify/clerk), and
  ``general`` (everything else).
* When an IP exceeds its class limit it receives 429; each 429 records a
  breach marker. If an IP accumulates BAN_THRESHOLD_MULTIPLIER breaches
  within the window it is banned for BAN_DURATION_MINUTES and gets 403.
* The middleware fails OPEN on database errors (log + let the request
  through) so a DB hiccup never takes the whole API down.
"""

import random
import uuid
from datetime import datetime, timezone

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from python_backend.config import settings
from python_backend.database import AsyncSessionLocal, now_sql, interval_sql, interval_plus_sql

# Marker endpoint value for 429-breach events (used for ban escalation)
_BREACH_MARKER = "__breach__"

# Bucket labels stored in rate_limit_hits.endpoint
BUCKET_SIGNUP = "signup"
BUCKET_AUTH = "auth"
BUCKET_GENERAL = "general"

_AUTH_PATHS = {
    "/api/auth/login",
    "/api/auth/clerk/sync",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/verify-email",
}
_SIGNUP_PATHS = {"/api/auth/signup"}


def client_ip(request: Request) -> str:
    """Best-effort real client IP.

    Prefers the first hop of X-Forwarded-For (set by proxies/Vercel), then
    falls back to the socket peer address.
    """
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        ip = fwd.split(",")[0].strip()
        if ip:
            # strip any :port suffix
            return ip.split(":")[0]
    host = request.client.host if request.client else "unknown"
    return host


def bucket_for(path: str) -> str:
    if path in _SIGNUP_PATHS:
        return BUCKET_SIGNUP
    if path in _AUTH_PATHS:
        return BUCKET_AUTH
    return BUCKET_GENERAL


def limit_for(bucket: str) -> int:
    if bucket == BUCKET_SIGNUP:
        return settings.SIGNUP_RATE_LIMIT_MAX
    if bucket == BUCKET_AUTH:
        return settings.AUTH_RATE_LIMIT_MAX
    return settings.RATE_LIMIT_MAX_REQUESTS


async def _active_ban(ip: str) -> str | None:
    """Return the ISO banned_until for an active ban on this IP, else None."""
    async with AsyncSessionLocal() as db:
        # Opportunistic cleanup of expired bans
        try:
            await db.execute(
                text(f"DELETE FROM banned_ips WHERE banned_until <= {now_sql()}")
            )
            await db.commit()
        except Exception:
            await db.rollback()

        row = (
            await db.execute(
                text(
                    f"SELECT banned_until FROM banned_ips "
                    f"WHERE ip = :ip AND banned_until > {now_sql()} "
                    f"ORDER BY banned_until DESC LIMIT 1"
                ),
                {"ip": ip},
            )
        ).mappings().first()
        if row:
            dt = row["banned_until"]
            return dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
        return None


async def _count_and_record(ip: str, bucket: str) -> bool:
    """Count hits in the current window; record one and return whether over limit."""
    limit = limit_for(bucket)
    window_seconds = settings.RATE_LIMIT_WINDOW_MINUTES * 60
    async with AsyncSessionLocal() as db:
        count = (
            await db.execute(
                text(
                    f"SELECT COUNT(*) as c FROM rate_limit_hits "
                    f"WHERE ip = :ip AND endpoint = :bucket "
                    f"AND created_at > {interval_sql(window_seconds)}"
                ),
                {"ip": ip, "bucket": bucket},
            )
        ).mappings().first()["c"]
        if count >= limit:
            return True
        await db.execute(
            text(
                "INSERT INTO rate_limit_hits (id, ip, endpoint, method, created_at) "
                f"VALUES (:id, :ip, :bucket, :method, {now_sql()})"
            ),
            {"id": str(uuid.uuid4()), "ip": ip, "bucket": bucket, "method": "req"},
        )
        await db.commit()
        return False


async def _record_breach(ip: str):
    async with AsyncSessionLocal() as db:
        await db.execute(
            text(
                "INSERT INTO rate_limit_hits (id, ip, endpoint, method, created_at) "
                f"VALUES (:id, :ip, :endpoint, :method, {now_sql()})"
            ),
            {"id": str(uuid.uuid4()), "ip": ip, "endpoint": _BREACH_MARKER, "method": "breach"},
        )
        await db.commit()


async def _maybe_ban(ip: str) -> str | None:
    """Escalate to a temporary ban if breaches >= threshold. Returns banned_until ISO."""
    window_seconds = settings.RATE_LIMIT_WINDOW_MINUTES * 60
    threshold = settings.BAN_THRESHOLD_MULTIPLIER
    async with AsyncSessionLocal() as db:
        # Avoid double-bans from concurrent 429s
        existing = (
            await db.execute(
                text(
                    f"SELECT banned_until FROM banned_ips "
                    f"WHERE ip = :ip AND banned_until > {now_sql()} "
                    f"ORDER BY banned_until DESC LIMIT 1"
                ),
                {"ip": ip},
            )
        ).mappings().first()
        if existing:
            dt = existing["banned_until"]
            return dt.isoformat() if hasattr(dt, "isoformat") else str(dt)

        breaches = (
            await db.execute(
                text(
                    f"SELECT COUNT(*) as c FROM rate_limit_hits "
                    f"WHERE ip = :ip AND endpoint = :marker "
                    f"AND created_at > {interval_sql(window_seconds)}"
                ),
                {"ip": ip, "marker": _BREACH_MARKER},
            )
        ).mappings().first()["c"]
        if breaches >= threshold:
            ban_seconds = settings.BAN_DURATION_MINUTES * 60
            future = interval_plus_sql(ban_seconds)
            await db.execute(
                text(
                    "INSERT INTO banned_ips (id, ip, reason, banned_until, created_at) "
                    f"VALUES (:id, :ip, :reason, {future}, {now_sql()})"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "ip": ip,
                    "reason": f"Rate limit exceeded {threshold}x in {settings.RATE_LIMIT_WINDOW_MINUTES} min",
                },
            )
            await db.commit()
            row = (
                await db.execute(
                    text("SELECT banned_until FROM banned_ips WHERE ip = :ip ORDER BY created_at DESC LIMIT 1"),
                    {"ip": ip},
                )
            ).mappings().first()
            if row:
                dt = row["banned_until"]
                return dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
        return None


async def _sweep_old_hits():
    """Delete hit rows older than 2 windows (probabilistic, keeps table small)."""
    if random.random() > 0.02:
        return
    window_seconds = settings.RATE_LIMIT_WINDOW_MINUTES * 60
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                text(
                    f"DELETE FROM rate_limit_hits WHERE created_at < {interval_sql(window_seconds * 2)}"
                )
            )
            await db.commit()
    except Exception:
        pass


async def enforce_rate_limits(request: Request, call_next):
    """ASGI middleware function (used via @app.middleware('http'))."""
    path = request.url.path
    method = request.method

    # Skip non-API traffic, health checks, CORS preflight, and docs
    if (
        not settings.RATE_LIMIT_ENABLED
        or method == "OPTIONS"
        or not path.startswith("/api/")
        or path == "/api/health"
        or path in ("/docs", "/redoc", "/openapi.json")
    ):
        return await call_next(request)

    ip = client_ip(request)

    # 1) Hard ban check first
    try:
        banned_until = await _active_ban(ip)
        if banned_until:
            return JSONResponse(
                status_code=403,
                content={
                    "error": "IP temporarily banned",
                    "banned_until": banned_until,
                },
            )
    except Exception as exc:
        print(f"[ratelimit] ban check failed (fail-open): {exc}")

    # 2) Count against the window
    try:
        bucket = bucket_for(path)
        over_limit = await _count_and_record(ip, bucket)
        if over_limit:
            await _record_breach(ip)
            banned_until = await _maybe_ban(ip)
            if banned_until:
                return JSONResponse(
                    status_code=403,
                    content={
                        "error": "IP temporarily banned",
                        "banned_until": banned_until,
                    },
                )
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many requests",
                    "retry_after_seconds": settings.RATE_LIMIT_WINDOW_MINUTES * 60,
                },
            )
    except Exception as exc:
        print(f"[ratelimit] counting failed (fail-open): {exc}")

    # Opportunistic table sweep (keeps rate_limit_hits from growing forever)
    await _sweep_old_hits()

    return await call_next(request)
