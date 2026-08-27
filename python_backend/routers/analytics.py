"""User analytics routes: overview, gigs, earnings, messages, jobs stats.

All endpoints return the ``{analytics: {...}}`` envelope the dashboard
frontend expects. Range values: 7d | 30d | 12m | all.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db, interval_sql, date_trunc_sql
from python_backend.auth import get_current_user
from python_backend.serializers import rows

router = APIRouter(prefix="/api/user/analytics", tags=["analytics"])

_MONTHS = 12


def _range_seconds(range: str) -> int:
    """Seconds for 7d / 30d / 12m; 'all' → 0 (no window)."""
    r = (range or "30d").strip().lower()
    if r == "all":
        return 0
    if r.endswith("m"):
        return int(r[:-1]) * 30 * 24 * 3600
    if r.endswith("d"):
        return int(r[:-1]) * 24 * 3600
    return 30 * 24 * 3600


def _window_clause(seconds: int) -> str:
    if seconds <= 0:
        return "1=1"
    return f"created_at > {interval_sql(seconds)}"


async def _scalar(db, query, params) -> float:
    r = await db.execute(text(query), params)
    return float(r.mappings().first()["v"] or 0)


@router.get("/overview")
async def overview(range: str = "30d", user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    uid = user["id"]
    role = user["role"]
    window = _window_clause(_range_seconds(range))

    monthly = await db.execute(text(f"""
        SELECT {date_trunc_sql('month', 'created_at')} as month, SUM(amount) as amount
        FROM transactions
        WHERE freelancer_id = :uid AND status = 'released'
        GROUP BY month ORDER BY month DESC LIMIT {_MONTHS}
    """), {"uid": uid})
    monthly_earnings = [dict(r) for r in monthly.mappings().all()][::-1]

    total_earned = await _scalar(db, f"SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE freelancer_id = :uid AND status = 'released'", {"uid": uid})
    total_spent = await _scalar(db, f"SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE client_id = :uid AND status IN ('released','confirmed')", {"uid": uid})
    escrow_held = await _scalar(db, "SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE (freelancer_id = :uid OR client_id = :uid2) AND status = 'escrow'", {"uid": uid, "uid2": uid})
    active_gigs = await _scalar(db, "SELECT COUNT(*) as v FROM gigs WHERE freelancer_id = :uid AND active = 1", {"uid": uid})
    completed_jobs = await _scalar(db, "SELECT COUNT(*) as v FROM jobs WHERE awarded_to = :uid AND status = 'completed'", {"uid": uid})
    open_jobs = await _scalar(db, "SELECT COUNT(*) as v FROM jobs WHERE client_id = :uid AND status = 'open'", {"uid": uid})
    in_progress_jobs = await _scalar(db, "SELECT COUNT(*) as v FROM jobs WHERE client_id = :uid AND status IN ('in_progress','delivered')", {"uid": uid})
    total_jobs = await _scalar(db, "SELECT COUNT(*) as v FROM jobs WHERE client_id = :uid", {"uid": uid})
    total_bids = await _scalar(db, "SELECT COUNT(*) as v FROM bids WHERE freelancer_id = :uid", {"uid": uid})
    won_bids = await _scalar(db, "SELECT COUNT(*) as v FROM bids WHERE freelancer_id = :uid AND status = 'accepted'", {"uid": uid})
    bids_on_my_jobs = await _scalar(db, "SELECT COUNT(*) as v FROM bids b JOIN jobs j ON b.job_id = j.id WHERE j.client_id = :uid", {"uid": uid})

    recent_jobs_rows = await db.execute(text("""
        SELECT j.id, j.title, j.status, j.budget_max, j.created_at,
               u.full_name as client_name
        FROM jobs j JOIN users u ON j.client_id = u.id
        WHERE j.client_id = :uid OR j.awarded_to = :uid2
        ORDER BY j.created_at DESC LIMIT 6
    """), {"uid": uid, "uid2": uid})
    recent_jobs = rows(recent_jobs_rows.mappings().all())

    return {"analytics": {
        "totalEarned": total_earned,
        "totalSpent": total_spent,
        "escrowHeld": escrow_held,
        "activeGigs": active_gigs,
        "completedJobs": completed_jobs,
        "openJobs": open_jobs,
        "inProgressJobs": in_progress_jobs,
        "totalJobs": total_jobs,
        "totalBids": total_bids,
        "avgBidsPerJob": round(bids_on_my_jobs / total_jobs, 1) if total_jobs else 0,
        "winRate": round(won_bids / total_bids * 100, 1) if total_bids else 0,
        "avgRating": float(user.get("rating") or 0),
        "totalReviews": float(user.get("review_count") or 0),
        "monthlyEarnings": monthly_earnings,
        "recentJobs": recent_jobs,
        "role": role,
    }}


@router.get("/gigs")
async def gigs_analytics(range: str = "30d", user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text(f"""
        SELECT {date_trunc_sql('day', 'created_at')} as day, COUNT(*) as count
        FROM gigs WHERE freelancer_id = :uid AND {_window_clause(_range_seconds(range))}
        GROUP BY day ORDER BY day
    """), {"uid": user["id"]})
    return {"analytics": {"gigs_over_time": rows(result.mappings().all())}}


@router.get("/earnings")
async def earnings_analytics(range: str = "30d", user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text(f"""
        SELECT {date_trunc_sql('day', 'created_at')} as day, SUM(amount) as total
        FROM transactions WHERE freelancer_id = :uid AND status = 'released' AND {_window_clause(_range_seconds(range))}
        GROUP BY day ORDER BY day
    """), {"uid": user["id"]})
    return {"analytics": {"earnings_over_time": rows(result.mappings().all())}}


@router.get("/messages")
async def messages_analytics(range: str = "30d", user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    uid = user["id"]
    monthly = await db.execute(text(f"""
        SELECT {date_trunc_sql('month', 'created_at')} as month, COUNT(*) as count
        FROM messages WHERE (sender_id = :uid OR receiver_id = :uid2) AND {_window_clause(_range_seconds(range))}
        GROUP BY month ORDER BY month DESC LIMIT {_MONTHS}
    """), {"uid": uid, "uid2": uid})
    monthly_volume = [dict(r) for r in monthly.mappings().all()][::-1]

    total = await _scalar(db, "SELECT COUNT(*) as v FROM messages WHERE sender_id = :uid OR receiver_id = :uid2", {"uid": uid, "uid2": uid})
    sent = await _scalar(db, "SELECT COUNT(*) as v FROM messages WHERE sender_id = :uid", {"uid": uid})
    received = await _scalar(db, "SELECT COUNT(*) as v FROM messages WHERE receiver_id = :uid", {"uid": uid})
    unread = await _scalar(db, "SELECT COUNT(*) as v FROM messages WHERE receiver_id = :uid AND read = 0", {"uid": uid})

    convos = await db.execute(text("""
        SELECT CASE WHEN m.sender_id = :uid THEN m.receiver_id ELSE m.sender_id END as peer_id,
               u.full_name as peer_name, COUNT(*) as msg_count
        FROM messages m JOIN users u ON (CASE WHEN m.sender_id = :uid2 THEN m.receiver_id ELSE m.sender_id END) = u.id
        WHERE m.sender_id = :uid3 OR m.receiver_id = :uid4
        GROUP BY peer_id, u.full_name
        ORDER BY msg_count DESC LIMIT 6
    """), {"uid": uid, "uid2": uid, "uid3": uid, "uid4": uid})
    top_conversations = rows(convos.mappings().all())

    return {"analytics": {
        "totalMessages": total,
        "sentMessages": sent,
        "receivedMessages": received,
        "unreadMessages": unread,
        "monthlyVolume": monthly_volume,
        "topConversations": top_conversations,
    }}


@router.get("/jobs")
async def jobs_analytics(range: str = "30d", user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT status, COUNT(*) as count
        FROM jobs WHERE client_id = :uid
        GROUP BY status
    """), {"uid": user["id"]})
    return {"analytics": {"jobs_by_status": rows(result.mappings().all())}}
