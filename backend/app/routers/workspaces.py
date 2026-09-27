from fastapi import APIRouter, Depends

from app.auth import get_current_user_id
from app.db import acquire
from app.schemas import WorkspaceCreate, WorkspaceOut

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceOut])
async def list_workspaces(user_id: str = Depends(get_current_user_id)):
    async with acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, created_at FROM workspaces WHERE owner_id = $1 ORDER BY created_at ASC",
            user_id,
        )
        return [dict(r) for r in rows]


@router.post("", response_model=WorkspaceOut, status_code=201)
async def create_workspace(body: WorkspaceCreate, user_id: str = Depends(get_current_user_id)):
    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO workspaces (owner_id, name)
            VALUES ($1, $2)
            RETURNING id, name, created_at
            """,
            user_id,
            body.name,
        )
        return dict(row)
