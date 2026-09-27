"""Authenticates requests by validating the Supabase-issued bearer JWT.

Rather than decoding the JWT ourselves (which requires knowing whether a given
Supabase project signs with HS256 + a shared secret or an asymmetric algorithm
behind a JWKS endpoint), we hand the token to Supabase's own `/auth/v1/user`
endpoint and let it tell us whether the token is valid and who it belongs to.
This is one extra network round trip per request, which we cut down on with a
short-lived in-memory cache since access tokens are opaque and stable for
their lifetime.
"""

import httpx
from cachetools import TTLCache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings

_bearer = HTTPBearer(auto_error=False)

# token -> (user_id, expires_at_monotonic). 60s TTL keeps us honest about
# revocation/expiry without hitting Supabase on every single request.
_token_cache: TTLCache = TTLCache(maxsize=2048, ttl=60)


async def _fetch_user_id(token: str) -> str:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key,
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    data = resp.json()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return user_id


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = credentials.credentials
    cached = _token_cache.get(token)
    if cached is not None:
        return cached

    user_id = await _fetch_user_id(token)
    _token_cache[token] = user_id
    return user_id
