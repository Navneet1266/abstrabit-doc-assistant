"""Gemini embeddings for both document chunks (RETRIEVAL_DOCUMENT) and
queries (RETRIEVAL_QUERY) - Gemini's embedding model is asymmetric and gives
better retrieval quality when each side is tagged with its task type."""

from google.genai import types

from app.config import get_settings
from app.gemini_client import get_client as _get_client


def embed_documents(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    settings = get_settings()
    client = _get_client()
    response = client.models.embed_content(
        model=settings.gemini_embedding_model,
        contents=texts,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=settings.embedding_dimensions,
        ),
    )
    return [e.values for e in response.embeddings]


def embed_query(text: str) -> list[float]:
    settings = get_settings()
    client = _get_client()
    response = client.models.embed_content(
        model=settings.gemini_embedding_model,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=settings.embedding_dimensions,
        ),
    )
    return response.embeddings[0].values
