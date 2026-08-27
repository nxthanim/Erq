"""Features routes: saved gigs, notifications, dashboard, disputes, portfolio, referrals."""

import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db
from python_backend.auth import get_current_user

router = APIRouter(prefix="/api/features", tags=["features"])


# ====== SAVED GIGS ======
@router.post("/saved-gigs/{gig_id}")
async def toggle_saved_gig(gig_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        text("SELECT id FROM saved_gigs WHERE user_id = :uid AND gig_id = :gid"),
        {"uid": user["id"], "gid": gig_id},
    )
    if existing.mappings().first():
        await db.execute(text("DELETE FROM saved_gigs WHERE user_id = :uid AND gig_id = :gid"), {"uid": user["id"], "gid": gig_id})
        return {"saved": False}
    else:
        sid = str(uuid.uuid4())
        await db.execute(text("INSERT INTO saved_gigs (id, user_id, gig_id) VALUES (:id, :uid, :gid)"), {"id": sid, "uid": user["id"], "gid": gig_id})
        return {"saved": True}


@router.get("/saved-gigs")
async def get_saved_gigs(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""SELECT g.*, sg.created_at as saved_at FROM saved_gigs sg
                JOIN gigs g ON sg.gig_id = g.id
                WHERE sg.user_id = :uid ORDER BY sg.created_at DESC"""),
        {"uid": user["id"]},
    )
    return {"gigs": [dict(r) for r in result.mappings().all()]}


@router.get("/saved-gigs/check/{gig_id}")
async def check_saved_gig(gig_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        text("SELECT id FROM saved_gigs WHERE user_id = :uid AND gig_id = :gid"),
        {"uid": user["id"], "gid": gig_id},
    )
    return {"saved": bool(existing.mappings().first())}


# ====== NOTIFICATIONS ======
@router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM notifications WHERE user_id = :uid ORDER BY created_at DESC LIMIT 50"),
        {"uid": user["id"]},
    )
    notifications = [dict(r) for r in result.mappings().all()]
    unread = await db.execute(
        text("SELECT COUNT(*) as c FROM notifications WHERE user_id = :uid AND read = 0"),
        {"uid": user["id"]},
    )
    return {
        "notifications": notifications,
        "unreadCount": unread.mappings().first()["c"],
    }


@router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(text("UPDATE notifications SET read = 1 WHERE id = :id AND user_id = :uid"), {"id": notif_id, "uid": user["id"]})
    return {"success": True}


@router.put("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(text("UPDATE notifications SET read = 1 WHERE user_id = :uid AND read = 0"), {"uid": user["id"]})
    return {"success": True}


# ====== DASHBOARD ======
@router.get("/activity-feed")
async def get_activity_feed(limit: int = 20, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get recent activity feed for the user."""
    uid = user["id"]

    # Get recent orders
    orders = await db.execute(
        text("""SELECT o.id, o.title, o.status, o.price, o.created_at, 'order' as activity_type
                FROM orders o WHERE o.client_id = :uid OR o.freelancer_id = :uid2
                ORDER BY o.created_at DESC LIMIT :lim"""),
        {"uid": uid, "uid2": uid, "lim": limit},
    )
    # Get recent messages
    messages = await db.execute(
        text("""SELECT m.id, m.message as title, m.created_at, 'message' as activity_type
                FROM messages m WHERE m.sender_id = :uid OR m.receiver_id = :uid2
                ORDER BY m.created_at DESC LIMIT :lim"""),
        {"uid": uid, "uid2": uid, "lim": limit},
    )
    # Get recent notifications
    notifs = await db.execute(
        text("""SELECT n.id, n.title, n.message, n.type, n.created_at, 'notification' as activity_type
                FROM notifications n WHERE n.user_id = :uid
                ORDER BY n.created_at DESC LIMIT :lim"""),
        {"uid": uid, "lim": limit},
    )

    activities = []
    for o in orders.mappings().all():
        activities.append({"type": "order", "title": f"Order: {o['title']}", "status": o["status"], "time": str(o["created_at"])})
    for m in messages.mappings().all():
        activities.append({"type": "message", "title": m["title"][:50] if m["title"] else "New message", "time": str(m["created_at"])})
    for n in notifs.mappings().all():
        activities.append({"type": "notification", "title": n["title"], "message": n["message"], "time": str(n["created_at"])})

    # Sort by time descending, limit
    activities.sort(key=lambda x: x["time"], reverse=True)
    return {"activities": activities[:limit]}


@router.get("/skill-badges/{user_id}")
async def get_skill_badges(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get skill badges for a user."""
    result = await db.execute(
        text("SELECT * FROM skill_badges WHERE user_id = :uid ORDER BY issued_at DESC"),
        {"uid": user_id},
    )
    return {"badges": [dict(r) for r in result.mappings().all()]}


@router.get("/dashboard")
async def get_dashboard(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    uid = user["id"]
    role = user["role"]
    stats = {}

    # ---- Wallet balance (from wallet router logic) ----
    released = await db.execute(
        text("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE (freelancer_id = :uid OR client_id = :uid2) AND status IN ('released', 'confirmed')"),
        {"uid": uid, "uid2": uid},
    )
    stats["wallet_balance"] = float(released.mappings().first()["total"])
    escrow = await db.execute(
        text("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE freelancer_id = :uid AND status = 'escrow'"),
        {"uid": uid},
    )
    stats["in_escrow"] = float(escrow.mappings().first()["total"])

    # ---- Earnings (sold) vs Spend (bought) ----
    earned = await db.execute(
        text("SELECT COALESCE(SUM(price), 0) as total FROM orders WHERE freelancer_id = :uid AND status IN ('completed', 'delivered', 'in_progress')"),
        {"uid": uid},
    )
    stats["total_earned"] = float(earned.mappings().first()["total"])
    spent = await db.execute(
        text("SELECT COALESCE(SUM(price), 0) as total FROM orders WHERE client_id = :uid AND status IN ('completed', 'delivered', 'in_progress', 'pending_payment')"),
        {"uid": uid},
    )
    stats["total_spent"] = float(spent.mappings().first()["total"])

    # ---- Order counts as seller / buyer ----
    sold = await db.execute(
        text("SELECT COUNT(*) as count FROM orders WHERE freelancer_id = :uid"), {"uid": uid})
    stats["orders_sold"] = sold.mappings().first()["count"]
    bought = await db.execute(
        text("SELECT COUNT(*) as count FROM orders WHERE client_id = :uid"), {"uid": uid})
    stats["orders_bought"] = bought.mappings().first()["count"]
    active_sales = await db.execute(
        text("SELECT COUNT(*) as count FROM orders WHERE freelancer_id = :uid AND status IN ('in_progress', 'delivered', 'pending_payment')"),
        {"uid": uid})
    stats["active_sales"] = active_sales.mappings().first()["count"]
    pending_buy = await db.execute(
        text("SELECT COUNT(*) as count FROM orders WHERE client_id = :uid AND status IN ('in_progress', 'delivered', 'pending_payment')"),
        {"uid": uid})
    stats["pending_buy"] = pending_buy.mappings().first()["count"]

    # ---- Gig / job counts ----
    gigs_count = await db.execute(text("SELECT COUNT(*) as count FROM gigs WHERE freelancer_id = :uid AND active = 1"), {"uid": uid})
    stats["total_gigs"] = gigs_count.mappings().first()["count"]
    jobs_count = await db.execute(text("SELECT COUNT(*) as count FROM jobs WHERE client_id = :uid"), {"uid": uid})
    stats["total_jobs"] = jobs_count.mappings().first()["count"]

    unread = await db.execute(text("SELECT COUNT(*) as count FROM messages WHERE receiver_id = :uid AND read = 0"), {"uid": uid})
    stats["unread_messages"] = unread.mappings().first()["count"]

    # ---- Recent orders (buy + sell) ----
    recent_orders = await db.execute(
        text("""SELECT o.*, g.title as gig_title, u.full_name as other_name, u.profile_picture as other_picture
                FROM orders o
                JOIN gigs g ON o.gig_id = g.id
                JOIN users u ON (CASE WHEN o.client_id = :uid THEN o.freelancer_id ELSE o.client_id END) = u.id
                WHERE (o.client_id = :uid2 OR o.freelancer_id = :uid3)
                ORDER BY o.created_at DESC LIMIT 6"""),
        {"uid": uid, "uid2": uid, "uid3": uid},
    )
    stats["recent_orders"] = [dict(r) for r in recent_orders.mappings().all()]

    # ---- Recent transactions ----
    recent_txns = await db.execute(
        text("""SELECT t.*, COALESCE(j.title, 'Wallet') as job_title
                FROM transactions t
                LEFT JOIN jobs j ON t.job_id = j.id
                WHERE t.client_id = :uid OR t.freelancer_id = :uid2
                ORDER BY t.created_at DESC LIMIT 6"""),
        {"uid": uid, "uid2": uid},
    )
    stats["recent_transactions"] = [dict(r) for r in recent_txns.mappings().all()]

    # ---- Role defaults ----
    stats["role"] = role
    return {"stats": stats}


# ====== TIPS (creator economy — buy a coffee) ======
@router.post("/tips")
async def send_tip(data: dict, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    receiver_id = data.get("receiver_id")
    try:
        amount = float(data.get("amount") or 0)
    except (TypeError, ValueError):
        raise HTTPException(400, "Tip amount must be a number")
    message = str(data.get("message", ""))[:500]

    if not receiver_id:
        raise HTTPException(400, "Receiver is required")
    if amount <= 0:
        raise HTTPException(400, "Tip amount must be greater than 0")
    if receiver_id == user["id"]:
        raise HTTPException(400, "You cannot tip yourself")

    receiver = await db.execute(
        text("SELECT id, full_name FROM users WHERE id = :rid"), {"rid": receiver_id})
    rec = receiver.mappings().first()
    if not rec:
        raise HTTPException(404, "Receiver not found")

    tip_id = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO tips (id, sender_id, receiver_id, amount, message) VALUES (:id, :sid, :rid, :amt, :msg)"),
        {"id": tip_id, "sid": user["id"], "rid": receiver_id, "amt": amount, "msg": message or None},
    )

    # Notify the receiver
    try:
        await db.execute(
            text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
            {"id": str(uuid.uuid4()), "uid": receiver_id,
             "title": "☕ New Tip!",
             "msg": f"{user['full_name']} sent you a tip of ETB {amount:,.0f}." + (f" \"{message}\"" if message else ""),
             "type": "payment"},
        )
    except Exception:
        pass

    return {"success": True, "tip": {"id": tip_id, "amount": amount, "receiver_id": receiver_id}}


# NOTE: /tips/me/received must be declared BEFORE /tips/{user_id} so FastAPI
# matches the literal path first (otherwise "me" is captured as a user_id).
@router.get("/tips/me/received")
async def my_received_tips(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""SELECT t.*, u.full_name as sender_name, u.profile_picture as sender_picture
                FROM tips t JOIN users u ON t.sender_id = u.id
                WHERE t.receiver_id = :rid ORDER BY t.created_at DESC LIMIT 50"""),
        {"rid": user["id"]},
    )
    tips = [dict(r) for r in result.mappings().all()]
    return {"tips": tips, "total": float(sum(float(t.get("amount") or 0) for t in tips)), "count": len(tips)}


@router.get("/tips/{user_id}")
async def get_tips(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get tips received by a user (public)."""
    result = await db.execute(
        text("""SELECT t.*, u.full_name as sender_name, u.profile_picture as sender_picture
                FROM tips t JOIN users u ON t.sender_id = u.id
                WHERE t.receiver_id = :rid
                ORDER BY t.created_at DESC LIMIT 50"""),
        {"rid": user_id},
    )
    tips = [dict(r) for r in result.mappings().all()]
    total = sum(float(t.get("amount") or 0) for t in tips)
    return {"tips": tips, "total": total, "count": len(tips)}


# ====== DISPUTES ======
@router.post("/disputes")
async def create_dispute(data: dict, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    dispute_id = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO disputes (id, transaction_id, raised_by, reason, description) VALUES (:id, :tid, :uid, :reason, :desc)"),
        {"id": dispute_id, "tid": data.get("transactionId"), "uid": user["id"],
         "reason": data.get("reason", ""), "desc": data.get("description")},
    )
    result = await db.execute(text("SELECT * FROM disputes WHERE id = :id"), {"id": dispute_id})
    return {"dispute": dict(result.mappings().first())}


@router.get("/disputes")
async def get_disputes(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""SELECT d.*, t.amount, t.status as txn_status
                FROM disputes d JOIN transactions t ON d.transaction_id = t.id
                WHERE d.raised_by = :uid OR t.client_id = :uid2 OR t.freelancer_id = :uid3
                ORDER BY d.created_at DESC"""),
        {"uid": user["id"], "uid2": user["id"], "uid3": user["id"]},
    )
    return {"disputes": [dict(r) for r in result.mappings().all()]}


@router.put("/disputes/{dispute_id}/evidence")
async def add_dispute_evidence(dispute_id: str, data: dict, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        text("UPDATE disputes SET evidence = :evidence WHERE id = :id"),
        {"evidence": json.dumps(data.get("evidence", [])), "id": dispute_id},
    )
    return {"success": True}


@router.put("/disputes/{dispute_id}/status")
async def update_dispute_status(dispute_id: str, data: dict, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user["role"] != "admin":
        raise HTTPException(403, "Unauthorized")
    await db.execute(
        text("UPDATE disputes SET status = :status, admin_notes = :notes, updated_at = CURRENT_TIMESTAMP WHERE id = :id"),
        {"status": data.get("status"), "notes": data.get("adminNotes"), "id": dispute_id},
    )
    return {"success": True}


# ====== PORTFOLIO ======
@router.get("/portfolio/{user_id}")
async def get_portfolio(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM portfolio_items WHERE user_id = :uid ORDER BY created_at DESC"),
        {"uid": user_id},
    )
    return {"items": [dict(r) for r in result.mappings().all()]}


@router.post("/portfolio")
async def add_portfolio_item(data: dict, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item_id = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO portfolio_items (id, user_id, title, description, image_url, tags, category) VALUES (:id, :uid, :title, :desc, :img, :tags, :cat)"),
        {"id": item_id, "uid": user["id"], "title": data.get("title"), "desc": data.get("description"),
         "img": data.get("image_url"), "tags": data.get("tags", "[]"), "cat": data.get("category")},
    )
    result = await db.execute(text("SELECT * FROM portfolio_items WHERE id = :id"), {"id": item_id})
    return {"item": dict(result.mappings().first())}


@router.delete("/portfolio/{item_id}")
async def delete_portfolio_item(item_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM portfolio_items WHERE id = :id AND user_id = :uid"), {"id": item_id, "uid": user["id"]})
    return {"message": "Item deleted"}


# ====== REFERRALS ======
@router.post("/referral/generate")
async def generate_referral(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = await db.execute(text("SELECT * FROM referrals WHERE referrer_id = :uid"), {"uid": user["id"]})
    ref = existing.mappings().first()
    if ref:
        return {"referral": dict(ref)}

    code = user["id"][:8].upper()
    ref_id = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO referrals (id, referrer_id, referral_code) VALUES (:id, :uid, :code)"),
        {"id": ref_id, "uid": user["id"], "code": code},
    )
    result = await db.execute(text("SELECT * FROM referrals WHERE id = :id"), {"id": ref_id})
    return {"referral": dict(result.mappings().first())}


@router.get("/referral/stats")
async def get_referral_stats(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT * FROM referrals WHERE referrer_id = :uid"), {"uid": user["id"]})
    ref = result.mappings().first()
    if not ref:
        return {"referral": None, "signups": []}
    signups = await db.execute(
        text("SELECT rs.*, u.full_name, u.created_at FROM referral_signups rs JOIN users u ON rs.referred_user_id = u.id WHERE rs.referral_id = :rid ORDER BY rs.created_at DESC"),
        {"rid": ref["id"]},
    )
    return {"referral": dict(ref), "signups": [dict(s) for s in signups.mappings().all()]}


@router.get("/referral/lookup/{code}")
async def lookup_referral(code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT * FROM referrals WHERE referral_code = :code"), {"code": code})
    ref = result.mappings().first()
    if not ref:
        raise HTTPException(404, "Invalid referral code")
    return {"referral": dict(ref)}


@router.post("/referral/redeem")
async def redeem_referral(data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT * FROM referrals WHERE referral_code = :code"), {"code": data.get("code")})
    ref = result.mappings().first()
    if not ref:
        raise HTTPException(404, "Invalid referral code")
    return {"success": True, "referrer_id": ref["referrer_id"]}
