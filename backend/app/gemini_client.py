"""A single shared Gemini client for the whole process.

Constructing a fresh `genai.Client` per call and letting the old one get
garbage-collected causes intermittent "Cannot send a request, as the client
has been closed" errors under load - the SDK's underlying httpx client isn't
meant to be churned like that. One long-lived client, reused everywhere.
"""

from google import genai

from app.config import get_settings

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=get_settings().gemini_api_key)
    return _client
