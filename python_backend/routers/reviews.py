"""Review routes: create reviews, list user reviews."""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db
from python_backend.auth import get_current_user
from python_backend.schemas import ReviewCreateRequest

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("")
async def create_review(req: ReviewCreateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not req.jobId or not req.revieweeId or not req.rating or not req.role:
        raise HTTPException(400, "jobId, revieweeId, rating, and role are required")
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(400, "Rating must be between 1 and 5")
    if req.role not in ("client", "freelancer"):
        raise HTTPException(400, "Role must be 'client' or 'freelancer'")

    review_id = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO reviews (id, job_id, reviewer_id, reviewee_id, rating, comment, role)
            VALUES (:id, :jid, :rid, :revid, :rating, :comment, :role)
        """),
        {
            "id": review_id, "jid": req.jobId, "rid": user["id"],
            "revid": req.revieweeId, "rating": req.rating,
            "comment": req.comment, "role": req.role,
        },
    )

    # Update user rating
    stats = await db.execute(
        text("SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE reviewee_id = :rid"),
        {"rid": req.revieweeId},
    )
    s = stats.mappings().first()
    await db.execute(
        text("UPDATE users SET rating = :rating, review_count = :count WHERE id = :id"),
        {"rating": float(s["avg_rating"]), "count": s["count"], "id": req.revieweeId},
    )

    result = await db.execute(text("SELECT * FROM reviews WHERE id = :id"), {"id": review_id})
    return {"review": dict(result.mappings().first())}


@router.get("/user/{user_id}")
async def get_user_reviews(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT r.*, u.full_name as reviewer_name, u.profile_picture as reviewer_picture
            FROM reviews r JOIN users u ON r.reviewer_id = u.id
            WHERE r.reviewee_id = :rid ORDER BY r.created_at DESC
        """),
        {"rid": user_id},
    )
    return {"reviews": [dict(r) for r in result.mappings().all()]}
