"""Gig routes: list, create, update, delete, trending, popular, view tracking."""

import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db, ilike_sql, interval_sql
from python_backend.auth import get_current_user
from python_backend.schemas import GigCreateRequest, GigUpdateRequest
from python_backend.serializers import row, rows
from python_backend.cache import cache_ttl

router = APIRouter(prefix="/api/gigs", tags=["gigs"])

VALID_CATEGORIES = [
    "Translation", "Graphic Design", "Video Editing",
    "Web Development", "Virtual Assistant", "Social Media Management",
]


@router.get("")
@cache_ttl(seconds=20)
async def list_gigs(
    category: str = None,
    search: str = None,
    minPrice: float = None,
    maxPrice: float = None,
    sort: str = None,
    freelancerId: str = None,
    trending: str = None,
    popular: str = None,
    db: AsyncSession = Depends(get_db),
):
    query = """
        SELECT g.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
               u.rating as freelancer_rating, u.verified as freelancer_verified,
               (SELECT COUNT(*) FROM gig_views WHERE gig_id = g.id) as view_count
        FROM gigs g
        JOIN users u ON g.freelancer_id = u.id
        WHERE g.active = 1
    """
    params = {}

    if category:
        query += " AND g.category = :cat"
        params["cat"] = category
    if search:
        query += f" AND (g.title {ilike_sql()} :search OR g.description {ilike_sql()} :search2)"
        params["search"] = f"%{search}%"
        params["search2"] = f"%{search}%"
    if minPrice is not None:
        query += " AND g.price >= :min_price"
        params["min_price"] = minPrice
    if maxPrice is not None:
        query += " AND g.price <= :max_price"
        params["max_price"] = maxPrice
    if freelancerId:
        query += " AND g.freelancer_id = :fid"
        params["fid"] = freelancerId

    sort_map = {
        "price_low": "g.price ASC",
        "price_high": "g.price DESC",
        "rating": "u.rating DESC",
        "views": "view_count DESC",
        "newest": "g.created_at DESC",
    }
    if trending == "true" or popular == "true":
        query += f" ORDER BY {sort_map.get(sort, 'view_count DESC, g.created_at DESC')}"
    else:
        query += f" ORDER BY {sort_map.get(sort, 'g.created_at DESC')}"

    result = await db.execute(text(query), params)
    return {"gigs": rows(result.mappings().all())}


@router.get("/trending")
@cache_ttl(seconds=60)
async def trending_gigs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text(f"""
        SELECT g.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
               u.rating as freelancer_rating, u.verified as freelancer_verified,
               (SELECT COUNT(*) FROM gig_views WHERE gig_id = g.id AND created_at > {interval_sql(7 * 24 * 3600)}) as weekly_views
        FROM gigs g
        JOIN users u ON g.freelancer_id = u.id
        WHERE g.active = 1
        ORDER BY weekly_views DESC
        LIMIT 12
    """))
    return {"gigs": [dict(r) for r in result.mappings().all()]}


@router.get("/popular")
@cache_ttl(seconds=60)
async def popular_gigs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT g.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
               u.rating as freelancer_rating, u.verified as freelancer_verified,
               (SELECT COUNT(*) FROM gig_views WHERE gig_id = g.id) as view_count
        FROM gigs g
        JOIN users u ON g.freelancer_id = u.id
        WHERE g.active = 1
        ORDER BY view_count DESC
        LIMIT 12
    """))
    return {"gigs": rows(result.mappings().all())}


@router.get("/{gig_id}")
async def get_gig(gig_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT g.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
               u.rating as freelancer_rating, u.verified as freelancer_verified, u.bio as freelancer_bio,
               u.city as freelancer_city,
               (SELECT COUNT(*) FROM gig_views WHERE gig_id = g.id) as view_count
        FROM gigs g JOIN users u ON g.freelancer_id = u.id WHERE g.id = :id
    """), {"id": gig_id})
    gig = result.mappings().first()
    if not gig:
        raise HTTPException(404, "Gig not found")

    # Track view
    try:
        await db.execute(
            text("INSERT INTO gig_views (id, gig_id, viewer_ip) VALUES (:id, :gid, :ip)"),
            {"id": str(uuid.uuid4()), "gid": gig_id, "ip": "unknown"},
        )
    except Exception:
        pass

    return {"gig": row(gig)}


@router.post("")
async def create_gig(req: GigCreateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not req.title or not req.description or not req.price or not req.category or not req.deliveryTime:
        raise HTTPException(400, "All fields are required")
    if req.category not in VALID_CATEGORIES:
        raise HTTPException(400, "Invalid category")

    gig_id = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO gigs (id, freelancer_id, title, description, price, category, delivery_time, portfolio_images)
            VALUES (:id, :fid, :title, :desc, :price, :cat, :dt, :images)
        """),
        {
            "id": gig_id,
            "fid": user["id"],
            "title": req.title,
            "desc": req.description,
            "price": req.price,
            "cat": req.category,
            "dt": req.deliveryTime,
            "images": "[]",
        },
    )
    result = await db.execute(text("SELECT * FROM gigs WHERE id = :id"), {"id": gig_id})
    return {"gig": row(result.mappings().first())}


@router.put("/{gig_id}")
async def update_gig(gig_id: str, req: GigUpdateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    gig_result = await db.execute(
        text("SELECT * FROM gigs WHERE id = :id AND freelancer_id = :fid"),
        {"id": gig_id, "fid": user["id"]},
    )
    if not gig_result.mappings().first():
        raise HTTPException(404, "Gig not found or unauthorized")

    await db.execute(
        text("""
            UPDATE gigs SET
                title = COALESCE(:title, title),
                description = COALESCE(:desc, description),
                price = COALESCE(:price, price),
                category = COALESCE(:cat, category),
                delivery_time = COALESCE(:dt, delivery_time),
                active = COALESCE(:active, active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """),
        {
            "title": req.title,
            "desc": req.description,
            "price": req.price,
            "cat": req.category,
            "dt": req.deliveryTime,
            "active": req.active,
            "id": gig_id,
        },
    )
    result = await db.execute(text("SELECT * FROM gigs WHERE id = :id"), {"id": gig_id})
    return {"gig": dict(result.mappings().first())}


@router.delete("/{gig_id}")
async def delete_gig(gig_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    gig_result = await db.execute(
        text("SELECT * FROM gigs WHERE id = :id AND freelancer_id = :fid"),
        {"id": gig_id, "fid": user["id"]},
    )
    if not gig_result.mappings().first():
        raise HTTPException(404, "Gig not found or unauthorized")
    await db.execute(text("UPDATE gigs SET active = 0 WHERE id = :id"), {"id": gig_id})
    return {"message": "Gig deleted successfully"}
