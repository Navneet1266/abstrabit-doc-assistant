import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class WorkspaceOut(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime


class DocumentOut(BaseModel):
    id: uuid.UUID
    filename: str
    status: str
    error_message: str | None = None
    created_at: datetime


class TaskOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    status: str
    created_at: datetime


class ToolCallOut(BaseModel):
    id: uuid.UUID
    tool_name: str
    arguments: dict
    result: dict
    status: str
    error_message: str | None = None
    created_at: datetime


class Citation(BaseModel):
    marker: int
    document_id: uuid.UUID
    filename: str
    chunk_index: int


class RetrievedChunk(BaseModel):
    document_id: uuid.UUID
    filename: str
    chunk_index: int
    score: float
    content_preview: str


class ChatMessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    citations: list[Citation] = []
    retrieved_chunks: list[RetrievedChunk] = []
    created_at: datetime


class ChatRequest(BaseModel):
    session_id: uuid.UUID | None = None
    message: str = Field(min_length=1, max_length=8000)


class ChatResponse(BaseModel):
    session_id: uuid.UUID
    message: ChatMessageOut
    tool_calls: list[ToolCallOut] = []
