"""Authentication routes: signup, login, profile, email verification, password reset."""

import uuid
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db, now_sql
from python_backend.auth import generate_token, get_current_user, log_audit
from python_backend.serializers import public_user, row
from python_backend.clerk import update_clerk_user_metadata as _update_metadata
from python_backend.schemas import (
    SignupRequest, LoginRequest, ProfileUpdateRequest,
    EmailVerifyRequest, ForgotPasswordRequest, ResetPasswordRequest,
)
from python_backend.config import settings
from python_backend.utils.email import send_email
from python_backend.utils.email_templates import password_reset_email as pwd_reset_template
from python_backend.utils.email_verification import store_verification, is_email_verified, get_verification_by_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/clerk/sync")
async def clerk_sync(req: dict, db: AsyncSession = Depends(get_db)):
    """Bridge: verify a Clerk session token, upsert the user, and return an app JWT.

    Body: {"token": "<clerk session token>", "full_name": ..., "email": ...,
           "profile_picture": ...}  — profile fields are hints from the Clerk
           client SDK used when the Backend API profile fetch is unavailable
           (e.g. CLERK_SECRET_KEY not configured).
    """
    token = (req or {}).get("token") or ""
    if not token:
        raise HTTPException(400, "Clerk token is required")

    from python_backend.auth import resolve_user_by_clerk_token, generate_token

    profile_hint = {
        "full_name": (req or {}).get("full_name") or "",
        "email": (req or {}).get("email") or "",
        "avatar_url": (req or {}).get("profile_picture") or "",
    }
    user = await resolve_user_by_clerk_token(token, db, profile_hint=profile_hint)
    if not user:
        raise HTTPException(401, "Invalid Clerk session")

    user_data = {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "phone": user.get("phone"),
        "city": user.get("city"),
        "profile_picture": user.get("profile_picture"),
        "bio": user.get("bio"),
        "skills": user.get("skills"),
        "verified": user.get("verified", 1),
        "rating": float(user.get("rating") or 0),
        "review_count": user.get("review_count", 0),
    }
    app_token = generate_token(user["id"], user["email"], user["role"])

    await log_audit(db, user["email"], "login", user_id=user["id"])
    return {"user": public_user(user_data), "token": app_token}


def _extract_domain(email: str) -> str | None:
    parts = email.split("@")
    return parts[1].lower() if len(parts) == 2 else None


def _validate_verification_data(data: dict, email: str) -> bool:
    """Server-side validation of email verification data."""
    if not data or not isinstance(data, dict):
        return False
    if data.get("email_address", "").lower() != email.lower():
        return False

    deliverability = data.get("email_deliverability")
    if not deliverability or not isinstance(deliverability, dict):
        return False
    if deliverability.get("status") not in ("deliverable", "undeliverable", "risky", "unknown"):
        return False

    quality = data.get("email_quality")
    if not quality or not isinstance(quality, dict):
        return False
    score = quality.get("score")
    if not isinstance(score, (int, float)) or score < 0 or score > 1:
        return False

    domain_info = data.get("email_domain")
    if not domain_info or not isinstance(domain_info, dict):
        return False
    if not domain_info.get("domain"):
        return False

    email_domain = _extract_domain(email)
    if not email_domain or domain_info["domain"].lower() != email_domain:
        return False

    return True


@router.post("/signup")
async def signup(req: SignupRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = getattr(request, "client", None) and request.client.host or "unknown"
    ua = request.headers.get("user-agent", "unknown")

    if not req.email or not req.password or not req.fullName or not req.role:
        await log_audit(db, req.email, "failed_signup", ip=ip, user_agent=ua)
        raise HTTPException(400, "Email, password, full name, and role are required")

    if req.role not in ("client", "freelancer"):
        await log_audit(db, req.email, "failed_signup", ip=ip, user_agent=ua)
        raise HTTPException(400, "Role must be client or freelancer")

    if len(req.password) < 6:
        await log_audit(db, req.email, "failed_signup", ip=ip, user_agent=ua)
        raise HTTPException(400, "Password must be at least 6 characters")

    existing = await db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": req.email})
    if existing.mappings().first():
        await log_audit(db, req.email, "failed_signup", ip=ip, user_agent=ua)
        raise HTTPException(409, "Email already registered")

    # Check email verification
    verified = await is_email_verified(db, req.email)
    if not verified:
        await log_audit(db, req.email, "failed_signup", ip=ip, user_agent=ua)
        raise HTTPException(400, detail="Email has not been verified. Please verify your email before signing up.")

    hashed = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    user_id = str(uuid.uuid4())

    await db.execute(
        text("""
            INSERT INTO users (id, email, password, full_name, phone, city, role)
            VALUES (:id, :email, :password, :full_name, :phone, :city, :role)
        """),
        {
            "id": user_id,
            "email": req.email,
            "password": hashed,
            "full_name": req.fullName,
            "phone": req.phone,
            "city": req.city,
            "role": req.role,
        },
    )

    # Link email verification to user
    await db.execute(
        text("UPDATE email_verifications SET user_id = :uid WHERE email = :email AND user_id IS NULL"),
        {"uid": user_id, "email": req.email},
    )

    await log_audit(db, req.email, "signup", user_id=user_id, ip=ip, user_agent=ua)

    result = await db.execute(
        text("SELECT id, email, full_name, role, phone, city, profile_picture, bio, skills, verified, rating, review_count FROM users WHERE id = :id"),
        {"id": user_id},
    )
    user = dict(result.mappings().first())
    token = generate_token(user["id"], user["email"], user["role"])

    return {"user": public_user(user), "token": token}


@router.post("/login")
async def login(req: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = getattr(request, "client", None) and request.client.host or "unknown"
    ua = request.headers.get("user-agent", "unknown")

    if not req.email or not req.password:
        await log_audit(db, req.email, "failed_login", ip=ip, user_agent=ua)
        raise HTTPException(400, "Email and password are required")

    result = await db.execute(text("SELECT * FROM users WHERE email = :email"), {"email": req.email})
    user = result.mappings().first()
    if not user:
        await log_audit(db, req.email, "failed_login", ip=ip, user_agent=ua)
        raise HTTPException(401, "Invalid email or password")

    if not bcrypt.checkpw(req.password.encode(), user["password"].encode()):
        await log_audit(db, req.email, "failed_login", user_id=user["id"], ip=ip, user_agent=ua)
        raise HTTPException(401, "Invalid email or password")

    await log_audit(db, req.email, "login", user_id=user["id"], ip=ip, user_agent=ua)

    user_data = {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "phone": user["phone"],
        "city": user["city"],
        "profile_picture": user["profile_picture"],
        "bio": user["bio"],
        "skills": user["skills"],
        "verified": user["verified"],
        "rating": float(user["rating"] or 0),
        "review_count": user["review_count"],
    }
    token = generate_token(user["id"], user["email"], user["role"])

    return {"user": public_user(user_data), "token": token}


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT id, email, full_name, role, phone, city, profile_picture, bio, skills, verified, rating, review_count FROM users WHERE id = :id"),
        {"id": user["id"]},
    )
    u = result.mappings().first()
    if not u:
        raise HTTPException(401, "User not found")
    return {"user": public_user(u)}


@router.put("/profile")
async def update_profile(req: ProfileUpdateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        text("""
            UPDATE users SET
                full_name = COALESCE(:full_name, full_name),
                phone = COALESCE(:phone, phone),
                city = COALESCE(:city, city),
                bio = COALESCE(:bio, bio),
                skills = COALESCE(:skills, skills),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """),
        {
            "full_name": req.fullName,
            "phone": req.phone,
            "city": req.city,
            "bio": req.bio,
            "skills": req.skills,
            "id": user["id"],
        },
    )
    result = await db.execute(
        text("SELECT id, email, full_name, role, phone, city, profile_picture, bio, skills, verified, rating, review_count FROM users WHERE id = :id"),
        {"id": user["id"]},
    )
    return {"user": public_user(result.mappings().first())}


@router.put("/role")
async def update_role(data: dict, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Update the user's role (freelancer/client). Syncs to Clerk metadata if available."""
    new_role = (data.get("role") or "").strip().lower()
    if new_role not in ("freelancer", "client"):
        raise HTTPException(400, "Role must be 'freelancer' or 'client'")

    await db.execute(
        text("UPDATE users SET role = :role, updated_at = CURRENT_TIMESTAMP WHERE id = :uid"),
        {"role": new_role, "uid": user["id"]},
    )

    # Sync to Clerk publicMetadata if the user has a clerk_id
    if user.get("clerk_id") and settings.CLERK_SECRET_KEY:
        try:
            await _update_metadata(user["clerk_id"], {"role": new_role})
        except Exception as exc:
            print(f"[auth] Clerk metadata sync skipped: {exc}")

    result = await db.execute(
        text("SELECT id, email, full_name, role, phone, city, profile_picture, bio, skills, verified, rating, review_count FROM users WHERE id = :id"),
        {"id": user["id"]},
    )
    return {"user": public_user(result.mappings().first())}


@router.post("/verify-email")
async def verify_email(req: EmailVerifyRequest, request: Request, db: AsyncSession = Depends(get_db)):
    if not req.email:
        raise HTTPException(400, "Email is required")
    if not req.verificationData:
        raise HTTPException(400, "Verification data is required")

    if not _validate_verification_data(req.verificationData, req.email):
        raise HTTPException(400, detail="Invalid verification data")

    record = await store_verification(db, req.email, None, req.verificationData)
    verified = await is_email_verified(db, req.email)

    return {
        "success": True,
        "verified": verified,
        "message": "Email verified successfully" if verified else "Email verification failed",
        "verification": {
            "email_address": record.get("email_address"),
            "suggested_correction": record.get("suggested_correction"),
            "status": record.get("status"),
            "status_detail": record.get("status_detail"),
            "score": record.get("score"),
            "is_disposable": bool(record.get("is_disposable")),
            "is_role": bool(record.get("is_role")),
        },
    }


@router.get("/verification-status/{email:path}")
async def get_verification_status(email: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not email:
        raise HTTPException(400, "Email is required")
    record = await get_verification_by_email(db, email)
    if not record:
        return {"success": False, "verified": False, "message": "Email has not been verified yet"}
    verified = await is_email_verified(db, email)
    return {
        "success": True,
        "verified": verified,
        "verification": record,
    }


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    if not req.email:
        raise HTTPException(400, "Email is required")

    result = await db.execute(
        text("SELECT id, email, full_name FROM users WHERE email = :email"),
        {"email": req.email},
    )
    user = result.mappings().first()

    # Always return success to prevent email enumeration
    if not user:
        return {"success": True, "message": "If the email exists, a reset link has been sent."}

    token = str(uuid.uuid4()) + "-" + str(uuid.uuid4())
    from datetime import datetime, timedelta, timezone
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    await db.execute(
        text("INSERT INTO password_resets (id, email, token, expires_at) VALUES (:id, :email, :token, :expires)"),
        {"id": str(uuid.uuid4()), "email": req.email, "token": token, "expires": expires_at},
    )

    client_url = settings.CLIENT_URL
    reset_link = f"{client_url}/reset-password?token={token}&email={req.email}"
    html = pwd_reset_template(user["full_name"], reset_link)

    email_result = await send_email(to=req.email, subject="🔐 Reset your Erq Marketplace password", html=html)

    # In-app notification
    await db.execute(
        text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
        {"id": str(uuid.uuid4()), "uid": user["id"], "title": "🔐 Password Reset Requested", "msg": "A password reset link has been sent to your email.", "type": "info"},
    )

    return {
        "success": True,
        "message": "Password reset link sent to your email.",
    }


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    if not req.token or not req.email or not req.newPassword:
        raise HTTPException(400, "Token, email, and new password are required")
    if len(req.newPassword) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    result = await db.execute(
        text("SELECT * FROM password_resets WHERE token = :token AND email = :email AND used = 0 AND expires_at > " + now_sql()),
        {"token": req.token, "email": req.email},
    )
    reset = result.mappings().first()
    if not reset:
        raise HTTPException(400, "Invalid or expired reset token")

    user_result = await db.execute(text("SELECT * FROM users WHERE email = :email"), {"email": req.email})
    user = user_result.mappings().first()
    if not user:
        raise HTTPException(404, "User not found")

    hashed = bcrypt.hashpw(req.newPassword.encode(), bcrypt.gensalt()).decode()
    await db.execute(text("UPDATE users SET password = :pwd, updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"pwd": hashed, "id": user["id"]})
    await db.execute(text("UPDATE password_resets SET used = 1 WHERE id = :id"), {"id": reset["id"]})

    await db.execute(
        text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
        {"id": str(uuid.uuid4()), "uid": user["id"], "title": "🔐 Password Changed", "msg": "Your password has been successfully reset.", "type": "info"},
    )

    return {"success": True, "message": "Password has been reset successfully. You can now login with your new password."}
