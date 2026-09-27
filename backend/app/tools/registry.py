"""Tool registry: the only tools the model is ever offered, each with a
strict pydantic schema for its arguments. This is the safety boundary for
tool execution - a call is only ever run if its name is in TOOLS and its
arguments validate against that tool's schema. Everything else (unknown tool
name, malformed/missing arguments) is turned into a structured error that is
handed back to the model, never executed.

Deliberately no destructive tools are defined here (no delete/overwrite of
any kind) - this bounds the blast radius of a prompt-injection attempt from
inside a retrieved document to "at most, an extra saved task or Discord
message," never data loss.
"""

from dataclasses import dataclass
from typing import Any, Awaitable, Callable

import asyncpg
from pydantic import BaseModel, ValidationError

from app.tools.notify_discord import NotifyDiscordArgs, run_notify_discord
from app.tools.save_task import SaveTaskArgs, run_save_task


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    args_model: type[BaseModel]
    handler: Callable[[asyncpg.Connection, str, BaseModel], Awaitable[dict]]


TOOLS: dict[str, ToolSpec] = {
    "save_task": ToolSpec(
        name="save_task",
        description=(
            "Save a follow-up task/to-do into the current workspace so it shows up "
            "on the dashboard. Use this when the user asks you to remember, track, "
            "or follow up on something."
        ),
        args_model=SaveTaskArgs,
        handler=run_save_task,
    ),
    "notify_discord": ToolSpec(
        name="notify_discord",
        description=(
            "Send a short summary message to the workspace's Discord channel via "
            "webhook. Use this when the user explicitly asks you to notify, post, "
            "or send a summary somewhere."
        ),
        args_model=NotifyDiscordArgs,
        handler=run_notify_discord,
    ),
}


def function_declarations() -> list[dict]:
    """Gemini FunctionDeclaration dicts, built from each tool's pydantic schema."""
    declarations = []
    for tool in TOOLS.values():
        schema = tool.args_model.model_json_schema()
        schema.pop("title", None)
        declarations.append(
            {
                "name": tool.name,
                "description": tool.description,
                "parameters_json_schema": schema,
            }
        )
    return declarations


class ToolValidationError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def validate_tool_call(name: str, raw_args: dict[str, Any]) -> BaseModel:
    """Raises ToolValidationError for an unknown tool or invalid arguments;
    never raises for anything else, so callers can safely turn this into a
    structured (non-crashing) error response to the model."""
    tool = TOOLS.get(name)
    if tool is None:
        raise ToolValidationError(f"Unknown tool '{name}'. No such tool is available.")
    try:
        return tool.args_model.model_validate(raw_args or {})
    except ValidationError as exc:
        raise ToolValidationError(f"Invalid arguments for '{name}': {exc.errors()}")
