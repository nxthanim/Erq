"""Message routes: conversations, messages CRUD, file uploads."""

import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db
from python_backend.auth import get_current_user
from python_backend.schemas import MessageSendRequest

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("/conversations")
async def get_conversations(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT DISTINCT ON (u.id)
                CASE WHEN m.sender_id = :uid THEN m.receiver_id ELSE m.sender_id END as other_user_id,
                u.full_name as other_user_name,
                u.profile_picture as other_user_picture,
                u.role as other_user_role,
                m.created_at as last_message_time,
                m.message as last_message,
                (SELECT COUNT(*) FROM messages WHERE receiver_id = :uid2 AND sender_id = u.id AND read = 0) as unread_count
            FROM messages m
            JOIN users u ON (CASE WHEN m.sender_id = :uid3 THEN m.receiver_id ELSE m.sender_id END) = u.id
            WHERE m.sender_id = :uid4 OR m.receiver_id = :uid5
            ORDER BY u.id, m.created_at DESC
        """),
        {"uid": user["id"], "uid2": user["id"], "uid3": user["id"], "uid4": user["id"], "uid5": user["id"]},
    )
    return {"conversations": [dict(r) for r in result.mappings().all()]}


@router.get("/unread/count")
async def unread_count(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT COUNT(*) as count FROM messages WHERE receiver_id = :uid AND read = 0"),
        {"uid": user["id"]},
    )
    return {"count": result.mappings().first()["count"]}


@router.get("/{other_user_id}")
async def get_messages(other_user_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            SELECT * FROM messages
            WHERE (sender_id = :uid AND receiver_id = :oid) OR (sender_id = :oid2 AND receiver_id = :uid2)
            ORDER BY created_at ASC
        """),
        {"uid": user["id"], "oid": other_user_id, "oid2": other_user_id, "uid2": user["id"]},
    )
    # Mark as read
    await db.execute(
        text("UPDATE messages SET read = 1 WHERE sender_id = :oid AND receiver_id = :uid AND read = 0"),
        {"oid": other_user_id, "uid": user["id"]},
    )
    return {"messages": [dict(r) for r in result.mappings().all()]}


@router.post("")
async def send_message(req: MessageSendRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not req.receiverId or (not req.message and not req.attachmentUrl):
        raise HTTPException(400, "Receiver and message or attachment are required")

    msg_id = str(uuid.uuid4())
    await db.execute(
        text("""
            INSERT INTO messages (id, sender_id, receiver_id, job_id, message, attachment_url, attachment_name, attachment_size, attachment_type)
            VALUES (:id, :sid, :rid, :jid, :msg, :aurl, :aname, :asize, :atype)
        """),
        {
            "id": msg_id, "sid": user["id"], "rid": req.receiverId,
            "jid": req.jobId, "msg": req.message or "",
            "aurl": req.attachmentUrl, "aname": req.attachmentName,
            "asize": req.attachmentSize, "atype": req.attachmentType,
        },
    )
    result = await db.execute(text("SELECT * FROM messages WHERE id = :id"), {"id": msg_id})
    return {"message": dict(result.mappings().first())}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload a file for message attachment. Returns base64 data URI for serverless."""
    content = await file.read()
    import base64
    b64 = base64.b64encode(content).decode()
    data_uri = f"data:{file.content_type};base64,{b64}"
    return {
        "url": data_uri,
        "name": file.filename,
        "size": len(content),
        "mimetype": file.content_type,
    }
