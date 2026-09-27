import asyncio
import hashlib
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.auth import get_current_user_id
from app.chunking import chunk_text, extract_text
from app.db import acquire
from app.embeddings import embed_documents
from app.schemas import DocumentOut
from app.workspaces import assert_workspace_access

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspaces/{workspace_id}/documents", tags=["documents"])

ALLOWED_EXTENSIONS = (".txt", ".md", ".pdf")
MAX_FILE_BYTES = 15 * 1024 * 1024


@router.get("", response_model=list[DocumentOut])
async def list_documents(workspace_id: uuid.UUID, user_id: str = Depends(get_current_user_id)):
    async with acquire() as conn:
        await assert_workspace_access(conn, user_id, str(workspace_id))
        rows = await conn.fetch(
            """
            SELECT id, filename, status, error_message, created_at
            FROM documents WHERE workspace_id = $1
            ORDER BY created_at DESC
            """,
            str(workspace_id),
        )
        return [dict(r) for r in rows]


@router.post("", response_model=DocumentOut, status_code=201)
async def upload_document(
    workspace_id: uuid.UUID,
    file: UploadFile,
    user_id: str = Depends(get_current_user_id),
):
    if not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {ALLOWED_EXTENSIONS}")

    raw = await file.read()
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 15MB)")
    if not raw:
        raise HTTPException(status_code=400, detail="File is empty")

    content_hash = hashlib.sha256(raw).hexdigest()

    async with acquire() as conn:
        await assert_workspace_access(conn, user_id, str(workspace_id))

        existing = await conn.fetchrow(
            """
            SELECT id, filename, status, error_message, created_at
            FROM documents WHERE workspace_id = $1 AND content_hash = $2
            """,
            str(workspace_id),
            content_hash,
        )
        if existing is not None:
            # Idempotent re-upload: same bytes already ingested into this workspace.
            return dict(existing)

        doc_row = await conn.fetchrow(
            """
            INSERT INTO documents (workspace_id, filename, content_hash, status)
            VALUES ($1, $2, $3, 'processing')
            RETURNING id, filename, status, error_message, created_at
            """,
            str(workspace_id),
            file.filename,
            content_hash,
        )
        document_id = doc_row["id"]

        try:
            text = extract_text(file.filename, raw)
            pieces = chunk_text(text)
            if not pieces:
                raise ValueError("No extractable text found in this file.")

            vectors = await asyncio.to_thread(embed_documents, pieces)

            async with conn.transaction():
                for idx, (piece, vector) in enumerate(zip(pieces, vectors)):
                    await conn.execute(
                        """
                        INSERT INTO chunks (workspace_id, document_id, chunk_index, content, embedding)
                        VALUES ($1, $2, $3, $4, $5)
                        """,
                        str(workspace_id),
                        document_id,
                        idx,
                        piece,
                        vector,
                    )
                await conn.execute(
                    "UPDATE documents SET status = 'ready' WHERE id = $1",
                    document_id,
                )
            final_status, error_message = "ready", None
        except Exception as exc:  # noqa: BLE001 - ingestion failures must not crash the request
            logger.exception("Ingestion failed for document %s", document_id)
            error_message = str(exc)
            final_status = "error"
            await conn.execute(
                "UPDATE documents SET status = 'error', error_message = $2 WHERE id = $1",
                document_id,
                error_message,
            )

        return {
            "id": document_id,
            "filename": doc_row["filename"],
            "status": final_status,
            "error_message": error_message,
            "created_at": doc_row["created_at"],
        }
