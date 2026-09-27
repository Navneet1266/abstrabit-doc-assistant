"""Vector retrieval, scoped to a single workspace inside the query itself.

The workspace_id predicate is part of the same SQL statement that does the
vector ORDER BY - it is never applied as a filter on an already-fetched,
unscoped result set. That is what makes cross-workspace leakage structurally
impossible here, not just unlikely.
"""

import asyncpg


async def retrieve_chunks(
    conn: asyncpg.Connection,
    workspace_id: str,
    query_embedding: list[float],
    top_k: int,
) -> list[dict]:
    rows = await conn.fetch(
        """
        SELECT
            c.id AS chunk_id,
            c.document_id,
            c.chunk_index,
            c.content,
            d.filename,
            1 - (c.embedding <=> $2) AS score
        FROM chunks c
        JOIN documents d ON d.id = c.document_id
        WHERE c.workspace_id = $1
        ORDER BY c.embedding <=> $2
        LIMIT $3
        """,
        workspace_id,
        query_embedding,
        top_k,
    )
    return [dict(r) for r in rows]
