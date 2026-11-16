"""Settings, read once from backend/matching/.env and the environment."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

HERE = Path(__file__).parent


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_secret_key: str
    gemini_api_key: str
    cors_origins: list[str]
    chroma_dir: str
    refresh_seconds: int

    @classmethod
    def from_env(cls) -> Settings:
        load_dotenv(HERE / ".env")
        missing = [
            name
            for name in ("SUPABASE_URL", "SUPABASE_SECRET_KEY", "GEMINI_API_KEY")
            if not os.getenv(name)
        ]
        if missing:
            raise RuntimeError(f"Missing in backend/matching/.env: {', '.join(missing)}")
        return cls(
            supabase_url=os.environ["SUPABASE_URL"].rstrip("/"),
            supabase_secret_key=os.environ["SUPABASE_SECRET_KEY"],
            gemini_api_key=os.environ["GEMINI_API_KEY"],
            cors_origins=[
                o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
            ],
            chroma_dir=os.getenv("CHROMA_DIR", str(HERE / "chroma_data")),
            refresh_seconds=int(os.getenv("REFRESH_SECONDS", "300")),
        )
