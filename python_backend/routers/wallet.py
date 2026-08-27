"""Wallet routes: overview, transactions, PIN attempt tracking."""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db, interval_sql
from python_backend.auth import get_current_user
from python_backend.schemas import PinAttemptRequest

router = APIRouter(prefix="/api/wallet", tags=["wallet"])


@router.get("/overview")
async def wallet_overview(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Calculate balance from transactions
    released = await db.execute(
        text("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE (freelancer_id = :uid OR client_id = :uid2) AND status IN ('released', 'confirmed')"),
        {"uid": user["id"], "uid2": user["id"]},
    )
    escrow = await db.execute(
        text("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE freelancer_id = :uid AND status = 'escrow'"),
        {"uid": user["id"]},
    )
    pending = await db.execute(
        text("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE client_id = :uid AND status = 'escrow'"),
        {"uid": user["id"]},
    )

    r = released.mappings().first()
    e = escrow.mappings().first()
    p = pending.mappings().first()

    return {
        "balance": float(r["total"]) if r else 0,
        "in_escrow": float(e["total"]) if e else 0,
        "pending_payment": float(p["total"]) if p else 0,
        "currency": "ETB",
    }


@router.get("/transactions")
async def wallet_transactions(limit: int = 50, offset: int = 0, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""SELECT t.*, COALESCE(j.title, 'Wallet') as job_title
                FROM transactions t
                LEFT JOIN jobs j ON t.job_id = j.id
                WHERE t.client_id = :uid OR t.freelancer_id = :uid2
                ORDER BY t.created_at DESC
                LIMIT :lim OFFSET :off"""),
        {"uid": user["id"], "uid2": user["id"], "lim": limit, "off": offset},
    )
    return {"transactions": [dict(r) for r in result.mappings().all()]}


@router.post("/pin-attempt")
async def record_pin_attempt(req: PinAttemptRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        text("INSERT INTO wallet_pin_attempts (id, user_id, successful) VALUES (:id, :uid, :success)"),
        {"id": str(uuid.uuid4()), "uid": user["id"], "success": 1 if req.type == "success" else 0},
    )
    return {"success": True}


@router.get("/pin-status")
async def pin_status(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    attempts = await db.execute(
        text("SELECT COUNT(*) as count FROM wallet_pin_attempts WHERE user_id = :uid AND created_at > " + interval_sql(3600) + " AND successful = 0"),
        {"uid": user["id"]},
    )
    count = attempts.mappings().first()["count"]
    return {
        "locked": count >= 5,
        "remaining_attempts": max(0, 5 - count),
        "reset_in_minutes": 60,
    }
