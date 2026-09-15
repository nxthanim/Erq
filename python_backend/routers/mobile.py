"""Mobile API: paginated, cached, lean-DTO endpoints for the Android app.

Prefix: /api/mobile — a dedicated read tier so mobile traffic is isolated,
independently deployable, and never hits website-heavy join paths.

Write endpoints (auth, orders, payments, calls) stay on /api/*.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db, ilike_sql
from python_backend.auth import get_optional_user
from python_backend.serializers import row, rows, public_user
from python_backend.cache import cache_ttl

router = APIRouter(prefix="/api/mobile", tags=["mobile"])


# ------------------------------------------------------------------ helpers
async def _col_names(db: AsyncSession, table: str) -> set:
    try:
        res = await db.execute(
            text("SELECT column_name FROM information_schema.columns "
                 "WHERE table_name = :t"), {"t": table})
        return {r[0] for r in res.fetchall()}
    except Exception:
        return set()


# ---------------------------------------------------------- home feed
@router.get("/home")
@cache_ttl(seconds=20)
async def mobile_home(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
):
    gigs_r = await db.execute(text("""
        SELECT g.*, u.full_name as freelancer_name,
               u.profile_picture as freelancer_picture,
               u.rating as freelancer_rating, u.verified as freelancer_verified
        FROM gigs g
        JOIN users u ON g.freelancer_id = u.id
        WHERE g.active = 1
        ORDER BY g.created_at DESC
        LIMIT :lim
    """), {"lim": limit})
    featured = rows(gigs_r.mappings().all())

    top_r = await db.execute(text("""
        SELECT u.id, u.full_name, u.profile_picture, u.city, u.role,
               u.rating, u.review_count, u.skills, u.verified
        FROM users u
        WHERE u.role = 'freelancer' AND u.rating > 0
        ORDER BY u.rating DESC, u.review_count DESC
        LIMIT :lim
    """), {"lim": limit})
    top_freelancers = rows(top_r.mappings().all())

    cat_r = await db.execute(
        text("SELECT DISTINCT category FROM gigs WHERE active = 1 ORDER BY category"))
    categories = [r[0] for r in cat_r.fetchall()]

    resp: dict = {
        "featuredGigs": featured,
        "topFreelancers": top_freelancers,
        "categories": categories,
    }

    # optional unread count
    if user:
        try:
            u = await db.execute(text(
                "SELECT COUNT(*) as c FROM messages "
                "WHERE receiver_id = :uid AND read = 0"), {"uid": user["id"]})
            resp["unreadCount"] = u.mappings().first()["c"]
        except Exception:
            resp["unreadCount"] = 0
    else:
        resp["unreadCount"] = 0

    return resp


# ---------------------------------------------------------- gigs
@router.get("/gigs")
@cache_ttl(seconds=20)
async def mobile_list_gigs(
    category: str = None,
    search: str = None,
    sort: str = None,
    minPrice: float = None,
    maxPrice: float = None,
    freelancerId: str = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    q = """
        SELECT g.*, u.full_name as freelancer_name,
               u.profile_picture as freelancer_picture,
               u.rating as freelancer_rating, u.verified as freelancer_verified,
               u.username as freelancer_username,
               (SELECT COUNT(*) FROM gig_views WHERE gig_id = g.id) as view_count
        FROM gigs g JOIN users u ON g.freelancer_id = u.id
        WHERE g.active = 1
    """
    p: dict = {}

    if category:
        q += " AND g.category = :cat"; p["cat"] = category
    if search:
        q += f" AND (g.title {ilike_sql()} :s OR g.description {ilike_sql()} :s2)"
        p["s"] = f"%{search}%"; p["s2"] = f"%{search}%"
    if minPrice is not None:
        q += " AND g.price >= :mn"; p["mn"] = minPrice
    if maxPrice is not None:
        q += " AND g.price <= :mx"; p["mx"] = maxPrice
    if freelancerId:
        q += " AND g.freelancer_id = :fid"; p["fid"] = freelancerId

    sort_map = {
        "price_low": "g.price ASC", "price_high": "g.price DESC",
        "rating": "u.rating DESC", "views": "view_count DESC",
        "newest": "g.created_at DESC",
    }
    q += f" ORDER BY {sort_map.get(sort, 'g.created_at DESC')}"

    # total for pagination cursor (mirrors the same where clauses)
    count_q = "SELECT COUNT(*) as c FROM gigs g WHERE g.active = 1"
    count_p: dict = {}
    if category:
        count_q += " AND g.category = :cat"; count_p["cat"] = category
    if search:
        count_q += f" AND (g.title {ilike_sql()} :s OR g.description {ilike_sql()} :s2)"
        count_p["s"] = f"%{search}%"; count_p["s2"] = f"%{search}%"
    if minPrice is not None:
        count_q += " AND g.price >= :mn"; count_p["mn"] = minPrice
    if maxPrice is not None:
        count_q += " AND g.price <= :mx"; count_p["mx"] = maxPrice
    if freelancerId:
        count_q += " AND g.freelancer_id = :fid"; count_p["fid"] = freelancerId
    count_row = await db.execute(text(count_q), count_p)
    total = count_row.mappings().first()["c"]

    q += " LIMIT :lim OFFSET :off"
    p["lim"] = limit; p["off"] = offset

    r = await db.execute(text(q), p)
    return {"gigs": rows(r.mappings().all()), "total": total,
            "limit": limit, "offset": offset}


@router.get("/gigs/{gig_id}")
@cache_ttl(seconds=20)
async def mobile_gig_detail(gig_id: str, db: AsyncSession = Depends(get_db)):
    try:
        r = await db.execute(text("""
            SELECT g.*, u.full_name as freelancer_name,
                   u.profile_picture as freelancer_picture,
                   u.email as freelancer_email, u.phone as freelancer_phone,
                   u.rating as freelancer_rating, u.verified as freelancer_verified,
                   u.username as freelancer_username,
                   (SELECT COUNT(*) FROM gig_views WHERE gig_id = g.id) as view_count
            FROM gigs g JOIN users u ON g.freelancer_id = u.id
            WHERE g.id = :id
        """), {"id": gig_id})
        g = r.mappings().first()
    except Exception:
        raise HTTPException(502, "Gig query failed")
    if not g:
        raise HTTPException(404, "Gig not found")
    return {"gig": row(g)}


# ---------------------------------------------------------- jobs
@router.get("/jobs")
@cache_ttl(seconds=20)
async def mobile_list_jobs(
    category: str = None,
    search: str = None,
    sort: str = None,
    status: str = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    q = """
        SELECT j.*, u.full_name as client_name,
               u.profile_picture as client_picture,
               u.rating as client_rating, u.username as client_username
        FROM jobs j JOIN users u ON j.client_id = u.id
        WHERE 1=1
    """
    p: dict = {}

    if category:
        q += " AND j.category = :cat"; p["cat"] = category
    if search:
        q += f" AND (j.title {ilike_sql()} :s OR j.description {ilike_sql()} :s2)"
        p["s"] = f"%{search}%"; p["s2"] = f"%{search}%"
    if status:
        q += " AND j.status = :st"; p["st"] = status

    sort_map = {"budget_high": "j.budget_max DESC", "budget_low": "j.budget_min ASC",
                "newest": "j.created_at DESC"}
    q += f" ORDER BY {sort_map.get(sort, 'j.created_at DESC')} LIMIT :lim OFFSET :off"
    p["lim"] = limit; p["off"] = offset

    r = await db.execute(text(q), p)
    jobs = [dict(j) for j in r.mappings().all()]

    # attach bid counts in a single pass
    for j in jobs:
        try:
            bc = await db.execute(text(
                "SELECT COUNT(*) as c FROM bids WHERE job_id = :jid"),
                {"jid": j["id"]})
            j["bid_count"] = bc.mappings().first()["c"]
        except Exception:
            j["bid_count"] = 0

    return {"jobs": jobs, "limit": limit, "offset": offset}


@router.get("/jobs/{job_id}")
@cache_ttl(seconds=20)
async def mobile_job_detail(job_id: str, db: AsyncSession = Depends(get_db)):
    try:
        r = await db.execute(text("""
            SELECT j.*,
                u.full_name as client_name, u.profile_picture as client_picture,
                u.rating as client_rating, u.phone as client_phone, u.city as client_city,
                af.full_name as awarded_name, af.profile_picture as awarded_picture,
                af.rating as awarded_rating, af.verified as awarded_verified
            FROM jobs j
            JOIN users u ON j.client_id = u.id
            LEFT JOIN users af ON j.awarded_to = af.id
            WHERE j.id = :id
        """), {"id": job_id})
        j = r.mappings().first()
    except Exception:
        raise HTTPException(502, "Job query failed")
    if not j:
        raise HTTPException(404, "Job not found")

    bids = []
    try:
        br = await db.execute(text("""
            SELECT b.*, u.full_name as bidder_name, u.profile_picture as bidder_picture,
                   u.rating as bidder_rating
            FROM bids b JOIN users u ON b.user_id = u.id
            WHERE b.job_id = :jid ORDER BY b.created_at DESC
        """), {"jid": job_id})
        bids = rows(br.mappings().all())
    except Exception:
        pass

    return {"job": row(j), "bids": bids}


# ---------------------------------------------------------- freelancers
@router.get("/freelancers")
@cache_ttl(seconds=30)
async def mobile_list_freelancers(
    category: str = None,
    search: str = None,
    sort: str = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    q = """
        SELECT u.id, u.full_name, u.city, u.profile_picture, u.bio, u.skills,
               u.verified, u.rating, u.review_count, u.created_at,
               (SELECT COUNT(*) FROM gigs g WHERE g.freelancer_id = u.id AND g.active = 1)
                   as gig_count
        FROM users u WHERE u.role = 'freelancer'
    """
    p: dict = {}

    if search:
        q += (f" AND (u.full_name {ilike_sql()} :s OR u.bio {ilike_sql()} :s2"
              f" OR u.skills {ilike_sql()} :s3)")
        p["s"] = f"%{search}%"; p["s2"] = f"%{search}%"; p["s3"] = f"%{search}%"
    if category:
        q += (" AND u.id IN "
              "(SELECT DISTINCT freelancer_id FROM gigs "
              "WHERE category = :cat AND active = 1)")
        p["cat"] = category

    sort_map = {"rating": "u.rating DESC", "newest": "u.created_at DESC"}
    q += f" ORDER BY {sort_map.get(sort, 'u.rating DESC, u.review_count DESC')}"
    q += " LIMIT :lim OFFSET :off"
    p["lim"] = limit; p["off"] = offset

    r = await db.execute(text(q), p)
    freelancers = rows(r.mappings().all())

    # attach top 3 gigs per freelancer
    for f in freelancers:
        try:
            gr = await db.execute(text(
                "SELECT id, title, price, category, delivery_time "
                "FROM gigs WHERE freelancer_id = :fid AND active = 1 "
                "ORDER BY created_at DESC LIMIT 3"), {"fid": f["id"]})
            f["gigs"] = rows(gr.mappings().all())
        except Exception:
            f["gigs"] = []

    return {"freelancers": freelancers, "limit": limit, "offset": offset}


# ---------------------------------------------------------- user profile
@router.get("/user/{user_id}")
async def mobile_user_profile(user_id: str, db: AsyncSession = Depends(get_db)):
    try:
        r = await db.execute(
            text("SELECT * FROM users WHERE id = :id LIMIT 1"), {"id": user_id})
        u = r.mappings().first()
    except Exception:
        raise HTTPException(502, "User query failed")
    if not u:
        raise HTTPException(404, "User not found")

    u = public_user(u)

    # gigs for freelancers
    if u.get("role") == "freelancer":
        try:
            gr = await db.execute(text(
                "SELECT id, title, description, price, category, delivery_time "
                "FROM gigs WHERE freelancer_id = :id AND active = 1 "
                "ORDER BY created_at DESC"), {"id": user_id})
            u["gigs"] = rows(gr.mappings().all())
        except Exception:
            u["gigs"] = []

    # recent reviews
    try:
        rr = await db.execute(text("""
            SELECT r.*, u.full_name as reviewer_name, u.profile_picture as reviewer_picture
            FROM reviews r JOIN users u ON r.reviewer_id = u.id
            WHERE r.reviewee_id = :uid ORDER BY r.created_at DESC LIMIT 5
        """), {"uid": user_id})
        u["reviews"] = rows(rr.mappings().all())
    except Exception:
        u["reviews"] = []

    return {"user": u}


# ---------------------------------------------------------- notifications
@router.get("/notifications")
async def mobile_notifications(
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    if not user:
        return {"notifications": [], "unreadCount": 0}

    # ensure read column
    try:
        await db.execute(text(
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read INTEGER DEFAULT 0"))
    except Exception:
        pass

    r = await db.execute(text(
        "SELECT * FROM notifications WHERE user_id = :uid "
        "ORDER BY created_at DESC LIMIT :lim"),
        {"uid": user["id"], "lim": limit})
    notifs = [dict(n) for n in r.mappings().all()]

    uc = await db.execute(text(
        "SELECT COUNT(*) as c FROM notifications WHERE user_id = :uid AND read = 0"),
        {"uid": user["id"]})
    unread = uc.mappings().first()["c"]

    return {"notifications": notifs, "unreadCount": unread}


# ---------------------------------------------------------- messages / conversations
@router.get("/messages/unread/count")
async def mobile_unread_count(
    user: dict = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    if not user:
        return {"count": 0}
    try:
        r = await db.execute(text(
            "SELECT COUNT(*) as c FROM messages WHERE receiver_id = :uid AND read = 0"),
            {"uid": user["id"]})
        return {"count": r.mappings().first()["c"]}
    except Exception:
        return {"count": 0}


@router.get("/messages/conversations")
async def mobile_conversations(
    user: dict = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    if not user:
        return {"conversations": []}
    try:
        r = await db.execute(text("""
            SELECT DISTINCT ON (u.id)
                CASE WHEN m.sender_id = :uid THEN m.receiver_id ELSE m.sender_id END
                    as other_user_id,
                u.full_name as other_user_name,
                u.profile_picture as other_user_picture,
                u.role as other_user_role,
                m.created_at as last_message_time,
                m.message as last_message,
                (SELECT COUNT(*) FROM messages
                 WHERE receiver_id = :uid2 AND sender_id = u.id AND read = 0)
                    as unread_count
            FROM messages m
            JOIN users u ON (CASE WHEN m.sender_id = :uid3 THEN m.receiver_id
                                  ELSE m.sender_id END) = u.id
            WHERE m.sender_id = :uid4 OR m.receiver_id = :uid5
            ORDER BY u.id, m.created_at DESC
        """), {"uid": user["id"], "uid2": user["id"], "uid3": user["id"],
               "uid4": user["id"], "uid5": user["id"]})
        return {"conversations": [dict(c) for c in r.mappings().all()]}
    except Exception:
        return {"conversations": []}


# ---------------------------------------------------------- marketplace
@router.get("/marketplace")
@cache_ttl(seconds=20)
async def mobile_marketplace(
    search: str = None,
    category: str = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    q = """
        SELECT b.*, u.full_name AS owner_name, u.profile_picture AS owner_picture,
               u.city AS owner_city, u.username AS owner_username, u.role AS owner_role
        FROM business_listings b
        JOIN users u ON u.id = b.user_id
        WHERE b.status = 'active'
    """
    p: dict = {}

    if search:
        q += (f" AND (b.title {ilike_sql()} :s OR b.description {ilike_sql()} :s2"
              f" OR b.business_name {ilike_sql()} :s3)")
        p["s"] = f"%{search.strip()}%"; p["s2"] = p["s"]; p["s3"] = p["s"]
    if category:
        q += " AND b.category = :cat"; p["cat"] = category

    q += " ORDER BY b.created_at DESC LIMIT :lim OFFSET :off"
    p["lim"] = limit; p["off"] = offset

    r = await db.execute(text(q), p)
    return {"listings": rows(r.mappings().all()), "limit": limit, "offset": offset}


# ---------------------------------------------------------- categories
@router.get("/categories")
@cache_ttl(seconds=60)
async def mobile_categories(db: AsyncSession = Depends(get_db)):
    r = await db.execute(text(
        "SELECT DISTINCT category FROM gigs WHERE active = 1 ORDER BY category"))
    return {"categories": [row[0] for row in r.fetchall()]}
