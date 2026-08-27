"""Clerk authentication helpers.

Verifies Clerk session tokens (JWT) against the Clerk JWKS endpoint and
fetches user profiles from the Clerk Backend API using CLERK_SECRET_KEY.

The publishable key embeds the Frontend API domain, e.g.
    pk_test_<base64("fleet-sloth-79.clerk.accounts.dev$")>
so the JWKS URL is derived from it when CLERK_FRONTEND_API is not set.
"""

import base64
from typing import Optional

import httpx
from jose import jwt, jwk

from python_backend.config import settings

_jwks_cache: list | None = None


def frontend_api_domain() -> str:
    """Return the Clerk Frontend API domain, e.g. fleet-sloth-79.clerk.accounts.dev."""
    if settings.CLERK_FRONTEND_API:
        domain = settings.CLERK_FRONTEND_API.replace("https://", "").replace("http://", "").rstrip("/")
        return domain
    pk = settings.CLERK_PUBLISHABLE_KEY or ""
    # pk_test_<base64url(domain$)>  (sometimes pk_live_)
    if pk.startswith("pk_"):
        try:
            payload = pk.split("_", 2)[2]
            # base64url decode
            pad = "=" * (-len(payload) % 4)
            decoded = base64.urlsafe_b64decode(payload + pad).decode("utf-8")
            return decoded.split("$")[0].strip()
        except Exception:
            pass
    return ""


def jwks_url() -> str:
    if settings.CLERK_JWKS_URL:
        return settings.CLERK_JWKS_URL
    domain = frontend_api_domain()
    if domain:
        return f"https://{domain}/.well-known/jwks.json"
    return ""


async def _fetch_jwks() -> list:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    url = jwks_url()
    if not url:
        raise ValueError("Clerk not configured: no publishable key / frontend API / JWKS URL")
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        _jwks_cache = resp.json().get("keys", [])
        return _jwks_cache


async def verify_clerk_token(token: str) -> dict:
    """Verify a Clerk session JWT and return its claims.

    Raises ValueError on failure.
    """
    keys = await _fetch_jwks()
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    jwk_key = next((k for k in keys if k.get("kid") == kid), None)
    if not jwk_key:
        raise ValueError("Invalid Clerk token: unknown key id")
    public_key = jwk.construct(jwk_key)
    claims = jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
        options={"verify_aud": False},
    )
    if not claims.get("sub"):
        raise ValueError("Invalid Clerk token: missing subject")
    return claims


async def fetch_clerk_user(clerk_user_id: str) -> Optional[dict]:
    """Fetch a Clerk user profile via the Backend API using CLERK_SECRET_KEY."""
    if not settings.CLERK_SECRET_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"https://api.clerk.com/v1/users/{clerk_user_id}",
                headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
            )
            if resp.is_error:
                return None
            return resp.json()
    except Exception:
        return None


async def update_clerk_user_metadata(clerk_user_id: str, metadata: dict) -> bool:
    """Update a Clerk user's publicMetadata via the Backend API.

    Uses CLERK_SECRET_KEY. Returns True on success, False on failure.
    """
    if not settings.CLERK_SECRET_KEY or not clerk_user_id:
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.patch(
                f"https://api.clerk.com/v1/users/{clerk_user_id}/metadata",
                headers={
                    "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
                    "Content-Type": "application/json",
                },
                json={"public_metadata": metadata},
            )
            return resp.is_success
    except Exception:
        return False


def clerk_user_to_profile(clerk_user: dict) -> dict:
    """Extract a normalized profile from a Clerk Backend API user object."""
    emails = clerk_user.get("email_addresses") or []
    primary_email = next(
        (e.get("email_address") for e in emails if e.get("id") == clerk_user.get("primary_email_address_id")),
        emails[0].get("email_address") if emails else "",
    )
    first = clerk_user.get("first_name") or ""
    last = clerk_user.get("last_name") or ""
    joined = (f"{first} {last}").strip()
    if not joined:
        joined = primary_email.split("@")[0] if primary_email else "Clerk User"
    return {
        "clerk_id": clerk_user.get("id"),
        "email": primary_email or "",
        "full_name": joined,
        "avatar_url": clerk_user.get("image_url") or "",
    }
