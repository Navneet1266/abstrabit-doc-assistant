import uuid

from fastapi import APIRouter, Depends

from app.auth import get_current_user_id
from app.db import acquire
from app.schemas import ToolCallOut
from app.workspaces import assert_workspace_access

router = APIRouter(prefix="/workspaces/{workspace_id}/tool-calls", tags=["tool-calls"])


@router.get("", response_model=list[ToolCallOut])
async def list_tool_calls(workspace_id: uuid.UUID, user_id: str = Depends(get_current_user_id)):
    async with acquire() as conn:
        await assert_workspace_access(conn, user_id, str(workspace_id))
        rows = await conn.fetch(
            """
            SELECT id, tool_name, arguments, result, status, error_message, created_at
            FROM tool_calls WHERE workspace_id = $1
            ORDER BY created_at DESC
            """,
            str(workspace_id),
        )
        return [dict(r) for r in rows]
