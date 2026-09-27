import asyncio
import logging
import uuid

import asyncpg
from fastapi import APIRouter, Depends

from app.auth import get_current_user_id
from app.config import get_settings
from app.db import acquire
from app.embeddings import embed_query
from app.llm import run_chat_turn
from app.retrieval import retrieve_chunks
from app.schemas import ChatMessageOut, ChatRequest, ChatResponse
from app.workspaces import assert_workspace_access

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspaces/{workspace_id}/chat", tags=["chat"])


async def _get_or_create_session(conn: asyncpg.Connection, workspace_id: str) -> str:
    row = await conn.fetchrow(
        "SELECT id FROM chat_sessions WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 1",
        workspace_id,
    )
    if row is not None:
        return str(row["id"])
    row = await conn.fetchrow(
        "INSERT INTO chat_sessions (workspace_id) VALUES ($1) RETURNING id",
        workspace_id,
    )
    return str(row["id"])


@router.get("/messages", response_model=list[ChatMessageOut])
async def list_messages(workspace_id: uuid.UUID, user_id: str = Depends(get_current_user_id)):
    async with acquire() as conn:
        await assert_workspace_access(conn, user_id, str(workspace_id))
        rows = await conn.fetch(
            """
            SELECT id, role, content, citations, retrieved_chunks, created_at
            FROM chat_messages
            WHERE workspace_id = $1
            ORDER BY created_at ASC
            """,
            str(workspace_id),
        )
        return [dict(r) for r in rows]


@router.post("", response_model=ChatResponse)
async def send_message(
    workspace_id: uuid.UUID,
    body: ChatRequest,
    user_id: str = Depends(get_current_user_id),
):
    settings = get_settings()
    async with acquire() as conn:
        await assert_workspace_access(conn, user_id, str(workspace_id))
        session_id = str(body.session_id) if body.session_id else await _get_or_create_session(conn, str(workspace_id))

        # Persist the user's message immediately so it is never lost even if
        # the downstream LLM call is slow or fails.
        await conn.execute(
            """
            INSERT INTO chat_messages (session_id, workspace_id, role, content)
            VALUES ($1, $2, 'user', $3)
            """,
            session_id,
            str(workspace_id),
            body.message,
        )

        try:
            query_vector = await asyncio.to_thread(embed_query, body.message)
            retrieved = await retrieve_chunks(conn, str(workspace_id), query_vector, settings.retrieval_top_k)
            result = await run_chat_turn(conn, str(workspace_id), session_id, body.message, retrieved)
            answer_text = result["answer"]
            citations = result["citations"]
            tool_call_records = result["tool_calls"]
            retrieved_summary = [
                {
                    "document_id": str(c["document_id"]),
                    "filename": c["filename"],
                    "chunk_index": c["chunk_index"],
                    "score": float(c["score"]),
                    "content_preview": c["content"][:200],
                }
                for c in retrieved
            ]
        except Exception:  # noqa: BLE001 - never lose the user's turn on an LLM/infra hiccup
            logger.exception("Chat turn failed for workspace %s", workspace_id)
            answer_text = (
                "Sorry, I hit an error trying to answer that (the model call failed). "
                "Your message was saved - please try asking again."
            )
            citations = []
            tool_call_records = []
            retrieved_summary = []

        assistant_row = await conn.fetchrow(
            """
            INSERT INTO chat_messages (session_id, workspace_id, role, content, citations, retrieved_chunks)
            VALUES ($1, $2, 'assistant', $3, $4::jsonb, $5::jsonb)
            RETURNING id, role, content, citations, retrieved_chunks, created_at
            """,
            session_id,
            str(workspace_id),
            answer_text,
            citations,
            retrieved_summary,
        )

        logged_tool_calls = []
        for record in tool_call_records:
            tc_row = await conn.fetchrow(
                """
                INSERT INTO tool_calls (workspace_id, session_id, message_id, tool_name, arguments, result, status, error_message)
                VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
                RETURNING id, tool_name, arguments, result, status, error_message, created_at
                """,
                str(workspace_id),
                session_id,
                assistant_row["id"],
                record["tool_name"],
                record["arguments"],
                record["result"],
                record["status"],
                record.get("error_message"),
            )
            logged_tool_calls.append(dict(tc_row))

        return {
            "session_id": session_id,
            "message": dict(assistant_row),
            "tool_calls": logged_tool_calls,
        }
