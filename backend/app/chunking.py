"""Text extraction + a simple paragraph-aware chunker with overlap."""

import io

from pypdf import PdfReader

CHUNK_SIZE = 1000  # target characters per chunk
CHUNK_OVERLAP = 150


def extract_text(filename: str, raw: bytes) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(raw))
        return "\n\n".join(page.extract_text() or "" for page in reader.pages)
    # txt / md / anything else: treat as UTF-8 text
    return raw.decode("utf-8", errors="replace")


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Splits on paragraph boundaries where possible, packing paragraphs into
    ~chunk_size windows with a trailing overlap carried into the next chunk so
    context isn't lost at a boundary. Falls back to hard character slicing for
    single paragraphs longer than chunk_size."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        return []

    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        candidate = f"{current}\n\n{para}" if current else para
        if len(candidate) <= chunk_size:
            current = candidate
            continue

        if current:
            chunks.append(current)
            tail = current[-overlap:] if overlap < len(current) else current
            current = tail
            candidate = f"{current}\n\n{para}" if current else para

        if len(para) <= chunk_size:
            current = candidate if len(candidate) <= chunk_size else para
        else:
            # Single paragraph longer than chunk_size: hard-slice it.
            start = 0
            while start < len(para):
                end = start + chunk_size
                chunks.append(para[start:end])
                start = end - overlap if end - overlap > start else end
            current = ""

    if current:
        chunks.append(current)

    return chunks
