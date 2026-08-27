"""Job routes: CRUD, bids, award, deliver, quick order, status updates."""

import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db, ilike_sql
from python_backend.auth import get_current_user
from python_backend.cache import cache_ttl
from python_backend.schemas import (
    JobCreateRequest, BidRequest, AwardRequest, QuickOrderRequest,
    DeliverRequest, JobStatusUpdate,
)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("")
@cache_ttl(seconds=20)
async def list_jobs(
    category: str = None,
    search: str = None,
    minBudget: float = None,
    maxBudget: float = None,
    sort: str = None,
    status: str = None,
    clientId: str = None,
    freelancerId: str = None,
    db: AsyncSession = Depends(get_db),
):
    query = """
        SELECT j.*, u.full_name as client_name, u.profile_picture as client_picture,
               u.rating as client_rating
        FROM jobs j
        JOIN users u ON j.client_id = u.id
        WHERE 1=1
    """
    params = {}

    if category:
        query += " AND j.category = :cat"
        params["cat"] = category
    if search:
        query += f" AND (j.title {ilike_sql()} :search OR j.description {ilike_sql()} :search2)"
        params["search"] = f"%{search}%"
        params["search2"] = f"%{search}%"
    if minBudget is not None:
        query += " AND j.budget_max >= :min_b"
        params["min_b"] = minBudget
    if maxBudget is not None:
        query += " AND j.budget_min <= :max_b"
        params["max_b"] = maxBudget
    if status:
        query += " AND j.status = :stat"
        params["stat"] = status
    if clientId:
        query += " AND j.client_id = :cid"
        params["cid"] = clientId
    if freelancerId:
        query += " AND j.awarded_to = :fid"
        params["fid"] = freelancerId

    sort_map = {"budget_high": "j.budget_max DESC", "budget_low": "j.budget_min ASC", "newest": "j.created_at DESC"}
    query += f" ORDER BY {sort_map.get(sort, 'j.created_at DESC')}"

    result = await db.execute(text(query), params)
    jobs = result.mappings().all()

    jobs_with_meta = []
    for j in jobs:
        bid_count_result = await db.execute(
            text("SELECT COUNT(*) as count FROM bids WHERE job_id = :jid"), {"jid": j["id"]}
        )
        bid_count = bid_count_result.mappings().first()["count"]
        jobs_with_meta.append({**dict(j), "bid_count": bid_count})

    return {"jobs": jobs_with_meta}


@router.get("/{job_id}")
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT j.*,
                u.full_name as client_name, u.profile_picture as client_picture,
                u.rating as client_rating, u.phone as client_phone, u.city as client_city,
                af.full_name as awarded_name, af.profile_picture as awarded_picture,
                af.rating as awarded_rating, af.verified as awarded_verified, af.city as awarded_city
            FROM jobs j
            JOIN users u ON j.client_id = u.id
            LEFT JOIN users af ON j.awarded_to = af.id
            WHERE j.id = :id
        """),
        {"id": job_id},
    )
    job = result.mappings().first()
    if not job:
        raise HTTPException(404, "Job not found")

    bids_result = await db.execute(
        text("""
            SELECT b.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
                   u.rating as freelancer_rating, u.verified as freelancer_verified, u.city as freelancer_city
            FROM bids b JOIN users u ON b.freelancer_id = u.id WHERE b.job_id = :jid ORDER BY b.amount ASC
        """),
        {"jid": job_id},
    )
    txn_result = await db.execute(
        text("""
            SELECT t.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
                   u.rating as freelancer_rating
            FROM transactions t
            LEFT JOIN users u ON t.freelancer_id = u.id
            WHERE t.job_id = :jid
            ORDER BY t.created_at DESC
        """),
        {"jid": job_id},
    )
    deliveries_result = await db.execute(
        text("SELECT * FROM job_deliveries WHERE job_id = :jid ORDER BY created_at DESC"),
        {"jid": job_id},
    )

    return {
        "job": dict(job),
        "bids": [dict(b) for b in bids_result.mappings().all()],
        "transactions": [dict(t) for t in txn_result.mappings().all()],
        "deliveries": [dict(d) for d in deliveries_result.mappings().all()],
    }


@router.post("")
async def create_job(req: JobCreateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user["role"] != "client":
        raise HTTPException(403, "Only clients can create jobs")
    if not req.title or not req.description or not req.budgetMin or not req.budgetMax or not req.category:
        raise HTTPException(400, "Title, description, budget range, and category are required")

    job_id = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO jobs (id, client_id, title, description, budget_min, budget_max, category, deadline)
            VALUES (:id, :cid, :title, :desc, :bmin, :bmax, :cat, :deadline)
        """),
        {
            "id": job_id, "cid": user["id"], "title": req.title, "desc": req.description,
            "bmin": req.budgetMin, "bmax": req.budgetMax, "cat": req.category,
            "deadline": req.deadline,
        },
    )
    result = await db.execute(text("SELECT * FROM jobs WHERE id = :id"), {"id": job_id})
    return {"job": dict(result.mappings().first())}


@router.post("/{job_id}/bid")
async def place_bid(job_id: str, req: BidRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user["role"] != "freelancer":
        raise HTTPException(403, "Only freelancers can bid")

    job_result = await db.execute(
        text("SELECT * FROM jobs WHERE id = :id AND status = 'open'"),
        {"id": job_id},
    )
    job = job_result.mappings().first()
    if not job:
        raise HTTPException(404, "Job not found or not accepting bids")

    if not req.amount:
        raise HTTPException(400, "Bid amount is required")

    existing = await db.execute(
        text("SELECT id FROM bids WHERE job_id = :jid AND freelancer_id = :fid"),
        {"jid": job_id, "fid": user["id"]},
    )
    if existing.mappings().first():
        raise HTTPException(409, "You already placed a bid on this job")

    bid_id = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO bids (id, job_id, freelancer_id, amount, proposal) VALUES (:id, :jid, :fid, :amt, :prop)"),
        {"id": bid_id, "jid": job_id, "fid": user["id"], "amt": req.amount, "prop": req.proposal},
    )

    # Notify client
    await db.execute(
        text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
        {
            "id": str(uuid.uuid4()), "uid": job["client_id"],
            "title": "New Bid Received",
            "msg": f"{user['full_name']} placed a bid of ETB {req.amount} on your job \"{job['title']}\"",
            "type": "bid",
        },
    )

    bid_result = await db.execute(text("SELECT * FROM bids WHERE id = :id"), {"id": bid_id})
    return {"bid": dict(bid_result.mappings().first())}


@router.put("/{job_id}/award")
async def award_job(job_id: str, req: AwardRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user["role"] != "client":
        raise HTTPException(403, "Only clients can award jobs")

    job_result = await db.execute(
        text("SELECT * FROM jobs WHERE id = :id AND client_id = :cid AND status = 'open'"),
        {"id": job_id, "cid": user["id"]},
    )
    job = job_result.mappings().first()
    if not job:
        raise HTTPException(404, "Job not found or not open")

    bid_result = await db.execute(
        text("SELECT * FROM bids WHERE job_id = :jid AND freelancer_id = :fid AND status = 'pending'"),
        {"jid": job_id, "fid": req.freelancerId},
    )
    bid = bid_result.mappings().first()
    if not bid:
        raise HTTPException(404, "Bid not found")

    await db.execute(text("UPDATE jobs SET status = 'in_progress', awarded_to = :fid, updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"fid": req.freelancerId, "id": job_id})
    await db.execute(text("UPDATE bids SET status = 'accepted' WHERE job_id = :jid AND freelancer_id = :fid"), {"jid": job_id, "fid": req.freelancerId})
    await db.execute(text("UPDATE bids SET status = 'rejected' WHERE job_id = :jid AND freelancer_id != :fid AND status = 'pending'"), {"jid": job_id, "fid": req.freelancerId})

    txn_id = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO transactions (id, job_id, client_id, freelancer_id, amount, status) VALUES (:id, :jid, :cid, :fid, :amt, 'escrow')"),
        {"id": txn_id, "jid": job_id, "cid": user["id"], "fid": req.freelancerId, "amt": bid["amount"]},
    )

    await db.execute(
        text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
        {
            "id": str(uuid.uuid4()), "uid": req.freelancerId,
            "title": "Job Awarded!",
            "msg": f"You have been awarded the job \"{job['title']}\"!",
            "type": "award",
        },
    )

    return {"message": "Job awarded successfully", "transactionId": txn_id}


@router.put("/{job_id}/deliver")
async def deliver_job(job_id: str, req: DeliverRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    job_result = await db.execute(
        text("SELECT * FROM jobs WHERE id = :id AND status = 'in_progress'"),
        {"id": job_id},
    )
    job = job_result.mappings().first()
    if not job:
        raise HTTPException(404, "Job not found or not in progress")
    if job["awarded_to"] != user["id"]:
        raise HTTPException(403, "Only the awarded freelancer can deliver")

    if req.files and len(req.files) > 0:
        if len(req.files) > 10:
            raise HTTPException(400, "Maximum 10 files per delivery")
        delivery_id = str(uuid.uuid4())
        await db.execute(
            text("INSERT INTO job_deliveries (id, job_id, freelancer_id, message, files) VALUES (:id, :jid, :fid, :msg, :files)"),
            {"id": delivery_id, "jid": job_id, "fid": user["id"], "msg": req.message or "", "files": json.dumps(req.files)},
        )

    await db.execute(text("UPDATE jobs SET status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": job_id})

    await db.execute(
        text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
        {
            "id": str(uuid.uuid4()), "uid": job["client_id"],
            "title": "Work Delivered!",
            "msg": f"{user['full_name'] or 'The freelancer'} has delivered the finished work for \"{job['title']}\".",
            "type": "order",
        },
    )

    return {"message": "Work delivered successfully"}


@router.put("/{job_id}/status")
async def update_job_status(job_id: str, req: JobStatusUpdate, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    job_result = await db.execute(text("SELECT * FROM jobs WHERE id = :id"), {"id": job_id})
    job = job_result.mappings().first()
    if not job:
        raise HTTPException(404, "Job not found")

    if req.status == "completed" and job["client_id"] != user["id"]:
        raise HTTPException(403, "Only the client can mark as completed")

    await db.execute(text("UPDATE jobs SET status = :s, updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"s": req.status, "id": job_id})
    return {"message": "Job status updated"}


@router.delete("/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    job_result = await db.execute(
        text("SELECT * FROM jobs WHERE id = :id AND client_id = :cid"),
        {"id": job_id, "cid": user["id"]},
    )
    if not job_result.mappings().first():
        raise HTTPException(404, "Job not found or unauthorized")
    await db.execute(text("UPDATE jobs SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": job_id})
    return {"message": "Job cancelled successfully"}


@router.post("/{job_id}/quick-order")
async def quick_order(job_id: str, req: QuickOrderRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    job_result = await db.execute(
        text("SELECT * FROM jobs WHERE id = :id AND status = 'open'"),
        {"id": job_id},
    )
    job = job_result.mappings().first()
    if not job:
        raise HTTPException(404, "Job not found or not open for orders")
    if not req.amount or req.amount <= 0:
        raise HTTPException(400, "A valid amount is required")

    await db.execute(
        text("UPDATE jobs SET status = 'in_progress', awarded_to = :fid, updated_at = CURRENT_TIMESTAMP WHERE id = :id"),
        {"fid": user["id"], "id": job_id},
    )

    txn_id = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO transactions (id, job_id, client_id, freelancer_id, amount, status) VALUES (:id, :jid, :cid, :fid, :amt, 'escrow')"),
        {"id": txn_id, "jid": job_id, "cid": job["client_id"], "fid": user["id"], "amt": req.amount},
    )

    await db.execute(
        text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
        {
            "id": str(uuid.uuid4()), "uid": job["client_id"],
            "title": "New Order on Your Job!",
            "msg": f"{user['full_name'] or 'A freelancer'} placed a quick order on your job \"{job['title']}\" for ETB {req.amount:,.0f}.",
            "type": "order",
        },
    )

    return {"transactionId": txn_id, "message": "Quick order placed successfully!"}
