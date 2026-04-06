from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = Field(default="AI Conversational Python Backend", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_reload: bool = Field(default=False, alias="APP_RELOAD")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")
    frontend_urls: str = Field(default="http://localhost:3000,http://127.0.0.1:3000", alias="FRONTEND_URLS")
    force_https: bool = Field(default=False, alias="FORCE_HTTPS")
    trusted_hosts: str = Field(default="localhost,127.0.0.1", alias="TRUSTED_HOSTS")
    logs_root: str = Field(default="logs", alias="LOGS_ROOT")

    db_host: str = Field(default="localhost", alias="DB_HOST")
    db_port: int = Field(default=5432, alias="DB_PORT")
    db_user: str = Field(default="postgres", alias="DB_USER")
    db_password: str = Field(default="", alias="DB_PASSWORD")
    db_name: str = Field(default="EVENT_MANAGEMENT_SYSTEM", alias="DB_NAME")

    jwt_secret: str = Field(default="change_this_secret", alias="JWT_SECRET")
    jwt_expiration: str = Field(default="7d", alias="JWT_EXPIRATION")

    llm_provider: str = Field(default="openrouter", alias="LLM_PROVIDER")
    llm_api_key: str = Field(default="", alias="LLM_API_KEY")
    llm_model: str = Field(default="openrouter/auto", alias="LLM_MODEL")
    llm_temperature: float = Field(default=0.4, alias="LLM_TEMPERATURE")
    llm_timeout_ms: int = Field(default=30000, alias="LLM_TIMEOUT_MS")

    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")
    openrouter_model: str = Field(default="openrouter/auto", alias="OPENROUTER_MODEL")
    openrouter_api_url: str = Field(default="https://openrouter.ai/api/v1/chat/completions", alias="OPENROUTER_API_URL")
    openrouter_timeout_ms: int = Field(default=30000, alias="OPENROUTER_TIMEOUT_MS")

    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_model: str = Field(default="llama-3.3-70b-versatile", alias="GROQ_MODEL")
    groq_api_url: str = Field(default="https://api.groq.com/openai/v1/chat/completions", alias="GROQ_API_URL")
    groq_timeout_ms: int = Field(default=30000, alias="GROQ_TIMEOUT_MS")

    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")
    gemini_timeout_ms: int = Field(default=30000, alias="GEMINI_TIMEOUT_MS")

    @property
    def cors_origins(self) -> list[str]:
        values = [self.frontend_url, *[item.strip() for item in self.frontend_urls.split(",") if item.strip()]]
        seen: list[str] = []
        for value in values:
            if value and value not in seen:
                seen.append(value)
        return seen

    @property
    def trusted_host_list(self) -> list[str]:
        return [item.strip() for item in self.trusted_hosts.split(",") if item.strip()]

    @property
    def postgres_dsn(self) -> str:
        return (
            f"host={self.db_host} "
            f"port={self.db_port} "
            f"dbname={self.db_name} "
            f"user={self.db_user} "
            f"password={self.db_password}"
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
