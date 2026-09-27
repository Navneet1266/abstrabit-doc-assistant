import asyncpg
import httpx
from pydantic import BaseModel, Field

from app.config import get_settings


class NotifyDiscordArgs(BaseModel):
    summary: str = Field(min_length=1, max_length=1800, description="Short message to post to Discord")


async def run_notify_discord(conn: asyncpg.Connection, workspace_id: str, args: BaseModel) -> dict:
    assert isinstance(args, NotifyDiscordArgs)
    webhook_url = get_settings().discord_webhook_url
    if not webhook_url:
        # Not configured: fail cleanly, don't crash the chat turn.
        return {"sent": False, "reason": "No Discord webhook configured for this deployment."}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(webhook_url, json={"content": args.summary})
    if resp.status_code >= 300:
        return {"sent": False, "reason": f"Discord webhook returned HTTP {resp.status_code}"}
    return {"sent": True}
