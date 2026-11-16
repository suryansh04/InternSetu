"""InternSetu matching API (FastAPI)."""

from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from matching import GeminiEmbedder, MatchIndex, fetch_internships

load_dotenv(Path(__file__).with_name(".env"))
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("matching")


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} is not set in backend/matching/.env")
    return value


SUPABASE_URL = require_env("SUPABASE_URL").rstrip("/")
SUPABASE_SECRET_KEY = require_env("SUPABASE_SECRET_KEY")
GEMINI_API_KEY = require_env("GEMINI_API_KEY")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
PERSIST_DIR = os.getenv("CHROMA_DIR", str(Path(__file__).with_name("chroma_data")))


class Profile(BaseModel):
    skills: list[str] = Field(default_factory=list, max_length=100)
    interests: list[str] = Field(default_factory=list, max_length=50)
    location: str | None = Field(default=None, max_length=120)
    duration_months: int | None = Field(default=None, ge=1, le=24)


class AppState:
    index: MatchIndex | None = None


state = AppState()


@asynccontextmanager
async def lifespan(_: FastAPI):
    def build() -> MatchIndex:
        internships = fetch_internships(SUPABASE_URL, SUPABASE_SECRET_KEY)
        log.info("Loaded %d internships from Supabase", len(internships))
        return MatchIndex.build(internships, GeminiEmbedder(GEMINI_API_KEY), PERSIST_DIR)

    state.index = await run_in_threadpool(build)
    log.info("Match index ready")
    yield


app = FastAPI(title="InternSetu matching API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


# ---------------------------------------------------------------------------
# Auth: only signed-in users may run matches (each one costs an embedding call)
# ---------------------------------------------------------------------------
_token_cache: dict[str, float] = {}
TOKEN_CACHE_SECONDS = 300


def _verify_with_supabase(token: str) -> bool:
    resp = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"apikey": SUPABASE_SECRET_KEY, "Authorization": f"Bearer {token}"},
        timeout=10,
    )
    return resp.status_code == 200


async def require_user(authorization: str = Header(default="")) -> None:
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(401, "Sign in to see matches.")
    now = time.monotonic()
    if _token_cache.get(token, 0) > now:
        return
    if not await run_in_threadpool(_verify_with_supabase, token):
        raise HTTPException(401, "Your session has expired. Please sign in again.")
    if len(_token_cache) > 10_000:
        _token_cache.clear()
    _token_cache[token] = now + TOKEN_CACHE_SECONDS


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health() -> dict:
    count = len(state.index.internships) if state.index else 0
    return {"status": "ok" if state.index else "starting", "internships": count}


@app.post("/match", dependencies=[Depends(require_user)])
async def match(profile: Profile) -> dict:
    if state.index is None:
        raise HTTPException(503, "The match index is still loading. Try again shortly.")
    matches = await run_in_threadpool(state.index.match, profile.model_dump(), 10)
    return {"matches": matches, "count": len(matches)}
