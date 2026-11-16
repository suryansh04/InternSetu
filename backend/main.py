# main.py
import asyncio
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from func import (
    fetch_internships,
    build_vectorstore_from_internships,
    match_profile_to_internships,
    get_embeddings,
)

app = FastAPI(title="Internship Matching API")

# Allow React dev server origins (adjust for your setup)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globals to reuse across requests
_VECTORSTORE = None
_INTERNSHIPS = []
_PERSIST_DIR = "chroma_persist"  # change if you want different path

class Profile(BaseModel):
    name: Optional[str] = None
    skills: List[str] = []
    location: Optional[str] = None
    duration_months: Optional[int] = None
    interests: Optional[str] = None


@app.on_event("startup")
async def startup_event():
    """Initialize embeddings & vectorstore at startup.
    - create embeddings client on main event loop (required for gRPC async clients)
    - fetch internships from Supabase (in executor)
    - build/load chroma vectorstore (in executor)
    """
    global _VECTORSTORE, _INTERNSHIPS, _PERSIST_DIR

    loop = asyncio.get_running_loop()

    # 1) Initialize embeddings client ON the main event loop to avoid grpc/asyncio thread errors
    try:
        get_embeddings()
        print("Embeddings client initialized on main thread.")
    except Exception as e:
        print("Failed to init embeddings client at startup:", e)
        raise

    # 2) Fetch internships from Supabase (thread)
    try:
        internships = await loop.run_in_executor(None, fetch_internships, None)
    except Exception as e:
        print("Failed to fetch internships from Supabase:", e)
        internships = []

    if not internships:
        print("Warning: no internships found at startup.")
        _INTERNSHIPS = []
        _VECTORSTORE = None
        return

    _INTERNSHIPS = internships

    # 3) Build or load vectorstore (thread)
    try:
        print("Building/loading vectorstore (may take several seconds)...")
        _VECTORSTORE = await loop.run_in_executor(None, build_vectorstore_from_internships, internships, _PERSIST_DIR)
        print("Vectorstore ready.")
    except Exception as e:
        print("Failed to build/load vectorstore:", e)
        _VECTORSTORE = None


@app.get("/")
async def root():
    return {"message": "Internship Matching API is running 🚀"}


@app.post("/match")
async def match_internships(profile: Profile):
    """
    Reuse the prebuilt vectorstore. Offload the synchronous matching function to a thread to keep event loop responsive.
    """
    global _VECTORSTORE, _INTERNSHIPS
    if _VECTORSTORE is None or not _INTERNSHIPS:
        raise HTTPException(status_code=503, detail="Vectorstore not ready. Try again shortly.")

    loop = asyncio.get_running_loop()
    try:
        matches = await loop.run_in_executor(
            None,
            match_profile_to_internships,
            profile.dict(),
            _INTERNSHIPS,
            _VECTORSTORE,
            10,
        )
        return {"matches": matches, "count": len(matches)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
