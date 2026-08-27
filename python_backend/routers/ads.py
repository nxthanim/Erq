"""Ad campaign routes: create, list, update, stats for internal ad campaigns."""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db
from python_backend.auth import get_current_user

router = APIRouter(prefix="/api/ads", tags=["ads"])


@router.post("")
async def create_ad(data: dict, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    platform = data.get("platform", "facebook")
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    target_url = data.get("target_url", "").strip()
    target_audience = data.get("target_audience", "").strip()
    budget = float(data.get("budget") or 0)
    daily_budget = float(data.get("daily_budget") or 0)

    if not title:
        raise HTTPException(400, "Ad title is required")
    if len(title) > 200:
        raise HTTPException(400, "Title too long (max 200 chars)")

    ad_id = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO ads (id, user_id, platform, title, description, target_url, target_audience, budget, daily_budget, status)
            VALUES (:id, :uid, :platform, :title, :desc, :turl, :aud, :budget, :dbudget, 'pending')
        """),
        {
            "id": ad_id, "uid": user["id"], "platform": platform,
            "title": title, "desc": description, "turl": target_url,
            "aud": target_audience, "budget": budget, "dbudget": daily_budget,
        },
    )

    result = await db.execute(text("SELECT * FROM ads WHERE id = :id"), {"id": ad_id})
    ad = result.mappings().first()
    return {"ad": dict(ad)}


@router.get("")
async def list_ads(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM ads WHERE user_id = :uid ORDER BY created_at DESC"),
        {"uid": user["id"]},
    )
    return {"ads": [dict(r) for r in result.mappings().all()]}


@router.get("/stats")
async def ad_stats(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Aggregate stats for the user's ad campaigns."""
    result = await db.execute(
        text("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                COALESCE(SUM(impressions), 0) as total_impressions,
                COALESCE(SUM(clicks), 0) as total_clicks,
                COALESCE(SUM(budget), 0) as total_budget
            FROM ads WHERE user_id = :uid
        """),
        {"uid": user["id"]},
    )
    stats = result.mappings().first()
    total = dict(stats)
    total["total_budget"] = float(total["total_budget"])
    total["ctr"] = round((total["total_clicks"] / total["total_impressions"] * 100), 2) if total["total_impressions"] > 0 else 0
    return {"stats": total}


@router.put("/{ad_id}")
async def update_ad(ad_id: str, data: dict, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Verify ownership
    existing = await db.execute(
        text("SELECT * FROM ads WHERE id = :id AND user_id = :uid"),
        {"id": ad_id, "uid": user["id"]},
    )
    if not existing.mappings().first():
        raise HTTPException(404, "Ad not found or not yours")

    allowed = {"title", "description", "target_url", "target_audience", "budget", "daily_budget", "status", "platform"}
    updates = {}
    for key in allowed:
        if key in data:
            if key in ("budget", "daily_budget"):
                updates[key] = float(data[key])
            else:
                updates[key] = data[key]

    if not updates:
        raise HTTPException(400, "No valid fields to update")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = ad_id
    await db.execute(
        text(f"UPDATE ads SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = :id"),
        updates,
    )

    result = await db.execute(text("SELECT * FROM ads WHERE id = :id"), {"id": ad_id})
    return {"ad": dict(result.mappings().first())}


@router.delete("/{ad_id}")
async def delete_ad(ad_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        text("SELECT * FROM ads WHERE id = :id AND user_id = :uid"),
        {"id": ad_id, "uid": user["id"]},
    )
    if not existing.mappings().first():
        raise HTTPException(404, "Ad not found or not yours")
    await db.execute(text("DELETE FROM ads WHERE id = :id"), {"id": ad_id})
    return {"success": True}