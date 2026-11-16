"""InternSetu matching API (FastAPI)."""

from __future__ import annotations

import asyncio
import logging
import os
from contextlib import asynccontextmanager, suppress
from pathlib import Path

import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
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
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
PERSIST_DIR = os.getenv("CHROMA_DIR", str(Path(__file__).with_name("chroma_data")))
REFRESH_SECONDS = int(os.getenv("REFRESH_SECONDS", "300"))


class Profile(BaseModel):
    skills: list[str] = Field(default_factory=list, max_length=100)
    interests: list[str] = Field(default_factory=list, max_length=50)
    location: str | None = Field(default=None, max_length=120)
    duration_months: int | None = Field(default=None, ge=1, le=24)


index = MatchIndex(GeminiEmbedder(GEMINI_API_KEY), PERSIST_DIR)


def refresh_index() -> None:
    stats = index.refresh(fetch_internships(SUPABASE_URL, SUPABASE_SECRET_KEY))
    log.info("Index synced: %(total)d internships, %(embedded)d embedded, %(removed)d removed", stats)


async def keep_index_fresh() -> None:
    """New or edited listings become matchable within REFRESH_SECONDS, without a restart."""
    while True:
        await asyncio.sleep(REFRESH_SECONDS)
        try:
            await run_in_threadpool(refresh_index)
        except Exception:  # keep serving the last good snapshot
            log.exception("Index refresh failed")


@asynccontextmanager
async def lifespan(_: FastAPI):
    await run_in_threadpool(refresh_index)
    task = asyncio.create_task(keep_index_fresh())
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


app = FastAPI(title="InternSetu matching API", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=3600,  # let browsers cache the preflight instead of sending it before every match
)


# ---------------------------------------------------------------------------
# Auth: Supabase signs access tokens with an asymmetric key, so they are
# verified locally against its published keys: no network call per request.
# ---------------------------------------------------------------------------
_jwks = jwt.PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json", cache_keys=True, lifespan=3600)


def _verify(token: str) -> dict:
    key = _jwks.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        key.key,
        algorithms=["ES256", "RS256"],
        audience="authenticated",
        issuer=f"{SUPABASE_URL}/auth/v1",
    )


async def require_user(authorization: str = Header(default="")) -> str:
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(401, "Sign in to see matches.")
    try:
        # Usually instant (cached key); only the first call fetches the key set.
        claims = await run_in_threadpool(_verify, token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Your session has expired. Please sign in again.")
    except (jwt.PyJWTError, jwt.PyJWKClientError):
        raise HTTPException(401, "Please sign in again.")
    return claims["sub"]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health() -> dict:
    return {"status": "ok", "internships": len(index.snapshot)}


@app.post("/match", dependencies=[Depends(require_user)])
async def match(profile: Profile) -> dict:
    matches = await run_in_threadpool(index.match, profile.model_dump(), 10)
    return {"matches": matches, "count": len(matches)}
