"""Email verification utilities for pre-signup email validation."""

import uuid
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def store_verification(db: AsyncSession, email: str, user_id: str | None, verification_data: dict) -> dict:
    """Store email verification result in database."""
    d = verification_data or {}
    deliverability = d.get("email_deliverability", {})
    quality = d.get("email_quality", {})
    domain_info = d.get("email_domain", {})
    sender = d.get("email_sender", {})
    risk = d.get("email_risk", {})
    breaches = d.get("email_breaches", {})

    vid = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO email_verifications (
                id, user_id, email, email_address, suggested_correction,
                status, status_detail, is_format_valid, is_smtp_valid, is_mx_valid, mx_records,
                email_provider_name, organization_name, organization_type,
                domain, domain_age, is_live_site, registrar,
                date_registered, date_last_renewed, date_expires,
                score, is_free_email, is_disposable, is_catchall, is_role,
                is_dmarc_enforced, is_spf_strict,
                address_risk_status, domain_risk_status,
                total_breaches, date_first_breached, date_last_breached
            ) VALUES (
                :id, :user_id, :email, :email_address, :suggested_correction,
                :status, :status_detail, :is_format_valid, :is_smtp_valid, :is_mx_valid, :mx_records,
                :email_provider_name, :organization_name, :organization_type,
                :domain, :domain_age, :is_live_site, :registrar,
                :date_registered, :date_last_renewed, :date_expires,
                :score, :is_free_email, :is_disposable, :is_catchall, :is_role,
                :is_dmarc_enforced, :is_spf_strict,
                :address_risk_status, :domain_risk_status,
                :total_breaches, :date_first_breached, :date_last_breached
            )
        """),
        {
            "id": vid,
            "user_id": user_id,
            "email": email,
            "email_address": d.get("email_address", email),
            "suggested_correction": d.get("suggested_correction"),
            "status": deliverability.get("status", "pending"),
            "status_detail": deliverability.get("status_detail", "pending_verification"),
            "is_format_valid": 1 if deliverability.get("is_format_valid") else 0,
            "is_smtp_valid": 1 if deliverability.get("is_smtp_valid") else 0,
            "is_mx_valid": 1 if deliverability.get("is_mx_valid") else 0,
            "mx_records": str(deliverability.get("mx_records", [])),
            "email_provider_name": sender.get("email_provider_name"),
            "organization_name": sender.get("organization_name"),
            "organization_type": sender.get("organization_type"),
            "domain": domain_info.get("domain", ""),
            "domain_age": domain_info.get("domain_age", 0),
            "is_live_site": 1 if domain_info.get("is_live_site") else 0,
            "registrar": domain_info.get("registrar", ""),
            "date_registered": domain_info.get("date_registered", ""),
            "date_last_renewed": domain_info.get("date_last_renewed", ""),
            "date_expires": domain_info.get("date_expires", ""),
            "score": quality.get("score", 0),
            "is_free_email": 1 if quality.get("is_free_email") else 0,
            "is_disposable": 1 if quality.get("is_disposable") else 0,
            "is_catchall": 1 if quality.get("is_catchall") else 0,
            "is_role": 1 if quality.get("is_role") else 0,
            "is_dmarc_enforced": 1 if quality.get("is_dmarc_enforced") else 0,
            "is_spf_strict": 1 if quality.get("is_spf_strict") else 0,
            "address_risk_status": risk.get("address_risk_status", "unknown"),
            "domain_risk_status": risk.get("domain_risk_status", "unknown"),
            "total_breaches": breaches.get("total_breaches", 0),
            "date_first_breached": breaches.get("date_first_breached"),
            "date_last_breached": breaches.get("date_last_breached"),
        },
    )

    result = await db.execute(
        text("SELECT * FROM email_verifications WHERE id = :id"),
        {"id": vid},
    )
    row = result.mappings().first()
    return dict(row) if row else {}


async def get_verification_by_email(db: AsyncSession, email: str) -> dict | None:
    """Get the latest verification for an email."""
    result = await db.execute(
        text("""
            SELECT * FROM email_verifications
            WHERE email = :email
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {"email": email},
    )
    row = result.mappings().first()
    return dict(row) if row else None


async def is_email_verified(db: AsyncSession, email: str) -> bool:
    """Check if an email is verified (deliverable with good score)."""
    record = await get_verification_by_email(db, email)
    if not record:
        return False
    return (
        record["status"] == "deliverable"
        and record["score"] >= 0.7
        and record["is_format_valid"] == 1
        and record["is_disposable"] == 0
    )
