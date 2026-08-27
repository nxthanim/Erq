"""Payment routes: Chapa gateway, biometric verification, receipt verification, escrow."""

import uuid
import json
import hmac
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db, now_sql, interval_sql
from python_backend.auth import get_current_user
from python_backend.config import settings
from python_backend.utils.email import send_email
from python_backend.utils.email_templates import notification_email as notif_template
from python_backend.schemas import (
    ReceiptVerifyRequest, BiometricConfirmRequest,
    ChapaInitiateRequest, ChapaVerifyRequest,
)

router = APIRouter(prefix="/api/payments", tags=["payments"])

ADMIN_EMAIL = settings.ADMIN_EMAIL


async def _log_payment_audit(db, user_id, transaction_id, action, ip, ua, details=None):
    try:
        await db.execute(
            text("INSERT INTO payment_audit (id, user_id, transaction_id, action, ip_address, user_agent, details) VALUES (:id, :uid, :tid, :act, :ip, :ua, :det)"),
            {"id": str(uuid.uuid4()), "uid": user_id, "tid": transaction_id, "act": action, "ip": ip or "unknown", "ua": ua or "unknown", "det": json.dumps(details or {})},
        )
    except Exception as e:
        print(f"Payment audit error: {e}")


async def _analyze_receipt_risk(db, amount, reference, item_type, user_id, item_id):
    risk_factors = []
    risk_score = 0

    if not reference or len(reference) < 4:
        risk_factors.append("Missing or too short receipt reference")
        risk_score += 25
    if reference and len(reference) > 100:
        risk_factors.append("Unusually long receipt reference")
        risk_score += 15
    if reference and any(c in reference for c in "<>{}|\\^~`"):
        risk_factors.append("Suspicious characters in reference")
        risk_score += 20
    if amount <= 0:
        risk_factors.append("Invalid amount (zero or negative)")
        risk_score += 30
    if amount > 1000000:
        risk_factors.append("Unusually high amount (> ETB 1,000,000)")
        risk_score += 20

    recent = await db.execute(
        text("SELECT COUNT(*) as count FROM payment_receipts WHERE user_id = :uid AND created_at > " + interval_sql(3600)),
        {"uid": user_id},
    )
    recent_count = recent.mappings().first()["count"]
    if recent_count > 3:
        risk_factors.append(f"Suspicious activity: {recent_count} receipts submitted in the last hour")
        risk_score += 25

    if reference and len(reference) <= 8 and reference.isdigit():
        risk_factors.append("Reference is simple numeric sequence (possible fake)")
        risk_score += 10

    dupe = await db.execute(
        text("SELECT COUNT(*) as count FROM payment_receipts WHERE receipt_reference = :ref AND user_id != :uid"),
        {"ref": reference, "uid": user_id},
    )
    dupe_count = dupe.mappings().first()["count"]
    if dupe_count > 0:
        risk_factors.append(f"Receipt reference already used by {dupe_count} other user(s)")
        risk_score += 30

    status = "suspicious" if risk_score >= 30 else "verified"
    return {"risk_score": min(risk_score, 100), "risk_factors": risk_factors, "status": status}


@router.post("/verify-receipt")
async def verify_receipt(req: ReceiptVerifyRequest, request: Request, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not req.itemType or not req.itemId or not req.amount or not req.receiptPhoto or not req.receiptReference:
        raise HTTPException(400, "All fields required")
    if req.itemType not in ("gig", "job"):
        raise HTTPException(400, "Invalid item type")

    risk = await _analyze_receipt_risk(db, req.amount, req.receiptReference, req.itemType, user["id"], req.itemId)

    receipt_id = str(uuid.uuid4())
    await db.execute(
        text("""INSERT INTO payment_receipts (id, user_id, item_type, item_id, amount, receipt_photo, receipt_reference, status, risk_score, risk_factors)
                VALUES (:id, :uid, :itype, :iid, :amt, :photo, :ref, :stat, :rscore, :rfactors)"""),
        {
            "id": receipt_id, "uid": user["id"], "itype": req.itemType, "iid": req.itemId,
            "amt": req.amount, "photo": "base64", "ref": req.receiptReference,
            "stat": risk["status"], "rscore": risk["risk_score"],
            "rfactors": json.dumps(risk["risk_factors"]),
        },
    )

    if risk["status"] == "suspicious":
        await send_email(
            to=ADMIN_EMAIL,
            subject=f"🔴 SUSPICIOUS: Payment Receipt — ETB {req.amount:,.0f} — {user.get('full_name', 'Unknown')}",
            html=notif_template(
                title=f"🚨 Suspicious Payment Receipt - Risk Score: {risk['risk_score']}/100",
                message=f"<strong>User:</strong> {user.get('full_name', 'Unknown')}<br>"
                        f"<strong>Amount:</strong> ETB {req.amount:,.0f}<br>"
                        f"<strong>Reference:</strong> {req.receiptReference}<br>"
                        f"<strong>Risk Factors:</strong><br>{'<br>'.join(f'• {f}' for f in risk['risk_factors'])}",
            ),
        )

    return {
        "success": True,
        "receiptId": receipt_id,
        "status": risk["status"],
        "riskScore": risk["risk_score"],
        "riskFactors": risk["risk_factors"],
        "message": "Payment receipt verified" if risk["status"] == "verified" else "Payment receipt flagged for review",
    }


@router.post("/confirm-biometric")
async def confirm_biometric(req: BiometricConfirmRequest, request: Request, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")

    if not req.transactionId or not req.selfieData:
        raise HTTPException(400, "Transaction ID and selfie proof are required")

    # Check rate limit
    attempts = await db.execute(
        text("SELECT COUNT(*) as count FROM payment_audit WHERE user_id = :uid AND action = 'biometric_attempt' AND created_at > " + interval_sql(3600)),
        {"uid": user["id"]},
    )
    attempt_count = attempts.mappings().first()["count"]
    if attempt_count >= 3:
        await _log_payment_audit(db, user["id"], req.transactionId, "biometric_attempt", ip, ua, {"blocked": True})
        raise HTTPException(429, f"Too many biometric attempts ({attempt_count} in the last hour)")

    await _log_payment_audit(db, user["id"], req.transactionId, "biometric_attempt", ip, ua, {"attempt": attempt_count + 1})

    txn_result = await db.execute(
        text("SELECT * FROM transactions WHERE id = :tid AND freelancer_id = :fid AND status = 'escrow'"),
        {"tid": req.transactionId, "fid": user["id"]},
    )
    txn = txn_result.mappings().first()
    if not txn:
        raise HTTPException(404, "Transaction not found or not in escrow")

    await db.execute(
        text("UPDATE transactions SET status = 'confirmed', confirmation_selfie = :selfie, confirmed_at = " + now_sql() + ", updated_at = CURRENT_TIMESTAMP WHERE id = :tid"),
        {"selfie": "base64_selfie", "tid": req.transactionId},
    )

    await _log_payment_audit(db, user["id"], req.transactionId, "biometric_success", ip, ua, {"amount": float(txn["amount"])})

    # Notify client
    await db.execute(
        text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
        {"id": str(uuid.uuid4()), "uid": txn["client_id"],
         "title": "Payment Confirmed ✓",
         "msg": f"{user['full_name']} confirmed receipt of ETB {float(txn['amount']):,.0f} via biometric verification.",
         "type": "payment"},
    )

    return {"success": True, "message": "Payment confirmed via biometric verification.", "confirmedAt": datetime.now(timezone.utc).isoformat()}


@router.post("/chapa/initiate")
async def chapa_initiate(req: ChapaInitiateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not req.amount or req.amount <= 0:
        raise HTTPException(400, "Valid amount is required")
    if not req.email:
        raise HTTPException(400, "Email is required")
    if not settings.CHAPA_PUBLIC_KEY:
        raise HTTPException(400, "Chapa payments are not configured (CHAPA_PUBLIC_KEY missing)")

    tx_ref = f"ERQ-{str(uuid.uuid4())[:8].upper()}-{int(datetime.now().timestamp())}"
    order_id = None
    is_gig_order = bool(req.gig_id)
    metadata = {}

    if is_gig_order:
        gig_result = await db.execute(
            text("SELECT g.*, u.full_name as freelancer_name FROM gigs g JOIN users u ON g.freelancer_id = u.id WHERE g.id = :gid AND g.active = 1"),
            {"gid": req.gig_id},
        )
        gig = gig_result.mappings().first()
        if not gig:
            raise HTTPException(404, "Gig not found")
        if gig["freelancer_id"] == user["id"]:
            raise HTTPException(400, "Cannot order your own gig")

        order_id = str(uuid.uuid4())
        await db.execute(
            text("""INSERT INTO orders (id, gig_id, client_id, freelancer_id, title, description, price, requirements, status)
                    VALUES (:id, :gid, :cid, :fid, :title, :desc, :price, :req, 'pending_payment')"""),
            {"id": order_id, "gid": req.gig_id, "cid": user["id"], "fid": gig["freelancer_id"],
             "title": gig["title"], "desc": gig["description"], "price": req.amount, "req": req.requirements or ""},
        )

    # job_id references jobs(id) — gig orders and wallet top-ups have no job row,
    # so NULL keeps the FK valid on PostgreSQL (gig orders link via order_id).
    await db.execute(
        text("""INSERT INTO transactions (id, job_id, client_id, freelancer_id, amount, status, telebirr_reference, order_id)
                VALUES (:id, :jid, :cid, :fid, :amt, 'pending_payment', :ref, :oid)"""),
        {"id": txn_id, "jid": None, "cid": user["id"],
         "fid": "system", "amt": req.amount, "ref": tx_ref, "oid": order_id},
    )
    if order_id:
        await db.execute(text("UPDATE orders SET transaction_id = :tid, updated_at = " + now_sql() + " WHERE id = :oid"), {"tid": txn_id, "oid": order_id})

    return {
        "success": True,
        "tx_ref": tx_ref,
        "order_id": order_id,
        "is_gig_order": is_gig_order,
        "amount": str(req.amount),
        "currency": req.currency or "ETB",
        "email": req.email,
        "public_key": settings.CHAPA_PUBLIC_KEY or "",
        "merchant_id": settings.CHAPA_MERCHANT_ID,
    }


@router.post("/chapa/verify")
async def chapa_verify(req: ChapaVerifyRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not req.tx_ref:
        raise HTTPException(400, "Transaction reference is required")

    txn_result = await db.execute(
        text("SELECT * FROM transactions WHERE telebirr_reference = :ref AND client_id = :uid"),
        {"ref": req.tx_ref, "uid": user["id"]},
    )
    txn = txn_result.mappings().first()

    if not txn:
        txn_result = await db.execute(text("SELECT * FROM transactions WHERE telebirr_reference = :ref"), {"ref": req.tx_ref})
        txn = txn_result.mappings().first()
        if not txn:
            raise HTTPException(404, "Transaction not found")
        if txn["status"] in ("confirmed", "released"):
            return {"verified": True, "status": txn["status"], "message": "Payment already verified"}

    # Mark as confirmed
    await db.execute(text("UPDATE transactions SET status = 'confirmed', updated_at = " + now_sql() + " WHERE id = :id"), {"id": txn["id"]})

    if txn.get("order_id"):
        await db.execute(text("UPDATE orders SET status = 'pending', updated_at = " + now_sql() + " WHERE id = :oid AND status = 'pending_payment'"), {"oid": txn["order_id"]})
        await db.execute(text("UPDATE transactions SET status = 'escrow', updated_at = " + now_sql() + " WHERE id = :id"), {"id": txn["id"]})

        order_result = await db.execute(text("SELECT * FROM orders WHERE id = :oid"), {"oid": txn["order_id"]})
        order = order_result.mappings().first()
        if order:
            await db.execute(
                text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
                {"id": str(uuid.uuid4()), "uid": order["freelancer_id"],
                 "title": "New Order — Payment Confirmed!",
                 "msg": f"{user['full_name']} paid ETB {float(order['price']):,.0f} for \"{order['title']}\".",
                 "type": "order"},
            )

    return {
        "verified": True,
        "status": "confirmed",
        "transaction_ref": req.tx_ref,
        "order_id": txn.get("order_id"),
        "message": "Payment verified successfully",
    }


@router.post("/initiate")
async def initiate_payment(data: dict, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Initiate TeleBirr payment for escrow."""
    job_id = data.get("jobId")
    if not job_id:
        raise HTTPException(400, "jobId is required")

    txn_result = await db.execute(
        text("""SELECT t.*, j.title as job_title, j.client_id
                FROM transactions t
                JOIN jobs j ON t.job_id = j.id
                WHERE t.job_id = :jid AND t.status = 'escrow' AND t.client_id = :cid"""),
        {"jid": job_id, "cid": user["id"]},
    )
    txn = txn_result.mappings().first()
    if not txn:
        raise HTTPException(404, "Transaction not found")

    telebirr_ref = f"TEBIRR-{str(uuid.uuid4())[:8].upper()}"
    await db.execute(
        text("UPDATE transactions SET telebirr_reference = :ref, updated_at = CURRENT_TIMESTAMP WHERE id = :id"),
        {"ref": telebirr_ref, "id": txn["id"]},
    )

    return {
        "success": True,
        "message": "Payment initiated. Please complete payment via TeleBirr.",
        "telebirrRef": telebirr_ref,
        "amount": float(txn["amount"]),
        "jobTitle": txn["job_title"],
    }


@router.post("/confirm")
async def confirm_payment(data: dict, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Confirm TeleBirr payment."""
    transaction_id = data.get("transactionId")
    telebirr_ref = data.get("telebirrRef")

    txn_result = await db.execute(
        text("SELECT * FROM transactions WHERE id = :id AND client_id = :cid"),
        {"id": transaction_id, "cid": user["id"]},
    )
    txn = txn_result.mappings().first()
    if not txn:
        raise HTTPException(404, "Transaction not found")

    await db.execute(
        text("UPDATE transactions SET status = 'escrow', telebirr_reference = COALESCE(:ref, telebirr_reference), updated_at = CURRENT_TIMESTAMP WHERE id = :id"),
        {"ref": telebirr_ref, "id": transaction_id},
    )

    # Notify freelancer
    await db.execute(
        text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
        {"id": str(uuid.uuid4()), "uid": txn["freelancer_id"],
         "title": "Payment Confirmed",
         "msg": f"Payment of ETB {float(txn['amount']):,.0f} has been placed in escrow.",
         "type": "payment"},
    )

    return {"success": True, "message": "Payment confirmed and held in escrow"}


@router.post("/release")
async def release_payment(data: dict, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Release payment from escrow to freelancer."""
    job_id = data.get("jobId")
    if not job_id:
        raise HTTPException(400, "jobId is required")

    txn_result = await db.execute(
        text("""SELECT t.* FROM transactions t
                JOIN jobs j ON t.job_id = j.id
                WHERE t.job_id = :jid AND t.status = 'escrow' AND j.client_id = :cid"""),
        {"jid": job_id, "cid": user["id"]},
    )
    txn = txn_result.mappings().first()
    if not txn:
        raise HTTPException(404, "Escrow transaction not found")

    await db.execute(text("UPDATE transactions SET status = 'released', updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": txn["id"]})
    await db.execute(text("UPDATE jobs SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": job_id})

    # Notify freelancer
    await db.execute(
        text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
        {"id": str(uuid.uuid4()), "uid": txn["freelancer_id"],
         "title": "Payment Released",
         "msg": f"ETB {float(txn['amount']):,.0f} has been released to your account.",
         "type": "payment"},
    )

    return {"success": True, "message": "Payment released to freelancer"}


@router.post("/dispute")
async def dispute_payment(data: dict, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Create a payment dispute."""
    job_id = data.get("jobId")
    reason = data.get("reason", "Not specified")

    txn_result = await db.execute(
        text("""SELECT t.* FROM transactions t
                JOIN jobs j ON t.job_id = j.id
                WHERE t.job_id = :jid AND (j.client_id = :cid OR j.awarded_to = :fid) AND t.status = 'escrow'"""),
        {"jid": job_id, "cid": user["id"], "fid": user["id"]},
    )
    txn = txn_result.mappings().first()
    if not txn:
        raise HTTPException(404, "Active transaction not found")

    await db.execute(text("UPDATE transactions SET status = 'disputed', updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": txn["id"]})

    # Notify admins
    admins = await db.execute(text("SELECT id FROM users WHERE role = 'admin'"))
    job_result = await db.execute(text("SELECT title FROM jobs WHERE id = :id"), {"id": job_id})
    job = job_result.mappings().first()
    for admin in admins.mappings().all():
        await db.execute(
            text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
            {"id": str(uuid.uuid4()), "uid": admin["id"],
             "title": "New Dispute",
             "msg": f"Dispute opened for job \"{job['title'] if job else ''}\". Reason: {reason}",
             "type": "dispute"},
        )

    return {"success": True, "message": "Dispute created. Admin will review."}


@router.get("/transactions")
async def get_transactions(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""SELECT t.*, COALESCE(j.title, 'Wallet Top-up') as job_title
                FROM transactions t
                LEFT JOIN jobs j ON t.job_id = j.id
                WHERE t.client_id = :uid OR t.freelancer_id = :uid2
                ORDER BY t.created_at DESC"""),
        {"uid": user["id"], "uid2": user["id"]},
    )
    return {"transactions": [dict(r) for r in result.mappings().all()]}
