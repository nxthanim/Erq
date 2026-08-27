"""User routes: freelancers list, search, profiles, online status."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db, interval_sql, ilike_sql
from python_backend.auth import get_current_user, get_optional_user
from python_backend.serializers import row, rows, public_user
from python_backend.cache import cache_ttl

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/freelancers")
@cache_ttl(seconds=30)
async def list_freelancers(
    category: str = None,
    search: str = None,
    min_price: float = None,
    max_price: float = None,
    sort: str = None,
    db: AsyncSession = Depends(get_db),
):
    query = """
        SELECT u.id, u.full_name, u.email, u.phone, u.city, u.profile_picture,
               u.bio, u.skills, u.verified, u.rating, u.review_count,
               u.created_at,
               (SELECT COUNT(*) FROM gigs g WHERE g.freelancer_id = u.id AND g.active = 1) as gig_count
        FROM users u
        WHERE u.role = 'freelancer'
    """
    params = {}

    if search:
        query += f" AND (u.full_name {ilike_sql()} :search OR u.bio {ilike_sql()} :search2 OR u.skills {ilike_sql()} :search3)"
        params["search"] = f"%{search}%"
        params["search2"] = f"%{search}%"
        params["search3"] = f"%{search}%"

    if category:
        query += " AND u.id IN (SELECT DISTINCT freelancer_id FROM gigs WHERE category = :cat AND active = 1)"
        params["cat"] = category

    sort_map = {"rating": "u.rating DESC", "newest": "u.created_at DESC"}
    query += f" ORDER BY {sort_map.get(sort, 'u.rating DESC, u.review_count DESC')}"

    result = await db.execute(text(query), params)
    freelancers = rows(result.mappings().all())

    freelancers_with_gigs = []
    for f in freelancers:
        gigs_result = await db.execute(
            text("SELECT id, title, price, category, delivery_time FROM gigs WHERE freelancer_id = :fid AND active = 1"),
            {"fid": f["id"]},
        )
        gigs = rows(gigs_result.mappings().all())
        freelancers_with_gigs.append({**f, "gigs": gigs})

    return {"freelancers": freelancers_with_gigs}


@router.get("/search")
async def search_users(
    q: str = Query(None),
    limit: int = Query(10),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not q or len(q.strip()) < 1:
        return {"users": []}
    search_term = f"%{q.strip()}%"
    result = await db.execute(
        text(f"""
            SELECT id, full_name, email, profile_picture, role, city, rating
            FROM users
            WHERE (full_name {ilike_sql()} :q OR email {ilike_sql()} :q2) AND id != :uid
            ORDER BY
                CASE
                    WHEN email LIKE :exact THEN 0
                    WHEN full_name {ilike_sql()} :q3 THEN 1
                    ELSE 2
                END,
                rating DESC,
                full_name ASC
            LIMIT :lim
        """),
        {"q": search_term, "q2": search_term, "uid": user["id"], "exact": f"{q.strip()}%", "q3": search_term, "lim": limit},
    )
    # Never expose emails through search (privacy hardening)
    users = rows(result.mappings().all())
    for u in users:
        u.pop("email", None)
    return {"users": users}


@router.get("/top-freelancers")
@cache_ttl(seconds=60)
async def top_freelancers(sort_by: str = None, db: AsyncSession = Depends(get_db)):
    if sort_by == "earnings":
        query = """
            SELECT u.id, u.full_name, u.city, u.profile_picture, u.rating, u.review_count,
                   (SELECT COUNT(*) FROM gigs WHERE freelancer_id = u.id) as total_gigs
            FROM users u WHERE u.role = 'freelancer'
            ORDER BY (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE freelancer_id = u.id AND status = 'released') DESC
            LIMIT 10
        """
    elif sort_by == "jobs":
        query = """
            SELECT u.id, u.full_name, u.city, u.profile_picture, u.rating, u.review_count,
                   (SELECT COUNT(*) FROM gigs WHERE freelancer_id = u.id) as total_gigs
            FROM users u WHERE u.role = 'freelancer'
            ORDER BY (SELECT COUNT(*) FROM transactions WHERE freelancer_id = u.id AND status = 'released') DESC
            LIMIT 10
        """
    else:
        query = """
            SELECT u.id, u.full_name, u.city, u.profile_picture, u.rating, u.review_count,
                   (SELECT COUNT(*) FROM gigs WHERE freelancer_id = u.id) as total_gigs
            FROM users u WHERE u.role = 'freelancer'
            ORDER BY u.rating DESC, u.review_count DESC
            LIMIT 10
        """
    result = await db.execute(text(query))
    return {"freelancers": rows(result.mappings().all())}


@router.get("/online-status")
async def online_status(userIds: str = None, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not userIds:
        return {"online": []}
    ids = [uid.strip() for uid in userIds.split(",") if uid.strip()]
    if not ids:
        return {"online": []}
    # Build parameterized placeholders to prevent SQL injection
    params = {}
    placeholders = []
    for i, uid in enumerate(ids):
        key = f"id{i}"
        params[key] = uid
        placeholders.append(f":{key}")
    result = await db.execute(
        text(f"""
            SELECT id FROM users
            WHERE id IN ({', '.join(placeholders)})
              AND last_active_at > {interval_sql(30)}
        """),
        params,
    )
    return {"online": [r["id"] for r in result.mappings().all()]}


@router.put("/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a profile picture. Returns base64 data URI for serverless."""
    content = await file.read()
    if not content:
        raise HTTPException(400, "Empty file")
    # Hard cap on upload size (5 MB) — protects memory on serverless
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(413, "Image too large (max 5 MB)")
    import base64
    b64 = base64.b64encode(content).decode()
    data_uri = f"data:{file.content_type};base64,{b64}"
    await db.execute(
        text("UPDATE users SET profile_picture = :url, updated_at = CURRENT_TIMESTAMP WHERE id = :id"),
        {"url": data_uri, "id": user["id"]},
    )
    return {"profile_picture": data_uri}


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current: dict = Depends(get_optional_user),
):
    # Resolve by primary id first, then clerk_id (Clerk session users link a
    # random UUID locally but the client may hold the Clerk id from a fallback).
    result = await db.execute(
        text("""SELECT id, email, full_name, role, phone, city, profile_picture,
                       bio, skills, verified, rating, review_count, created_at
                FROM users WHERE id = :id OR clerk_id = :id LIMIT 1"""),
        {"id": user_id},
    )
    user_row = result.mappings().first()
    if not user_row:
        raise HTTPException(404, "User not found")

    user = public_user(user_row)
    # Privacy: only the account owner (or an admin) sees email/phone
    if not current or (current["id"] != user["id"] and current["role"] != "admin"):
        user.pop("email", None)
        user.pop("phone", None)
    if user["role"] == "freelancer":
        gigs_result = await db.execute(
            text("SELECT * FROM gigs WHERE freelancer_id = :fid AND active = 1 ORDER BY created_at DESC"),
            {"fid": user["id"]},
        )
        user["gigs"] = rows(gigs_result.mappings().all())

        reviews_result = await db.execute(
            text("""
                SELECT r.*, u.full_name as reviewer_name, u.profile_picture as reviewer_picture
                FROM reviews r JOIN users u ON r.reviewer_id = u.id
                WHERE r.reviewee_id = :rid ORDER BY r.created_at DESC
            """),
            {"rid": user["id"]},
        )
        user["reviews"] = rows(reviews_result.mappings().all())

    return {"user": user}
