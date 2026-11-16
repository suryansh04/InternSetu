# func.py
import os
import json
import hashlib
import numpy as np
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
load_dotenv()

import requests

# LangChain components
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.docstore.document import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter

# ---------- Config ----------
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")
INTERNSHIPS_TABLE = os.getenv("INTERNSHIPS_TABLE", "internships")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

EMBEDDING_MODEL_NAME = "models/gemini-embedding-001"

# Globals
_embeddings = None


# ---------- Helpers ----------
def get_embeddings():
    """Lazy load embeddings client (must be created from the main event loop)."""
    global _embeddings
    if _embeddings is None:
        if not GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY not found in environment")
        # Construct the embeddings client. This may create an async gRPC client internally,
        # so call get_embeddings() from the main/asyncio event loop (startup event).
        _embeddings = GoogleGenerativeAIEmbeddings(
            model=EMBEDDING_MODEL_NAME, google_api_key=GOOGLE_API_KEY
        )
    return _embeddings


# ---------- Supabase ----------
def fetch_internships(limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Fetch internships from the Supabase `internships` table (PostgREST)."""
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in backend/.env")

    params = {"select": "*", "order": "created_at.asc"}
    if limit:
        params["limit"] = str(limit)
    headers = {"apikey": SUPABASE_SECRET_KEY}
    if not SUPABASE_SECRET_KEY.startswith("sb_"):
        # Legacy service_role JWT keys also need to be sent as a bearer token.
        headers["Authorization"] = f"Bearer {SUPABASE_SECRET_KEY}"
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/{INTERNSHIPS_TABLE}",
        params=params,
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    internships = resp.json()
    for i in internships:
        i["id"] = str(i["id"])

    print(f"Fetched {len(internships)} internships")
    return internships


# ---------- Chroma Vectorstore ----------
def flatten_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Convert metadata types to strings"""
    flat = {}
    for k, v in metadata.items():
        if isinstance(v, list):
            flat[k] = ", ".join(map(str, v))
        elif isinstance(v, dict):
            flat[k] = json.dumps(v)
        elif v is None:
            flat[k] = ""
        else:
            flat[k] = str(v)
    return flat


def internship_to_document(internship: Dict[str, Any]) -> Document:
    """Convert internship dict to LangChain Document"""
    content_parts = [
        f"Title: {internship.get('title', 'N/A')}",
        f"Organization: {internship.get('organization', 'N/A')}",
        f"Location: {internship.get('location', 'N/A')}",
        f"Duration: {internship.get('duration_months', 'N/A')} months",
        f"Stipend: {internship.get('stipend', 'N/A')}",
        "Required Skills: " + ", ".join(internship.get("skills_required", [])),
        "Preferred Skills: " + ", ".join(internship.get("skills_preferred", [])),
        f"Description: {internship.get('description', '')}",
    ]
    content = "\n".join(content_parts)

    metadata = flatten_metadata({
        "id": internship.get("id"),
        "title": internship.get("title"),
        "organization": internship.get("organization"),
        "location": internship.get("location"),
        "duration_months": internship.get("duration_months"),
        "stipend": internship.get("stipend"),
        "skills_required": internship.get("skills_required", []),
        "skills_preferred": internship.get("skills_preferred", []),
    })

    return Document(page_content=content, metadata=metadata)


def build_vectorstore_from_internships(
    internships: List[Dict[str, Any]], persist_directory: Optional[str] = None
) -> Chroma:
    """Build the Chroma vector store, or load it from disk if these exact internships
    were already embedded. The collection name is a hash of the data, so any change
    to the internships builds a fresh collection instead of serving stale results.
    """
    if not internships:
        raise ValueError("No internships provided")

    docs = [internship_to_document(i) for i in internships]
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    splits = splitter.split_documents(docs)
    embeddings = get_embeddings()

    fingerprint = hashlib.sha256(
        json.dumps(
            [(d.metadata.get("id"), d.page_content) for d in docs] + [EMBEDDING_MODEL_NAME]
        ).encode("utf-8")
    ).hexdigest()[:16]
    collection_name = f"internships_{fingerprint}"

    if persist_directory:
        os.makedirs(persist_directory, exist_ok=True)
        try:
            vectorstore = Chroma(
                collection_name=collection_name,
                persist_directory=persist_directory,
                embedding_function=embeddings,
            )
            count = vectorstore._collection.count()
            if count:
                print(f"Loaded {count} cached chunks from {persist_directory}")
                return vectorstore
        except Exception as e:
            print(f"Could not load cached Chroma (will rebuild): {e}")

    vectorstore = Chroma.from_documents(
        splits,
        embeddings,
        collection_name=collection_name,
        persist_directory=persist_directory,
    )
    print(f"Vector store with {len(splits)} chunks built")
    return vectorstore


# ---------- Similarity & Scoring ----------
def embed_text(text: str) -> List[float]:
    """Embed text using Google embeddings"""
    embeddings = get_embeddings()
    try:
        return embeddings.embed_query(text)
    except Exception as e:
        print(f"Embedding error: {e}")
        return []


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2:
        return 0.0
    v1, v2 = np.array(v1), np.array(v2)
    denom = (np.linalg.norm(v1) * np.linalg.norm(v2))
    if denom == 0:
        return 0.0
    return float(np.dot(v1, v2) / denom)


def jaccard_similarity(l1: List[str], l2: List[str]) -> float:
    s1, s2 = set(map(str.lower, l1)), set(map(str.lower, l2))
    if not s1 or not s2:
        return 0.0
    return len(s1 & s2) / len(s1 | s2)


def compute_match_score(
    profile: Dict[str, Any], internship: Dict[str, Any],
    profile_embedding: List[float], internship_embedding: List[float]
) -> Dict[str, Any]:
    required_match = jaccard_similarity(profile.get("skills", []), internship.get("skills_required", []))
    preferred_match = jaccard_similarity(profile.get("skills", []), internship.get("skills_preferred", []))

    profile_loc = (profile.get("location") or "").strip().lower()
    intern_loc = (internship.get("location") or "").strip().lower()
    location_match = 1.0 if profile_loc and profile_loc == intern_loc else 0.0

    profile_dur = profile.get("duration_months")
    intern_dur = internship.get("duration_months")
    duration_match = 1.0 if profile_dur and intern_dur and profile_dur >= intern_dur else 0.5

    semantic_similarity = cosine_similarity(profile_embedding, internship_embedding)

    weights = {"required": 0.4, "preferred": 0.2, "location": 0.15, "duration": 0.1, "semantic": 0.15}
    score = (
        weights["required"] * required_match +
        weights["preferred"] * preferred_match +
        weights["location"] * location_match +
        weights["duration"] * duration_match +
        weights["semantic"] * semantic_similarity
    )

    return {
        "score": round(score * 100, 1),
        "components": {
            "required_skill_match": round(required_match * 100, 1),
            "preferred_skill_match": round(preferred_match * 100, 1),
            "location_match": round(location_match * 100, 1),
            "duration_match": round(duration_match * 100, 1),
            "semantic_similarity": round(semantic_similarity * 100, 1),
        },
    }


def match_profile_to_internships(
    profile: Dict[str, Any], internships: List[Dict[str, Any]],
    vectorstore: Chroma, top_k: int = 10
) -> List[Dict[str, Any]]:
    """
    Returns list of matches: each item is {"internship": <original dict>, "match": <score dict>}
    Note: vectorstore should already be built and provided.
    """
    profile_text = f"""
    Skills: {', '.join(profile.get('skills', []))}
    Location: {profile.get('location', 'Any')}
    Duration: {profile.get('duration_months', 'Flexible')} months
    Interests: {profile.get('interests', 'Not specified')}
    """
    profile_embedding = embed_text(profile_text)

    try:
        # Search vectorstore for similar chunks. We ask for more candidates, then dedupe by internship id.
        search_results = vectorstore.similarity_search_with_score(profile_text, k=min(top_k * 3, max(20, len(internships))))
    except Exception as e:
        print(f"Vectorstore search error: {e}")
        return []

    lookup = {i.get("id"): i for i in internships}
    matches, seen = [], set()

    for doc, score in search_results:
        iid = doc.metadata.get("id")
        if iid in seen or not lookup.get(iid):
            continue
        seen.add(iid)

        internship = lookup[iid]
        # Compute internship embedding from doc content (this will call the embeddings client).
        # If you precompute/stored embeddings in metadata or vectorstore, use that instead.
        internship_embedding = embed_text(doc.page_content)

        match_info = compute_match_score(profile, internship, profile_embedding, internship_embedding)
        # include raw similarity score from vectorstore as optional field for debugging
        match_info["components"]["vectorstore_raw_score"] = float(score) if isinstance(score, (float, int)) else score
        matches.append({"internship": internship, "match": match_info})

    matches.sort(key=lambda x: x["match"]["score"], reverse=True)
    return matches[:top_k]
