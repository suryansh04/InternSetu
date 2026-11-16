"""InternSetu matching API (FastAPI).

Run with `uvicorn main:build_app --factory`. `create_app` takes every
dependency as an argument, so tests build the real app around fakes.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager, suppress
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field

from auth import InvalidTokenError, TokenVerifier, supabase_verifier
from config import Settings
from embeddings import GeminiEmbedder
from index import MatchIndex
from scoring import Internship, MatchResult
from sources import fetch_internships

log = logging.getLogger("matching")


class Profile(BaseModel):
    skills: list[str] = Field(default_factory=list, max_length=100)
    interests: list[str] = Field(default_factory=list, max_length=50)
    location: str | None = Field(default=None, max_length=120)
    duration_months: int | None = Field(default=None, ge=1, le=24)


def create_app(
    *,
    index: MatchIndex,
    load_internships: Callable[[], list[Internship]],
    verify_token: TokenVerifier,
    cors_origins: list[str],
    refresh_seconds: int = 300,
) -> FastAPI:
    def sync() -> None:
        stats = index.sync(load_internships())
        log.info(
            "Index synced: %d internships, %d embedded, %d removed",
            stats.total,
            stats.embedded,
            stats.removed,
        )

    async def keep_fresh() -> None:
        """New or edited listings become matchable within `refresh_seconds`."""
        while True:
            await asyncio.sleep(refresh_seconds)
            try:
                await run_in_threadpool(sync)
            except Exception:  # keep serving the last good snapshot
                log.exception("Index sync failed")

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        await run_in_threadpool(sync)
        task = asyncio.create_task(keep_fresh())
        yield
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task

    app = FastAPI(title="InternSetu matching API", lifespan=lifespan)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
        max_age=3600,  # browsers cache the preflight instead of repeating it
    )

    async def current_user(authorization: Annotated[str, Header()] = "") -> str:
        token = authorization.removeprefix("Bearer ").strip()
        if not token:
            raise HTTPException(401, "Sign in to see matches.")
        try:
            return await run_in_threadpool(verify_token, token)
        except InvalidTokenError as err:
            raise HTTPException(401, str(err)) from err

    @app.get("/health")
    def health() -> dict[str, Any]:
        return {"status": "ok", "internships": len(index.snapshot)}

    # Declared in the decorator: `current_user` is a closure, which annotation-based
    # injection cannot resolve when annotations are postponed.
    @app.post("/match", dependencies=[Depends(current_user)])
    async def match(profile: Profile) -> dict[str, Any]:
        matches: list[MatchResult] = await run_in_threadpool(index.match, profile.model_dump(), 10)
        return {"matches": matches, "count": len(matches)}

    return app


def build_app() -> FastAPI:
    """The real app, wired to Supabase and Gemini from settings in the environment."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    settings = Settings.from_env()
    return create_app(
        index=MatchIndex(GeminiEmbedder(settings.gemini_api_key), settings.chroma_dir),
        load_internships=lambda: fetch_internships(
            settings.supabase_url, settings.supabase_secret_key
        ),
        verify_token=supabase_verifier(settings.supabase_url),
        cors_origins=settings.cors_origins,
        refresh_seconds=settings.refresh_seconds,
    )
