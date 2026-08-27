"""Business dashboard routes: CRM, meetings, invoices, team management."""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db, date_trunc_sql
from python_backend.auth import get_current_user
from python_backend.schemas import (
    CustomerCreateRequest, CustomerUpdateRequest,
    MeetingCreateRequest, MeetingUpdateRequest,
    InvoiceCreateRequest, InvoiceUpdateRequest,
    TeamMemberCreateRequest, TeamMemberUpdateRequest,
)

router = APIRouter(prefix="/api/business", tags=["business"])


@router.get("/overview")
async def business_overview(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    uid = user["id"]
    customers = await db.execute(text("SELECT COUNT(*) as count FROM business_customers WHERE user_id = :uid"), {"uid": uid})
    meetings = await db.execute(text("SELECT COUNT(*) as count FROM business_meetings WHERE user_id = :uid AND status = 'scheduled'"), {"uid": uid})
    invoices = await db.execute(text("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM business_invoices WHERE user_id = :uid AND status = 'pending'"), {"uid": uid})
    revenue = await db.execute(text("SELECT COALESCE(SUM(amount), 0) as total FROM business_invoices WHERE user_id = :uid AND status = 'paid'"), {"uid": uid})
    team = await db.execute(text("SELECT COUNT(*) as count FROM business_team WHERE user_id = :uid AND status = 'active'"), {"uid": uid})

    inv = invoices.mappings().first()
    return {
        "total_customers": customers.mappings().first()["count"],
        "upcoming_meetings": meetings.mappings().first()["count"],
        "pending_invoices": inv["count"],
        "pending_revenue": float(inv["total"]),
        "total_revenue": float(revenue.mappings().first()["total"]),
        "team_size": team.mappings().first()["count"],
    }


# ====== CUSTOMERS ======
@router.get("/competitors")
async def get_competitors(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get competitor analysis for the user's business."""
    # Simple competitor analysis: find other freelancers in same categories
    result = await db.execute(
        text("""SELECT u.id, u.full_name, u.rating, u.review_count, u.city,
                       (SELECT COUNT(*) FROM gigs WHERE freelancer_id = u.id AND active = 1) as gig_count
                FROM users u WHERE u.role = 'freelancer' AND u.id != :uid
                ORDER BY u.rating DESC LIMIT 10"""),
        {"uid": user["id"]},
    )
    return {"competitors": [dict(r) for r in result.mappings().all()]}


@router.get("/transactions")
async def business_transactions(limit: int = 50, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""SELECT t.*, COALESCE(j.title, 'N/A') as job_title
                FROM transactions t
                LEFT JOIN jobs j ON t.job_id = j.id
                WHERE t.client_id = :uid OR t.freelancer_id = :uid2
                ORDER BY t.created_at DESC LIMIT :lim"""),
        {"uid": user["id"], "uid2": user["id"], "lim": limit},
    )
    return {"transactions": [dict(r) for r in result.mappings().all()]}


@router.get("/customers")
async def get_customers(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM business_customers WHERE user_id = :uid ORDER BY created_at DESC"),
        {"uid": user["id"]},
    )
    return {"customers": [dict(r) for r in result.mappings().all()]}


@router.post("/customers")
async def create_customer(req: CustomerCreateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    cid = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO business_customers (id, user_id, name, email, phone, company, notes, status) VALUES (:id, :uid, :name, :email, :phone, :company, :notes, :status)"),
        {"id": cid, "uid": user["id"], "name": req.name, "email": req.email, "phone": req.phone,
         "company": req.company, "notes": req.notes, "status": req.status},
    )
    result = await db.execute(text("SELECT * FROM business_customers WHERE id = :id"), {"id": cid})
    return {"customer": dict(result.mappings().first())}


@router.put("/customers/{cust_id}")
async def update_customer(cust_id: str, req: CustomerUpdateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        text("""UPDATE business_customers SET name = COALESCE(:name, name), email = COALESCE(:email, email),
                phone = COALESCE(:phone, phone), company = COALESCE(:company, company),
                notes = COALESCE(:notes, notes), status = COALESCE(:status, status),
                updated_at = CURRENT_TIMESTAMP WHERE id = :id AND user_id = :uid"""),
        {"name": req.name, "email": req.email, "phone": req.phone, "company": req.company,
         "notes": req.notes, "status": req.status, "id": cust_id, "uid": user["id"]},
    )
    result = await db.execute(text("SELECT * FROM business_customers WHERE id = :id"), {"id": cust_id})
    return {"customer": dict(result.mappings().first())}


@router.delete("/customers/{cust_id}")
async def delete_customer(cust_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM business_customers WHERE id = :id AND user_id = :uid"), {"id": cust_id, "uid": user["id"]})
    return {"message": "Customer deleted"}


# ====== MEETINGS ======
@router.get("/meetings")
async def get_meetings(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM business_meetings WHERE user_id = :uid ORDER BY date DESC"),
        {"uid": user["id"]},
    )
    return {"meetings": [dict(r) for r in result.mappings().all()]}


@router.post("/meetings")
async def create_meeting(req: MeetingCreateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    mid = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO business_meetings (id, user_id, customer_id, title, description, date, duration, meeting_type) VALUES (:id, :uid, :cid, :title, :desc, :date, :dur, :mtype)"),
        {"id": mid, "uid": user["id"], "cid": req.customerId, "title": req.title,
         "desc": req.description, "date": req.date, "dur": req.duration, "mtype": req.meetingType},
    )
    result = await db.execute(text("SELECT * FROM business_meetings WHERE id = :id"), {"id": mid})
    return {"meeting": dict(result.mappings().first())}


@router.put("/meetings/{meeting_id}")
async def update_meeting(meeting_id: str, req: MeetingUpdateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        text("""UPDATE business_meetings SET title = COALESCE(:title, title), description = COALESCE(:desc, description),
                date = COALESCE(:date, date), duration = COALESCE(:dur, duration),
                status = COALESCE(:status, status), meeting_type = COALESCE(:mtype, meeting_type)
                WHERE id = :id AND user_id = :uid"""),
        {"title": req.title, "desc": req.description, "date": req.date, "dur": req.duration,
         "status": req.status, "mtype": req.meetingType, "id": meeting_id, "uid": user["id"]},
    )
    result = await db.execute(text("SELECT * FROM business_meetings WHERE id = :id"), {"id": meeting_id})
    return {"meeting": dict(result.mappings().first())}


# ====== INVOICES ======
@router.get("/invoices")
async def get_invoices(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM business_invoices WHERE user_id = :uid ORDER BY created_at DESC"),
        {"uid": user["id"]},
    )
    return {"invoices": [dict(r) for r in result.mappings().all()]}


@router.post("/invoices")
async def create_invoice(req: InvoiceCreateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    iid = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO business_invoices (id, user_id, customer_id, invoice_number, amount, due_date, line_items, notes) VALUES (:id, :uid, :cid, :num, :amt, :due, :items, :notes)"),
        {"id": iid, "uid": user["id"], "cid": req.customerId, "num": req.invoiceNumber,
         "amt": req.amount, "due": req.dueDate, "items": req.lineItems, "notes": req.notes},
    )
    result = await db.execute(text("SELECT * FROM business_invoices WHERE id = :id"), {"id": iid})
    return {"invoice": dict(result.mappings().first())}


@router.put("/invoices/{inv_id}")
async def update_invoice(inv_id: str, req: InvoiceUpdateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        text("UPDATE business_invoices SET status = COALESCE(:status, status), paid_date = COALESCE(:pdate, paid_date), notes = COALESCE(:notes, notes), updated_at = CURRENT_TIMESTAMP WHERE id = :id AND user_id = :uid"),
        {"status": req.status, "pdate": req.paidDate, "notes": req.notes, "id": inv_id, "uid": user["id"]},
    )
    result = await db.execute(text("SELECT * FROM business_invoices WHERE id = :id"), {"id": inv_id})
    return {"invoice": dict(result.mappings().first())}


# ====== TEAM ======
@router.get("/team")
async def get_team(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM business_team WHERE user_id = :uid ORDER BY joined_at DESC"),
        {"uid": user["id"]},
    )
    return {"team": [dict(r) for r in result.mappings().all()]}


@router.post("/team")
async def create_team_member(req: TeamMemberCreateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tid = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO business_team (id, user_id, member_name, member_email, role) VALUES (:id, :uid, :name, :email, :role)"),
        {"id": tid, "uid": user["id"], "name": req.memberName, "email": req.memberEmail, "role": req.role},
    )
    result = await db.execute(text("SELECT * FROM business_team WHERE id = :id"), {"id": tid})
    return {"member": dict(result.mappings().first())}


@router.put("/team/{member_id}")
async def update_team_member(member_id: str, req: TeamMemberUpdateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        text("UPDATE business_team SET member_name = COALESCE(:name, member_name), member_email = COALESCE(:email, member_email), role = COALESCE(:role, role), status = COALESCE(:status, status) WHERE id = :id AND user_id = :uid"),
        {"name": req.memberName, "email": req.memberEmail, "role": req.role, "status": req.status, "id": member_id, "uid": user["id"]},
    )
    result = await db.execute(text("SELECT * FROM business_team WHERE id = :id"), {"id": member_id})
    return {"member": dict(result.mappings().first())}


@router.delete("/team/{member_id}")
async def delete_team_member(member_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM business_team WHERE id = :id AND user_id = :uid"), {"id": member_id, "uid": user["id"]})
    return {"message": "Member removed"}


# ====== REVENUE ======
@router.get("/revenue")
async def get_revenue(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    monthly = await db.execute(
        text(f"""SELECT {date_trunc_sql('month', 'created_at')} as month, SUM(amount) as total
                FROM business_invoices WHERE user_id = :uid AND status = 'paid'
                GROUP BY month ORDER BY month DESC LIMIT 12"""),
        {"uid": user["id"]},
    )
    return {"monthly": [dict(r) for r in monthly.mappings().all()]}
