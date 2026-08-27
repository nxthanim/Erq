"""JWT authentication middleware and utilities for FastAPI."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.config import settings
from python_backend.database import get_db, now_sql, set_rls_user

security = HTTPBearer(auto_error=False)


def _friendly_name(email: str) -> str:
    """Derive a display name from an email address local part."""
    local = (
        (email or "")
        .split("@")[0]
        .strip()
        .replace(".", " ")
        .replace("_", " ")
        .replace("-", " ")
    )
    parts = [p for p in local.split() if p]
    if not parts:
        return "Clerk User"
    return " ".join(p.capitalize() for p in parts)


async def resolve_user_by_clerk_token(token: str, db: AsyncSession, profile_hint: Optional[dict] = None) -> Optional[dict]:
    """Verify a Clerk session token and upsert the user into the local users table.

    profile_hint (optional) carries the profile the client already knows from
    Clerk's SDK (full_name / email / avatar) so the user record is created with
    the correct identity even when CLERK_SECRET_KEY is not configured on the
    backend (the Backend API fetch would otherwise return nothing).
    """
    profile_hint = profile_hint or {}
    try:
        from python_backend.clerk import (
            verify_clerk_token,
            fetch_clerk_user,
            clerk_user_to_profile,
        )

        claims = await verify_clerk_token(token)
        clerk_id = claims.get("sub")
        if not clerk_id:
            return None

        # Prefer profile from the Clerk Backend API (has email + name)
        clerk_profile = None
        clerk_user = await fetch_clerk_user(clerk_id)
        if clerk_user:
            clerk_profile = clerk_user_to_profile(clerk_user)

        email = (
            (clerk_profile or {}).get("email")
            or claims.get("email")
            or profile_hint.get("email")
            or ""
        )
        full_name = (
            (clerk_profile or {}).get("full_name")
            or claims.get("full_name")
            or claims.get("name")
            or profile_hint.get("full_name")
            or _friendly_name(email)
        )
        avatar = (clerk_profile or {}).get("avatar_url") or profile_hint.get("avatar_url") or ""

        # Find by clerk_id first, then by email
        result = await db.execute(
            text("SELECT id, email, full_name, role, phone, city, profile_picture, bio, skills, verified, rating, review_count FROM users WHERE clerk_id = :cid"),
            {"cid": clerk_id},
        )
        user = result.mappings().first()
        if not user and email:
            result = await db.execute(
                text("SELECT id, email, full_name, role, phone, city, profile_picture, bio, skills, verified, rating, review_count FROM users WHERE email = :email"),
                {"email": email},
            )
            user = result.mappings().first()
            if user:
                # Link clerk_id to the existing account
                await db.execute(
                    text("UPDATE users SET clerk_id = :cid WHERE id = :id"),
                    {"cid": clerk_id, "id": user["id"]},
                )

        if user:
            # Heal records created earlier with the generic "Clerk User"
            # placeholder (the backend could not fetch the profile back then).
            # Name and avatar are healed independently, and only when actually
            # missing — NULLIF keeps the existing value for empty bind params.
            new_name = full_name if ((not user["full_name"] or user["full_name"] == "Clerk User") and full_name != "Clerk User") else None
            new_avatar = avatar if (not user.get("profile_picture") and avatar) else None
            if new_name is not None or new_avatar is not None:
                await db.execute(
                    text("UPDATE users SET full_name = COALESCE(NULLIF(:name, ''), full_name), profile_picture = COALESCE(NULLIF(:avatar, ''), profile_picture) WHERE id = :id"),
                    {"name": new_name or "", "avatar": new_avatar or "", "id": user["id"]},
                )
                user = {
                    **user,
                    "full_name": new_name if new_name is not None else user["full_name"],
                    "profile_picture": new_avatar if new_avatar is not None else user.get("profile_picture"),
                }

        if not user:
            user_id = str(uuid.uuid4())
            await db.execute(
                text("""
                    INSERT INTO users (id, clerk_id, email, password, full_name, role, profile_picture, verified)
                    VALUES (:id, :cid, :email, '', :full_name, 'client', :avatar, 1)
                """),
                {
                    "id": user_id,
                    "cid": clerk_id,
                    "email": email or f"{clerk_id}@clerk.erq.et",
                    "full_name": full_name,
                    "avatar": avatar,
                },
            )
            result = await db.execute(
                text("SELECT id, email, full_name, role, phone, city, profile_picture, bio, skills, verified, rating, review_count FROM users WHERE id = :id"),
                {"id": user_id},
            )
            user = result.mappings().first()

        return dict(user) if user else None
    except Exception as exc:
        print(f"[auth] Clerk token resolution failed (falling back to JWT): {exc}")
        return None


def generate_token(user_id: str, email: str, role: str) -> str:
    """Generate a JWT token for a user."""
    payload = {
        "id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc)
        + timedelta(days=settings.JWT_EXPIRATION_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Returns payload dict or raises."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """FastAPI dependency: extracts, decodes JWT, and returns the user row."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    token = credentials.credentials

    # Fast path: legacy app JWT (issued by /clerk/sync or /auth/login)
    try:
        payload = decode_token(token)
        user_id = payload.get("id")

        result = await db.execute(
            text(
                """SELECT id, email, full_name, role, phone, city, profile_picture,
                          bio, skills, verified, rating, review_count
                   FROM users WHERE id = :id"""
            ),
            {"id": user_id},
        )
        user = result.mappings().first()
        if user:
            # Update last_active_at (fire-and-forget)
            try:
                await db.execute(
                    text("UPDATE users SET last_active_at = " + now_sql() + " WHERE id = :id"),
                    {"id": user_id},
                )
            except Exception:
                pass
            # Set the Row-Level-Security context for this request's transaction
            await set_rls_user(db, user["id"])
            return dict(user)
    except Exception:
        # Not an app JWT — fall through to Clerk verification
        pass

    # Clerk session token path (full migration)
    if settings.CLERK_PUBLISHABLE_KEY or settings.CLERK_SECRET_KEY:
        user = await resolve_user_by_clerk_token(token, db)
        if user:
            await set_rls_user(db, user["id"])
            return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )


def require_role(*roles: str):
    """Factory: returns a dependency that checks the user has one of the given roles."""

    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized access",
            )
        return user

    return role_checker


async def get_optional_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Optional[dict]:
    """Like get_current_user but returns None instead of 401 if no token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    try:
        # Fast path: app JWT
        payload = decode_token(auth_header[7:])
        result = await db.execute(
            text(
                """SELECT id, email, full_name, role, phone, city, profile_picture,
                          bio, skills, verified, rating, review_count
                   FROM users WHERE id = :id"""
            ),
            {"id": payload.get("id")},
        )
        user = result.mappings().first()
        if user:
            await set_rls_user(db, user["id"])
            return dict(user)
    except Exception:
        pass

    # Clerk session token path
    if settings.CLERK_PUBLISHABLE_KEY or settings.CLERK_SECRET_KEY:
        user = await resolve_user_by_clerk_token(auth_header[7:], db)
        if user:
            await set_rls_user(db, user["id"])
            return user
    return None


async def log_audit(
    db: AsyncSession,
    email: str,
    action: str,
    user_id: Optional[str] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
):
    """Log an authentication audit event."""
    try:
        audit_id = str(uuid.uuid4())
        await db.execute(
            text(
                """INSERT INTO login_audit (id, user_id, email, ip_address, user_agent, action)
                   VALUES (:id, :user_id, :email, :ip, :ua, :action)"""
            ),
            {
                "id": audit_id,
                "user_id": user_id,
                "email": email,
                "ip": ip or "unknown",
                "ua": user_agent or "unknown",
                "action": action,
            },
        )
    except Exception as exc:
        print(f"Audit log error: {exc}")
