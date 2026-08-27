"""Admin routes: dashboard, user management, monitoring, analytics."""

import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db, date_trunc_sql, range_interval_sql, interval_sql
from python_backend.auth import get_current_user
from python_backend.serializers import row, rows

router = APIRouter(prefix="/api/admin", tags=["admin"])

_MONTHS = 12


async def _require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Unauthorized")
    return user


def _range_seconds(range: str) -> int:
    r = (range or "30d").strip().lower()
    if r == "all":
        return 0
    if r.endswith("m"):
        return int(r[:-1]) * 30 * 24 * 3600
    if r.endswith("d"):
        return int(r[:-1]) * 24 * 3600
    return 30 * 24 * 3600


def _range_bind(range: str) -> str:
    seconds = _range_seconds(range)
    return "0 seconds" if seconds <= 0 else f"{seconds} seconds"


async def _scalar(db, query, params) -> float:
    r = await db.execute(text(query), params)
    return float(r.mappings().first()["v"] or 0)


@router.get("/stats")
async def admin_stats(admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    users = await db.execute(text("SELECT COUNT(*) as c FROM users"))
    freelancers = await db.execute(text("SELECT COUNT(*) as c FROM users WHERE role = 'freelancer'"))
    clients = await db.execute(text("SELECT COUNT(*) as c FROM users WHERE role = 'client'"))
    gigs = await db.execute(text("SELECT COUNT(*) as c FROM gigs WHERE active = 1"))
    jobs = await db.execute(text("SELECT COUNT(*) as c FROM jobs"))
    transactions = await db.execute(text("SELECT COUNT(*) as c, COALESCE(SUM(amount), 0) as total FROM transactions"))
    disputes = await db.execute(text("SELECT COUNT(*) as c FROM disputes WHERE status = 'pending'"))
    revenue = await db.execute(text("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'released'"))
    escrow = await db.execute(text("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'escrow'"))

    t = transactions.mappings().first()
    return {
        "stats": {
            "totalUsers": users.mappings().first()["c"],
            "totalFreelancers": freelancers.mappings().first()["c"],
            "totalClients": clients.mappings().first()["c"],
            "totalGigs": gigs.mappings().first()["c"],
            "totalJobs": jobs.mappings().first()["c"],
            "totalTransactions": t["c"],
            "totalRevenue": float(revenue.mappings().first()["total"]),
            "escrowBalance": float(escrow.mappings().first()["total"]),
            "pendingDisputes": disputes.mappings().first()["c"],
        }
    }


@router.get("/users")
async def admin_users(admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT * FROM users ORDER BY created_at DESC"))
    return {"users": [dict(r) for r in result.mappings().all()]}


@router.put("/users/{user_id}/verify")
async def verify_user(user_id: str, admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    await db.execute(text("UPDATE users SET verified = 1 WHERE id = :id"), {"id": user_id})
    return {"message": "User verified"}


@router.get("/gigs")
async def admin_gigs(admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT g.*, u.full_name as freelancer_name FROM gigs g JOIN users u ON g.freelancer_id = u.id ORDER BY g.created_at DESC"))
    return {"gigs": [dict(r) for r in result.mappings().all()]}


@router.get("/jobs")
async def admin_jobs(admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT j.*, u.full_name as client_name FROM jobs j JOIN users u ON j.client_id = u.id ORDER BY j.created_at DESC"))
    return {"jobs": [dict(r) for r in result.mappings().all()]}


@router.get("/transactions")
async def admin_transactions(admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT t.*, u1.full_name as client_name, u2.full_name as freelancer_name FROM transactions t LEFT JOIN users u1 ON t.client_id = u1.id LEFT JOIN users u2 ON t.freelancer_id = u2.id ORDER BY t.created_at DESC"))
    return {"transactions": [dict(r) for r in result.mappings().all()]}


@router.put("/disputes/{transaction_id}/resolve")
async def resolve_dispute(transaction_id: str, data: dict, admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    action = data.get("action", "refund")
    await db.execute(
        text("UPDATE transactions SET status = :action, updated_at = CURRENT_TIMESTAMP WHERE id = :id"),
        {"action": action, "id": transaction_id},
    )
    return {"message": f"Dispute resolved: {action}"}


@router.get("/notifications")
async def admin_notifications(admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    # Get system notifications for admin
    result = await db.execute(
        text("SELECT * FROM notifications WHERE user_id IN (SELECT id FROM users WHERE role = 'admin') ORDER BY created_at DESC LIMIT 50")
    )
    return {"notifications": [dict(r) for r in result.mappings().all()]}


@router.get("/analytics/financial")
async def admin_analytics_financial(range: str = "30d", admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    bound = _range_bind(range)
    monthly = await db.execute(text(f"""
        SELECT {date_trunc_sql('month', 'created_at')} as month,
               SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END) as revenue,
               SUM(amount) as volume, COUNT(*) as count
        FROM transactions
        WHERE {range_interval_sql('created_at', 'range')}
        GROUP BY month ORDER BY month DESC LIMIT {_MONTHS}
    """), {"range": bound})
    monthly_revenue = [dict(r) for r in monthly.mappings().all()][::-1]

    released = await _scalar(db, "SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE status = 'released'", {})
    escrow = await _scalar(db, "SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE status = 'escrow'", {})
    active_users = await _scalar(db, "SELECT COUNT(DISTINCT id) as v FROM users WHERE last_active_at > " + interval_sql(30 * 24 * 3600), {})
    month_ago = await _scalar(db, "SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE status = 'released' AND created_at > " + interval_sql(30 * 24 * 3600), {})
    prev_month = await _scalar(db, "SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE status = 'released' AND created_at <= " + interval_sql(30 * 24 * 3600) + " AND created_at > " + interval_sql(60 * 24 * 3600), {})

    total_revenue = released + escrow
    mrr = month_ago
    growth_rate = round((month_ago - prev_month) / prev_month * 100, 1) if prev_month else 0

    return {"analytics": {
        "mrr": mrr,
        "arr": mrr * 12,
        "growthRate": growth_rate,
        "activeUsers": active_users,
        "escrowBalance": escrow,
        "totalRevenue": total_revenue,
        "monthlyRevenue": monthly_revenue,
    }}


@router.get("/analytics/messages")
async def admin_analytics_messages(range: str = "30d", admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    bound = _range_bind(range)
    monthly = await db.execute(text(f"""
        SELECT {date_trunc_sql('month', 'created_at')} as month, COUNT(*) as count
        FROM messages WHERE {range_interval_sql('created_at', 'range')}
        GROUP BY month ORDER BY month DESC LIMIT {_MONTHS}
    """), {"range": bound})
    monthly_volume = [dict(r) for r in monthly.mappings().all()][::-1]

    total = await _scalar(db, "SELECT COUNT(*) as v FROM messages", {})
    unread = await _scalar(db, "SELECT COUNT(*) as v FROM messages WHERE read = 0", {})
    convos = await db.execute(text("""
        SELECT
            CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END as user1,
            CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END as user2,
            COUNT(*) as msg_count
        FROM messages GROUP BY user1, user2 ORDER BY msg_count DESC LIMIT 6
    """))
    top = rows(convos.mappings().all())
    for c in top:
        u1 = await db.execute(text("SELECT full_name FROM users WHERE id = :id"), {"id": c["user1"]})
        u2 = await db.execute(text("SELECT full_name FROM users WHERE id = :id"), {"id": c["user2"]})
        c["user1"] = (u1.mappings().first() or {}).get("full_name") or "User"
        c["user2"] = (u2.mappings().first() or {}).get("full_name") or "User"

    return {"analytics": {
        "totalMessages": total,
        "activeConversations": len(top),
        "unreadMessages": unread,
        "monthlyVolume": monthly_volume,
        "topConversations": top,
    }}


@router.get("/analytics/platform")
async def admin_analytics_platform(range: str = "30d", admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    bound = _range_bind(range)
    total_users = await _scalar(db, "SELECT COUNT(*) as v FROM users", {})
    total_freelancers = await _scalar(db, "SELECT COUNT(*) as v FROM users WHERE role = 'freelancer'", {})
    total_gigs = await _scalar(db, "SELECT COUNT(*) as v FROM gigs WHERE active = 1", {})
    total_jobs = await _scalar(db, "SELECT COUNT(*) as v FROM jobs", {})

    user_growth = await db.execute(text(f"""
        SELECT {date_trunc_sql('month', 'created_at')} as month, COUNT(*) as count
        FROM users WHERE {range_interval_sql('created_at', 'range')}
        GROUP BY month ORDER BY month DESC LIMIT {_MONTHS}
    """), {"range": bound})
    gig_growth = await db.execute(text(f"""
        SELECT {date_trunc_sql('month', 'created_at')} as month, COUNT(*) as count
        FROM gigs WHERE {range_interval_sql('created_at', 'range')}
        GROUP BY month ORDER BY month DESC LIMIT {_MONTHS}
    """), {"range": bound})

    return {"analytics": {
        "totalUsers": total_users,
        "totalFreelancers": total_freelancers,
        "totalGigs": total_gigs,
        "totalJobs": total_jobs,
        "userGrowth": [dict(r) for r in user_growth.mappings().all()][::-1],
        "gigGrowth": [dict(r) for r in gig_growth.mappings().all()][::-1],
    }}


@router.get("/analytics/payments")
async def admin_analytics_payments(range: str = "30d", admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    bound = _range_bind(range)
    monthly = await db.execute(text(f"""
        SELECT {date_trunc_sql('month', 'created_at')} as month, SUM(amount) as volume
        FROM transactions WHERE {range_interval_sql('created_at', 'range')}
        GROUP BY month ORDER BY month DESC LIMIT {_MONTHS}
    """), {"range": bound})
    monthly_volume = [dict(r) for r in monthly.mappings().all()][::-1]

    statuses = await db.execute(text(f"""
        SELECT status, COUNT(*) as count FROM transactions
        WHERE {range_interval_sql('created_at', 'range')} GROUP BY status
    """), {"range": bound})
    status_rows = rows(statuses.mappings().all())

    released = await _scalar(db, "SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE status = 'released'", {})
    escrow = await _scalar(db, "SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE status = 'escrow'", {})
    refunded = await _scalar(db, "SELECT COALESCE(SUM(amount),0) as v FROM transactions WHERE status IN ('refunded','cancelled')", {})
    txn_count = await _scalar(db, "SELECT COUNT(*) as v FROM transactions", {})

    return {"analytics": {
        "totalReleased": released,
        "totalEscrow": escrow,
        "totalRefunded": refunded,
        "transactionCount": txn_count,
        "monthlyVolume": monthly_volume,
        "statusBreakdown": status_rows,
    }}


@router.get("/analytics/disputes")
async def admin_analytics_disputes(range: str = "30d", admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    bound = _range_bind(range)
    total = await _scalar(db, f"SELECT COUNT(*) as v FROM disputes WHERE {range_interval_sql('created_at', 'range')}", {"range": bound})
    pending = await _scalar(db, f"SELECT COUNT(*) as v FROM disputes WHERE status = 'pending' AND {range_interval_sql('created_at', 'range')}", {"range": bound})
    resolved = await _scalar(db, f"SELECT COUNT(*) as v FROM disputes WHERE status IN ('resolved','refunded','released') AND {range_interval_sql('created_at', 'range')}", {"range": bound})
    total_reviews = await _scalar(db, "SELECT COUNT(*) as v FROM reviews", {})
    avg_rating = await _scalar(db, "SELECT COALESCE(AVG(rating),0) as v FROM reviews", {})

    dist = await db.execute(text("SELECT rating, COUNT(*) as count FROM reviews GROUP BY rating ORDER BY rating DESC"))
    rating_distribution = rows(dist.mappings().all())

    return {"analytics": {
        "totalDisputes": total,
        "pendingDisputes": pending,
        "resolvedDisputes": resolved,
        "totalReviews": total_reviews,
        "avgRating": round(avg_rating, 2),
        "ratingDistribution": rating_distribution,
    }}


@router.get("/analytics/referrals")
async def admin_analytics_referrals(admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT COUNT(*) as total_referrals, COALESCE(SUM(total_signups), 0) as total_signups, COALESCE(SUM(total_earned), 0) as total_earned FROM referrals"))
    return {"analytics": row(result.mappings().first())}


@router.get("/analytics")
async def admin_analytics(admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    # Users over time (last 12 months)
    users_chart = await db.execute(text(f"""
        SELECT {date_trunc_sql('month', 'created_at')} as month, COUNT(*) as count
        FROM users WHERE created_at > {interval_sql(365 * 24 * 3600)}
        GROUP BY month ORDER BY month
    """))
    # Revenue over time
    revenue_chart = await db.execute(text(f"""
        SELECT {date_trunc_sql('month', 'created_at')} as month, SUM(amount) as total
        FROM transactions WHERE status = 'released' AND created_at > {interval_sql(365 * 24 * 3600)}
        GROUP BY month ORDER BY month
    """))
    return {
        "analytics": {
            "users_over_time": rows(users_chart.mappings().all()),
            "revenue_over_time": rows(revenue_chart.mappings().all()),
        }
    }


@router.get("/biometric-evidence")
async def biometric_evidence(admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT t.id, t.amount, t.confirmation_selfie, t.confirmation_audio, t.confirmed_at,
               u.full_name as freelancer_name, u.email as freelancer_email
        FROM transactions t
        JOIN users u ON t.freelancer_id = u.id
        WHERE t.confirmation_selfie IS NOT NULL
        ORDER BY t.confirmed_at DESC
    """))
    return {"evidence": [dict(r) for r in result.mappings().all()]}


@router.get("/reviews")
async def admin_reviews(admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT r.*, u1.full_name as reviewer_name, u2.full_name as reviewee_name
        FROM reviews r
        JOIN users u1 ON r.reviewer_id = u1.id
        JOIN users u2 ON r.reviewee_id = u2.id
        ORDER BY r.created_at DESC
    """))
    review_list = rows(result.mappings().all())
    total = len(review_list)
    avg = await _scalar(db, "SELECT COALESCE(AVG(rating),0) as v FROM reviews", {})
    dist = await db.execute(text("SELECT rating, COUNT(*) as count FROM reviews GROUP BY rating ORDER BY rating DESC"))
    return {
        "reviews": review_list,
        "total": total,
        "avgRating": round(avg, 2),
        "ratingDistribution": rows(dist.mappings().all()),
    }


@router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM reviews WHERE id = :id"), {"id": review_id})
    return {"message": "Review deleted"}


@router.get("/audit/login")
async def admin_audit_login(limit: int = 100, admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    """Recent authentication audit events (login/signup/failed attempts)."""
    result = await db.execute(
        text("""SELECT id, user_id, email, ip_address, user_agent, action, created_at
                FROM login_audit ORDER BY created_at DESC LIMIT :lim"""),
        {"lim": min(max(limit, 1), 500)},
    )
    return {"audits": rows(result.mappings().all())}


@router.get("/audit/payment")
async def admin_audit_payment(limit: int = 100, admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    """Recent payment audit events."""
    result = await db.execute(
        text("""SELECT id, user_id, transaction_id, action, details, ip_address, created_at
                FROM payment_audit ORDER BY created_at DESC LIMIT :lim"""),
        {"lim": min(max(limit, 1), 500)},
    )
    return {"audits": rows(result.mappings().all())}


# ==========================================================================
# Security: rate limiting & IP bans
# ==========================================================================


@router.get("/security/banned-ips")
async def list_banned_ips(admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    """List all currently-active temporary IP bans (newest first)."""
    from python_backend.database import now_sql
    result = await db.execute(
        text(
            f"SELECT ip, reason, banned_until, created_at FROM banned_ips "
            f"WHERE banned_until > {now_sql()} ORDER BY banned_until DESC"
        )
    )
    return {"banned_ips": [dict(r) for r in result.mappings().all()]}


@router.delete("/security/banned-ips/{ip}")
async def unban_ip(ip: str, admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    """Remove a temporary ban for an IP address."""
    await db.execute(text("DELETE FROM banned_ips WHERE ip = :ip"), {"ip": ip})
    return {"message": f"IP {ip} unbanned"}


@router.get("/security/rate-limits")
async def rate_limit_stats(admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    """Rate-limit overview: top requesters, recent 429 breaches, active bans."""
    from python_backend.database import interval_sql, now_sql
    window_seconds = 15 * 60
    top = await db.execute(
        text(
            f"SELECT ip, endpoint, COUNT(*) as hits FROM rate_limit_hits "
            f"WHERE created_at > {interval_sql(window_seconds)} "
            f"GROUP BY ip, endpoint ORDER BY hits DESC LIMIT 25"
        )
    )
    breaches = await db.execute(
        text(
            f"SELECT COUNT(*) as c FROM rate_limit_hits "
            f"WHERE endpoint = '__breach__' AND created_at > {interval_sql(window_seconds)}"
        )
    )
    active_bans = await db.execute(
        text(
            f"SELECT COUNT(*) as c FROM banned_ips WHERE banned_until > {now_sql()}"
        )
    )
    return {
        "top_ips": [dict(r) for r in top.mappings().all()],
        "recent_breaches": breaches.mappings().first()["c"],
        "active_bans": active_bans.mappings().first()["c"],
    }


@router.post("/security/banned-ips")
async def ban_ip(payload: dict, admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    """Manually ban an IP address (default 24h, max 30 days)."""
    import uuid as _uuid
    from python_backend.database import interval_sql, now_sql

    ip = (payload.get("ip") or "").strip()
    if not ip or len(ip) > 64:
        raise HTTPException(status_code=400, detail="A valid IP address is required")
    reason = (payload.get("reason") or "Manually banned by admin")[:255]
    minutes = int(payload.get("minutes") or 1440)
    if minutes < 1 or minutes > 60 * 24 * 30:
        raise HTTPException(status_code=400, detail="minutes must be between 1 and 43200")

    ban_id = str(_uuid.uuid4())
    await db.execute(
        text(
            f"INSERT INTO banned_ips (id, ip, reason, banned_until, created_at) "
            f"VALUES (:id, :ip, :reason, {now_sql()} + {interval_sql(minutes * 60)}, CURRENT_TIMESTAMP)"
        ),
        {"id": ban_id, "ip": ip, "reason": reason},
    )
    await db.commit()
    return {"message": f"IP {ip} banned", "id": ban_id}


@router.get("/security/audit-log")
async def security_audit_log(admin: dict = Depends(_require_admin), db: AsyncSession = Depends(get_db)):
    """Recent security events: failed logins and other auth activity (last 7 days)."""
    from python_backend.database import interval_sql
    result = await db.execute(
        text(
            f"SELECT email, ip_address, user_agent, action, created_at FROM login_audit "
            f"WHERE created_at > {interval_sql(7 * 24 * 60 * 60)} "
            f"ORDER BY created_at DESC LIMIT 100"
        )
    )
    return {"events": [dict(r) for r in result.mappings().all()]}
