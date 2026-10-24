"""
Application configuration.

All settings are sourced from environment variables (.env) via pydantic-settings.
This is the single source of truth for runtime config across the app.
"""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── App ──
    PROJECT_NAME: str = "CrimeSense AI"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # ── Database ──
    DATABASE_URL: str = (
        "postgresql+psycopg://crimesense:crimesense@localhost:5432/crimesense"
    )
    # Enable PostGIS geometry columns. When False, the app runs on stock
    # PostgreSQL using plain lat/lon float columns (no feature loss — every
    # map/hotspot query uses lat/lon). Set True on a PostGIS-enabled database.
    USE_POSTGIS: bool = False

    # ── Security ──
    SECRET_KEY: str = "CHANGE_ME"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # ── AI: GROQ (OpenAI gpt-oss-120b; Llama 3.3 was retired by GROQ) ──
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # ── OCR ──
    TESSERACT_CMD: str = ""
    POPPLER_PATH: str = ""

    # ── Data / seed ──
    DATA_CACHE_PATH: str = "../data/nagpur_crime_cache.json"
    SEED_SAMPLE_SIZE: int = 8000

    # ── Case files / evidence attachments ──
    UPLOAD_DIR: str = "uploads"          # relative to backend/ unless absolute
    MAX_UPLOAD_MB: int = 25

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @field_validator("SECRET_KEY")
    @classmethod
    def _warn_default_secret(cls, v: str) -> str:
        return v


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor — instantiated once per process."""
    return Settings()


settings = get_settings()
