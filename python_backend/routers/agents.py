"""AI Agents routes: CRUD agents, conversations, messages."""

import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from python_backend.database import get_db
from python_backend.auth import get_current_user
from python_backend.schemas import (
    AgentCreateRequest, AgentUpdateRequest,
    ConversationCreateRequest, AgentMessageSendRequest,
)
from python_backend.routers.ai import _build_system_prompt, _call_nvidia

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("")
async def list_agents(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM user_agents WHERE (user_id = :uid OR user_id = 'system') AND COALESCE(is_active, 1) = 1 ORDER BY created_at ASC"),
        {"uid": user["id"]},
    )
    return {"agents": [dict(r) for r in result.mappings().all()]}


@router.post("")
async def create_agent(req: AgentCreateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    agent_id = str(uuid.uuid4())
    await db.execute(
        text("""INSERT INTO user_agents (id, user_id, name, role, instructions, model, avatar, color, parent_agent_id)
                VALUES (:id, :uid, :name, :role, :instr, :model, :avatar, :color, :parent)"""),
        {
            "id": agent_id, "uid": user["id"], "name": req.name, "role": req.role,
            "instr": req.instructions, "model": req.model, "avatar": req.avatar,
            "color": req.color, "parent": req.parentAgentId,
        },
    )
    result = await db.execute(text("SELECT * FROM user_agents WHERE id = :id"), {"id": agent_id})
    return {"agent": dict(result.mappings().first())}


@router.put("/{agent_id}")
async def update_agent(agent_id: str, req: AgentUpdateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        text("SELECT * FROM user_agents WHERE id = :id AND user_id = :uid"),
        {"id": agent_id, "uid": user["id"]},
    )
    if not existing.mappings().first():
        raise HTTPException(404, "Agent not found or unauthorized")

    await db.execute(
        text("""UPDATE user_agents SET name = COALESCE(:name, name), role = COALESCE(:role, role),
                instructions = COALESCE(:instr, instructions), model = COALESCE(:model, model),
                avatar = COALESCE(:avatar, avatar), color = COALESCE(:color, color),
                is_active = COALESCE(:active, is_active), updated_at = CURRENT_TIMESTAMP
                WHERE id = :id"""),
        {"name": req.name, "role": req.role, "instr": req.instructions, "model": req.model,
         "avatar": req.avatar, "color": req.color, "active": req.isActive, "id": agent_id},
    )
    result = await db.execute(text("SELECT * FROM user_agents WHERE id = :id"), {"id": agent_id})
    return {"agent": dict(result.mappings().first())}


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        text("SELECT * FROM user_agents WHERE id = :id AND user_id = :uid"),
        {"id": agent_id, "uid": user["id"]},
    )
    if not existing.mappings().first():
        raise HTTPException(404, "Agent not found or unauthorized")
    await db.execute(text("UPDATE user_agents SET is_active = 0 WHERE id = :id"), {"id": agent_id})
    return {"message": "Agent deleted"}


# ====== CONVERSATIONS ======
@router.get("/{agent_id}/conversations")
async def list_conversations(agent_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM agent_conversations WHERE agent_id = :aid AND user_id = :uid ORDER BY updated_at DESC"),
        {"aid": agent_id, "uid": user["id"]},
    )
    return {"conversations": [dict(r) for r in result.mappings().all()]}


@router.post("/{agent_id}/conversations")
async def create_conversation(agent_id: str, req: ConversationCreateRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    conv_id = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO agent_conversations (id, agent_id, user_id, title) VALUES (:id, :aid, :uid, :title)"),
        {"id": conv_id, "aid": agent_id, "uid": user["id"], "title": req.title},
    )
    result = await db.execute(text("SELECT * FROM agent_conversations WHERE id = :id"), {"id": conv_id})
    return {"conversation": dict(result.mappings().first())}


@router.delete("/{agent_id}/conversations/{conv_id}")
async def delete_conversation(agent_id: str, conv_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        text("DELETE FROM agent_conversations WHERE id = :cid AND agent_id = :aid AND user_id = :uid"),
        {"cid": conv_id, "aid": agent_id, "uid": user["id"]},
    )
    return {"message": "Conversation deleted"}


# ====== MESSAGES ======
@router.get("/{agent_id}/conversations/{conv_id}/messages")
async def get_messages(agent_id: str, conv_id: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM agent_messages WHERE conversation_id = :cid ORDER BY created_at ASC"),
        {"cid": conv_id},
    )
    return {"messages": [dict(r) for r in result.mappings().all()]}


@router.post("/{agent_id}/conversations/{conv_id}/messages")
async def send_message(agent_id: str, conv_id: str, req: AgentMessageSendRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    content = (req.content or "").strip()
    if not content:
        raise HTTPException(400, "Message content is required")

    # Verify both the agent and conversation belong to the current user. System
    # agents are readable/chat-able, but conversations remain user-owned.
    agent_result = await db.execute(
        text("SELECT id, name, role, instructions FROM user_agents WHERE id = :aid AND (user_id = :uid OR user_id = 'system') AND is_active = 1"),
        {"aid": agent_id, "uid": user["id"]},
    )
    agent_row = agent_result.mappings().first()
    if not agent_row:
        raise HTTPException(404, "Agent not found or unavailable")

    conversation_result = await db.execute(
        text("SELECT id FROM agent_conversations WHERE id = :cid AND agent_id = :aid AND user_id = :uid"),
        {"cid": conv_id, "aid": agent_id, "uid": user["id"]},
    )
    if not conversation_result.mappings().first():
        raise HTTPException(404, "Conversation not found")

    # Keep the full conversation in the same format used by /api/ai/chat.
    history_result = await db.execute(
        text("SELECT role, content FROM agent_messages WHERE conversation_id = :cid ORDER BY created_at ASC"),
        {"cid": conv_id},
    )
    messages = [{"role": "system", "content": _build_system_prompt(dict(agent_row))}]
    for row in history_result.mappings().all():
        messages.append({
            "role": "assistant" if row["role"] == "agent" else row["role"],
            "content": row["content"],
        })
    messages.append({"role": "user", "content": content})

    # Generate before writing so a provider failure does not leave a dangling
    # user message that has no corresponding AI response.
    response = await _call_nvidia(messages)
    response_text = (response or "").strip() or "I could not generate a response. Please try again."

    metadata = dict(req.metadata or {})
    if req.files:
        metadata["files"] = req.files
    metadata_text = json.dumps(metadata, ensure_ascii=False)

    user_message_id = str(uuid.uuid4())
    agent_message_id = str(uuid.uuid4())
    await db.execute(
        text("INSERT INTO agent_messages (id, conversation_id, role, content, metadata) VALUES (:id, :cid, 'user', :content, :meta)"),
        {"id": user_message_id, "cid": conv_id, "content": content, "meta": metadata_text},
    )
    await db.execute(
        text("INSERT INTO agent_messages (id, conversation_id, role, content, metadata) VALUES (:id, :cid, 'agent', :content, :meta)"),
        {"id": agent_message_id, "cid": conv_id, "content": response_text, "meta": "{}"},
    )
    await db.execute(text("UPDATE agent_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": conv_id})

    user_result = await db.execute(text("SELECT * FROM agent_messages WHERE id = :id"), {"id": user_message_id})
    agent_result = await db.execute(text("SELECT * FROM agent_messages WHERE id = :id"), {"id": agent_message_id})
    return {
        "userMessage": dict(user_result.mappings().first()),
        "agentMessage": dict(agent_result.mappings().first()),
    }


@router.post("/upload")
async def upload_agent_file(user: dict = Depends(get_current_user)):
    # Simple file upload stub - returns placeholder
    return {"url": "base64_placeholder", "name": "file"}
