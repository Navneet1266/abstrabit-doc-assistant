import asyncpg
from pydantic import BaseModel, Field


class SaveTaskArgs(BaseModel):
    title: str = Field(min_length=1, max_length=300, description="Short task title")
    description: str = Field(default="", max_length=2000, description="Optional extra detail")


async def run_save_task(conn: asyncpg.Connection, workspace_id: str, args: BaseModel) -> dict:
    assert isinstance(args, SaveTaskArgs)
    row = await conn.fetchrow(
        """
        INSERT INTO tasks (workspace_id, title, description)
        VALUES ($1, $2, $3)
        RETURNING id, title, description, status, created_at
        """,
        workspace_id,
        args.title,
        args.description,
    )
    return {
        "task_id": str(row["id"]),
        "title": row["title"],
        "status": row["status"],
    }
