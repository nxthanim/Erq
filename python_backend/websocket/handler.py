"""WebSocket handler for real-time messaging, typing indicators, and presence."""

import json
import uuid
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from python_backend.database import ASYNC_DATABASE_URL

# Create a dedicated engine for WebSocket handler (runs in async context)
_ws_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False, pool_size=2)
_ws_session_factory = async_sessionmaker(_ws_engine, class_=AsyncSession, expire_on_commit=False)


async def get_ws_db():
    """Get a database session for the WebSocket handler."""
    async with _ws_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def handle_websocket(websocket):
    """Main WebSocket handler for real-time messaging.

    Expected message format (JSON):
    {
        "type": "register" | "message:send" | "typing:start" | "typing:stop" | "messages:read",
        "userId": "...",
        "data": { ... }
    }
    """
    await websocket.accept()
    user_id = None
    print(f"[ws] WebSocket connected")

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
                continue

            msg_type = msg.get("type")
            data = msg.get("data", {})

            if msg_type == "register":
                user_id = data.get("userId") or msg.get("userId")
                print(f"[OK] User {user_id} registered via WebSocket")

            elif msg_type == "message:send" and user_id:
                await _handle_send_message(websocket, user_id, data)

            elif msg_type in ("typing:start", "typing:stop") and user_id:
                await _handle_typing(websocket, msg_type, user_id, data)

            elif msg_type == "messages:read" and user_id:
                await _handle_messages_read(websocket, user_id, data)

    except Exception as e:
        print(f"[ws] WebSocket error: {e}")
    finally:
        if user_id:
            print(f"[ws] User {user_id} disconnected")
        await websocket.close()


async def _handle_send_message(websocket, user_id: str, data: dict):
    """Handle sending a message via WebSocket."""
    receiver_id = data.get("receiverId")
    message = data.get("message", "")
    attachment_url = data.get("attachmentUrl")
    if not receiver_id or (not message and not attachment_url):
        await websocket.send_json({"error": "Receiver and message or attachment required"})
        return

    msg_id = str(uuid.uuid4())
    async with _ws_session_factory() as db:
        try:
            await db.execute(
                text("""INSERT INTO messages (id, sender_id, receiver_id, job_id, message, attachment_url, attachment_name, attachment_size, attachment_type)
                        VALUES (:id, :sid, :rid, :jid, :msg, :aurl, :aname, :asize, :atype)"""),
                {
                    "id": msg_id, "sid": user_id, "rid": receiver_id,
                    "jid": data.get("jobId"), "msg": message,
                    "aurl": attachment_url, "aname": data.get("attachmentName"),
                    "asize": data.get("attachmentSize"), "atype": data.get("attachmentType"),
                },
            )

            # Get full message with sender info
            result = await db.execute(
                text("""SELECT m.*, u.full_name as sender_name, u.profile_picture as sender_picture
                        FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = :id"""),
                {"id": msg_id},
            )
            msg_data = dict(result.mappings().first())
            await db.commit()

            # Send to receiver's room and back to sender
            await websocket.send_json({"type": "message:sent", "message": msg_data})

        except Exception as e:
            await db.rollback()
            await websocket.send_json({"type": "message:error", "error": str(e)})


async def _handle_typing(websocket, msg_type: str, user_id: str, data: dict):
    """Handle typing indicator."""
    receiver_id = data.get("receiverId")
    if receiver_id:
        is_typing = msg_type == "typing:start"
        await websocket.send_json({
            "type": "typing:update",
            "data": {"userId": user_id, "isTyping": is_typing},
        })


async def _handle_messages_read(websocket, user_id: str, data: dict):
    """Handle marking messages as read."""
    other_user_id = data.get("otherUserId")
    if other_user_id:
        async with _ws_session_factory() as db:
            try:
                await db.execute(
                    text("UPDATE messages SET read = 1 WHERE sender_id = :oid AND receiver_id = :uid AND read = 0"),
                    {"oid": other_user_id, "uid": user_id},
                )
                await db.commit()
                await websocket.send_json({
                    "type": "messages:read-confirm",
                    "data": {"readBy": user_id, "fromUser": other_user_id},
                })
            except Exception as e:
                await db.rollback()
