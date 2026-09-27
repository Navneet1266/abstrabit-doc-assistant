"""The tenancy gate.

Every router handler that touches workspace-scoped data must call
`assert_workspace_access` first and then thread the *validated* workspace_id
into every subsequent query's WHERE clause. This module is the single place
that decides "does this user own this workspace" - nothing downstream
re-derives that decision from user input.
"""

import asyncpg
from fastapi import HTTPException, status


async def assert_workspace_access(conn: asyncpg.Connection, user_id: str, workspace_id: str) -> None:
    owner_id = await conn.fetchval(
        "SELECT owner_id FROM workspaces WHERE id = $1",
        workspace_id,
    )
    if owner_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    if str(owner_id) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your workspace")
