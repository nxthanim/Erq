"""Category routes: CRUD for service categories."""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db
from python_backend.auth import get_current_user, require_role
from python_backend.schemas import CategoryCreateRequest, CategoryUpdateRequest
from python_backend.serializers import row, rows
from python_backend.cache import cache_ttl

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("")
@cache_ttl(seconds=120)
async def list_categories(active: str = None, db: AsyncSession = Depends(get_db)):
    query = "SELECT * FROM categories WHERE 1=1"
    params = {}
    if active == "true":
        query += " AND active = 1"
    query += " ORDER BY sort_order ASC"
    result = await db.execute(text(query), params)
    return {"categories": rows(result.mappings().all())}


@router.get("/all")
@cache_ttl(seconds=120)
async def list_all(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT * FROM categories ORDER BY sort_order ASC"))
    return {"categories": rows(result.mappings().all())}


@router.post("")
async def create_category(req: CategoryCreateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user["role"] != "admin":
        raise HTTPException(403, "Unauthorized")
    cat_id = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO categories (id, name, icon, description, sort_order) VALUES (:id, :name, :icon, :desc, :so)"),
        {"id": cat_id, "name": req.name, "icon": req.icon, "desc": req.description, "so": req.sortOrder},
    )
    result = await db.execute(text("SELECT * FROM categories WHERE id = :id"), {"id": cat_id})
    return {"category": row(result.mappings().first())}


@router.put("/{cat_id}")
async def update_category(cat_id: str, req: CategoryUpdateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user["role"] != "admin":
        raise HTTPException(403, "Unauthorized")
    await db.execute(
        text("""
            UPDATE categories SET
                name = COALESCE(:name, name),
                icon = COALESCE(:icon, icon),
                description = COALESCE(:desc, description),
                sort_order = COALESCE(:so, sort_order),
                active = COALESCE(:active, active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        """),
        {"name": req.name, "icon": req.icon, "desc": req.description, "so": req.sortOrder, "active": req.active, "id": cat_id},
    )
    result = await db.execute(text("SELECT * FROM categories WHERE id = :id"), {"id": cat_id})
    return {"category": row(result.mappings().first())}


@router.delete("/{cat_id}")
async def delete_category(cat_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user["role"] != "admin":
        raise HTTPException(403, "Unauthorized")
    await db.execute(text("DELETE FROM categories WHERE id = :id"), {"id": cat_id})
    return {"message": "Category deleted"}
