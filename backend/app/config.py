from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres (Supabase connection string, or local docker-compose instance)
    database_url: str

    # Supabase project, used only to validate incoming user JWTs
    supabase_url: str
    supabase_anon_key: str

    # Gemini (Google AI Studio) - chat/tool-calling + embeddings
    gemini_api_key: str
    gemini_chat_model: str = "gemini-flash-lite-latest"
    gemini_embedding_model: str = "gemini-embedding-001"
    embedding_dimensions: int = 768

    # Discord incoming webhook used by the notify_discord tool. Optional -
    # if unset, the tool returns a clear error instead of crashing.
    discord_webhook_url: str | None = None

    # CORS - the deployed frontend origin(s), comma separated
    cors_allowed_origins: str = "http://localhost:5173"

    # Retrieval / chat loop tuning
    retrieval_top_k: int = 6
    max_tool_rounds: int = 3

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
