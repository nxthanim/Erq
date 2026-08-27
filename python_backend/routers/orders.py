"""Order routes: CRUD for gig orders, accept, deliver, complete, cancel, dispute."""

import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db
from python_backend.auth import get_current_user
from python_backend.schemas import OrderCreateRequest, OrderDeliverRequest

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("")
async def list_orders(status: str = None, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = """
        SELECT o.*, g.title as gig_title, g.category as gig_category,
               u.full_name as other_name, u.profile_picture as other_picture
        FROM orders o
        JOIN gigs g ON o.gig_id = g.id
        JOIN users u ON (CASE WHEN o.client_id = :uid THEN o.freelancer_id ELSE o.client_id END) = u.id
        WHERE (o.client_id = :uid2 OR o.freelancer_id = :uid3)
    """
    params = {"uid": user["id"], "uid2": user["id"], "uid3": user["id"]}
    if status:
        query += " AND o.status = :stat"
        params["stat"] = status
    query += " ORDER BY o.created_at DESC"

    result = await db.execute(text(query), params)
    return {"orders": [dict(r) for r in result.mappings().all()]}


@router.get("/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT o.*, g.title as gig_title, g.description as gig_description, g.price as gig_price,
                   u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
                   u.rating as freelancer_rating, u.verified as freelancer_verified
            FROM orders o
            JOIN gigs g ON o.gig_id = g.id
            JOIN users u ON o.freelancer_id = u.id
            WHERE o.id = :oid AND (o.client_id = :uid OR o.freelancer_id = :uid2)
        """),
        {"oid": order_id, "uid": user["id"], "uid2": user["id"]},
    )
    order = result.mappings().first()
    if not order:
        raise HTTPException(404, "Order not found")

    deliveries = await db.execute(
        text("SELECT * FROM order_deliveries WHERE order_id = :oid ORDER BY created_at DESC"),
        {"oid": order_id},
    )

    return {"order": dict(order), "deliveries": [dict(d) for d in deliveries.mappings().all()]}


@router.post("")
async def create_order(req: OrderCreateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    gig_result = await db.execute(
        text("SELECT g.*, u.full_name as freelancer_name FROM gigs g JOIN users u ON g.freelancer_id = u.id WHERE g.id = :gid AND g.active = 1"),
        {"gid": req.gig_id},
    )
    gig = gig_result.mappings().first()
    if not gig:
        raise HTTPException(404, "Gig not found")
    if gig["freelancer_id"] == user["id"]:
        raise HTTPException(400, "Cannot order your own gig")

    order_id = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO orders (id, gig_id, client_id, freelancer_id, title, description, price, requirements, status)
            VALUES (:id, :gid, :cid, :fid, :title, :desc, :price, :req, 'pending_payment')
        """),
        {
            "id": order_id, "gid": req.gig_id, "cid": user["id"],
            "fid": gig["freelancer_id"], "title": gig["title"],
            "desc": gig["description"], "price": gig["price"],
            "req": req.requirements or "",
        },
    )

    result = await db.execute(text("SELECT * FROM orders WHERE id = :id"), {"id": order_id})
    return {"order": dict(result.mappings().first())}


@router.put("/{order_id}/accept")
async def accept_order(order_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM orders WHERE id = :oid AND (freelancer_id = :uid OR status = 'pending')"),
        {"oid": order_id, "uid": user["id"]},
    )
    order = result.mappings().first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order["freelancer_id"] != user["id"]:
        raise HTTPException(403, "Only the freelancer can accept")

    await db.execute(text("UPDATE orders SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": order_id})

    # Notify client
    await db.execute(
        text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
        {"id": str(uuid.uuid4()), "uid": order["client_id"],
         "title": "Order Accepted",
         "msg": f"{user['full_name']} has accepted your order \"{order['title']}\" and is now working on it.",
         "type": "order"},
    )

    return {"message": "Order accepted"}


@router.put("/{order_id}/deliver")
async def deliver_order(order_id: str, req: OrderDeliverRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM orders WHERE id = :oid AND freelancer_id = :uid AND status = 'in_progress'"),
        {"oid": order_id, "uid": user["id"]},
    )
    order = result.mappings().first()
    if not order:
        raise HTTPException(404, "Order not found or not in progress")

    if req.files and len(req.files) > 0:
        delivery_id = str(uuid.uuid4())
        await db.execute(
            text("INSERT INTO order_deliveries (id, order_id, freelancer_id, message, files) VALUES (:id, :oid, :fid, :msg, :files)"),
            {"id": delivery_id, "oid": order_id, "fid": user["id"], "msg": req.message or "", "files": json.dumps(req.files)},
        )

    await db.execute(text("UPDATE orders SET status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": order_id})

    await db.execute(
        text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
        {"id": str(uuid.uuid4()), "uid": order["client_id"],
         "title": "Order Delivered!",
         "msg": f"{user['full_name']} has delivered the work for \"{order['title']}\".",
         "type": "order"},
    )

    return {"message": "Work delivered successfully"}


@router.put("/{order_id}/complete")
async def complete_order(order_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM orders WHERE id = :oid AND client_id = :uid AND status = 'delivered'"),
        {"oid": order_id, "uid": user["id"]},
    )
    order = result.mappings().first()
    if not order:
        raise HTTPException(404, "Order not found or not delivered")

    await db.execute(text("UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": order_id})

    # Release payment if there's a transaction
    if order["transaction_id"]:
        await db.execute(text("UPDATE transactions SET status = 'released', updated_at = CURRENT_TIMESTAMP WHERE id = :tid"), {"tid": order["transaction_id"]})

    return {"message": "Order completed and payment released"}


@router.put("/{order_id}/cancel")
async def cancel_order(order_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM orders WHERE id = :oid AND (client_id = :uid OR freelancer_id = :uid2)"),
        {"oid": order_id, "uid": user["id"], "uid2": user["id"]},
    )
    order = result.mappings().first()
    if not order:
        raise HTTPException(404, "Order not found")

    await db.execute(text("UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": order_id})
    return {"message": "Order cancelled"}


@router.put("/{order_id}/dispute")
async def dispute_order(order_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM orders WHERE id = :oid AND (client_id = :uid OR freelancer_id = :uid2)"),
        {"oid": order_id, "uid": user["id"], "uid2": user["id"]},
    )
    order = result.mappings().first()
    if not order:
        raise HTTPException(404, "Order not found")

    await db.execute(text("UPDATE orders SET status = 'disputed', updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": order_id})

    # Notify admins
    await db.execute(
        text("INSERT INTO notifications (id, user_id, title, message, type) VALUES (:id, :uid, :title, :msg, :type)"),
        {
            "id": str(uuid.uuid4()),
            "uid": (await db.execute(text("SELECT id FROM users WHERE role = 'admin' LIMIT 1"))).mappings().first()["id"],
            "title": "New Dispute",
            "msg": f"Order \"{order['title']}\" has been disputed.",
            "type": "dispute",
        },
    )

    return {"message": "Dispute created. Admin will review."}
