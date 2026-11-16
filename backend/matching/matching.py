"""Internship matching: load listings, embed them, and score them against a profile.

The score is deliberately explainable. Each internship gets five sub-scores
(required skills, preferred skills, location, duration and meaning) that are
combined with fixed weights, so the UI can show *why* something ranks highly.

Every listing is scored on every request. Semantic similarity is one matrix
product over pre-normalised vectors held in memory, so this stays in the low
milliseconds even for tens of thousands of listings, and a listing that fits
on skills and location is never missed because its description embeds far away.
Chroma persists the vectors, so restarts and refreshes only embed what changed.
"""

from __future__ import annotations

import hashlib
import logging
import os
import threading
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Iterable, Sequence

import chromadb
import numpy as np
import requests
from chromadb.config import Settings

log = logging.getLogger("matching")

GEMINI_EMBED_MODEL = "gemini-embedding-001"
GEMINI_API = "https://generativelanguage.googleapis.com/v1beta"
EMBED_DIMENSIONS = 768  # Matryoshka truncation: 4x smaller than the 3072 default, near-identical ranking
EMBED_BATCH_SIZE = 100  # Gemini's batchEmbedContents limit
SUPABASE_PAGE_SIZE = 1000  # PostgREST's default max rows per request

# How much each part counts towards the final score. Sums to 1.
WEIGHTS = {
    "required_skills": 0.40,
    "preferred_skills": 0.20,
    "location": 0.15,
    "duration": 0.10,
    "semantic": 0.15,
}

Internship = dict[str, Any]

# One pooled HTTP session: reuses TLS connections instead of a new handshake per call.
http = requests.Session()


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------
def fetch_internships(supabase_url: str, secret_key: str) -> list[Internship]:
    """Read every internship from Supabase, a page at a time."""
    headers = {"apikey": secret_key}
    if not secret_key.startswith("sb_"):
        # Legacy service_role JWT keys must also be sent as a bearer token.
        headers["Authorization"] = f"Bearer {secret_key}"
    internships: list[Internship] = []
    while True:
        start = len(internships)
        resp = http.get(
            f"{supabase_url.rstrip('/')}/rest/v1/internships",
            params={"select": "*", "order": "id.asc"},
            headers={**headers, "Range": f"{start}-{start + SUPABASE_PAGE_SIZE - 1}"},
            timeout=30,
        )
        resp.raise_for_status()
        page = resp.json()
        internships.extend(page)
        if len(page) < SUPABASE_PAGE_SIZE:
            break
    for item in internships:
        item["id"] = str(item["id"])
    return internships


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------
class GeminiEmbedder:
    """Client for Gemini's embedding endpoint, with a small cache for queries."""

    def __init__(self, api_key: str, model: str = GEMINI_EMBED_MODEL, dimensions: int = EMBED_DIMENSIONS):
        self.api_key = api_key
        self.model = model
        self.dimensions = dimensions
        self._query_cache: OrderedDict[str, np.ndarray] = OrderedDict()
        self._cache_lock = threading.Lock()

    @property
    def signature(self) -> str:
        """Identifies the vector space: vectors from different signatures are not comparable."""
        return f"{self.model}-{self.dimensions}"

    def embed(self, texts: Sequence[str], task_type: str) -> list[list[float]]:
        vectors: list[list[float]] = []
        for start in range(0, len(texts), EMBED_BATCH_SIZE):
            batch = texts[start : start + EMBED_BATCH_SIZE]
            resp = http.post(
                f"{GEMINI_API}/models/{self.model}:batchEmbedContents",
                headers={"x-goog-api-key": self.api_key},
                json={
                    "requests": [
                        {
                            "model": f"models/{self.model}",
                            "content": {"parts": [{"text": text}]},
                            "taskType": task_type,
                            "outputDimensionality": self.dimensions,
                        }
                        for text in batch
                    ]
                },
                timeout=60,
            )
            resp.raise_for_status()
            vectors.extend(e["values"] for e in resp.json()["embeddings"])
        return vectors

    def embed_query(self, text: str, cache_size: int = 1024) -> np.ndarray:
        """Embed one search query as a unit vector. Identical profiles hit the cache."""
        with self._cache_lock:
            if text in self._query_cache:
                self._query_cache.move_to_end(text)
                return self._query_cache[text]
        [vector] = self.embed([text], task_type="RETRIEVAL_QUERY")
        unit = normalize_rows(np.asarray([vector], dtype=np.float32))[0]
        with self._cache_lock:
            self._query_cache[text] = unit
            if len(self._query_cache) > cache_size:
                self._query_cache.popitem(last=False)
        return unit


def normalize_rows(matrix: np.ndarray) -> np.ndarray:
    """Scale each row to length 1, so a dot product is a cosine similarity."""
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return matrix / norms


def internship_text(internship: Internship) -> str:
    """The text that represents an internship in the vector index."""
    return "\n".join(
        [
            f"Title: {internship.get('title', '')}",
            f"Organization: {internship.get('organization', '')}",
            f"Location: {internship.get('location', '')}",
            "Required skills: " + ", ".join(internship.get("skills_required") or []),
            "Preferred skills: " + ", ".join(internship.get("skills_preferred") or []),
            f"Description: {internship.get('description', '')}",
        ]
    )


def profile_text(profile: dict[str, Any]) -> str:
    """The text that represents a student profile when searching."""
    return "\n".join(
        [
            "Skills: " + ", ".join(sorted(profile.get("skills") or [], key=str.lower)),
            "Interests: " + ", ".join(sorted(profile.get("interests") or [], key=str.lower)),
            f"Location: {profile.get('location') or 'Any'}",
        ]
    )


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Index
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class _Prepared:
    """What scoring needs about one internship, normalised once instead of per request."""

    internship: Internship
    required: frozenset[str]
    preferred: frozenset[str]
    city: str
    remote: bool
    months: int | None


@dataclass(frozen=True)
class Snapshot:
    """An immutable view of the index. Refreshes build a new one and swap it in,
    so requests never see a half-updated index and need no locks."""

    items: list[_Prepared] = field(default_factory=list)
    vectors: np.ndarray = field(default_factory=lambda: np.zeros((0, 0), dtype=np.float32))

    def __len__(self) -> int:
        return len(self.items)


def _prepare(internship: Internship) -> _Prepared:
    location = (internship.get("location") or "").strip().lower()
    return _Prepared(
        internship=internship,
        required=frozenset(normalize_skills(internship.get("skills_required"))),
        preferred=frozenset(normalize_skills(internship.get("skills_preferred"))),
        city=city_of(location),
        remote=location == "remote",
        months=internship.get("duration_months"),
    )


class MatchIndex:
    """Internship vectors persisted in Chroma and held in memory for scoring."""

    def __init__(self, embedder: GeminiEmbedder, persist_dir: str):
        self.embedder = embedder
        os.makedirs(persist_dir, exist_ok=True)
        self._client = chromadb.PersistentClient(
            path=persist_dir, settings=Settings(anonymized_telemetry=False)
        )
        name = "internships_" + "".join(c if c.isalnum() else "_" for c in embedder.signature)
        self._collection = self._client.get_or_create_collection(name, metadata={"hnsw:space": "cosine"})
        # Vectors from another model or size are useless now: drop them.
        for existing in self._client.list_collections():
            other = getattr(existing, "name", existing)
            if other != name:
                self._client.delete_collection(other)
        self.snapshot = Snapshot()
        self._refresh_lock = threading.Lock()

    def refresh(self, internships: list[Internship]) -> dict[str, int]:
        """Sync the index with the given listings, embedding only new or edited ones."""
        with self._refresh_lock:
            texts = {i["id"]: internship_text(i) for i in internships}
            hashes = {iid: _content_hash(text) for iid, text in texts.items()}

            stored = self._collection.get(include=["metadatas"])
            stored_hash = {iid: (meta or {}).get("hash") for iid, meta in zip(stored["ids"], stored["metadatas"])}

            changed = [iid for iid in texts if stored_hash.get(iid) != hashes[iid]]
            removed = [iid for iid in stored_hash if iid not in texts]
            if changed:
                vectors = self.embedder.embed([texts[iid] for iid in changed], task_type="RETRIEVAL_DOCUMENT")
                self._collection.upsert(
                    ids=changed,
                    embeddings=vectors,
                    metadatas=[{"hash": hashes[iid]} for iid in changed],
                )
            if removed:
                self._collection.delete(ids=removed)

            ids = [i["id"] for i in internships]
            if ids:
                got = self._collection.get(ids=ids, include=["embeddings"])
                by_id = dict(zip(got["ids"], got["embeddings"]))
                matrix = normalize_rows(np.asarray([by_id[iid] for iid in ids], dtype=np.float32))
            else:
                matrix = np.zeros((0, self.embedder.dimensions), dtype=np.float32)
            self.snapshot = Snapshot([_prepare(i) for i in internships], matrix)
            return {"total": len(ids), "embedded": len(changed), "removed": len(removed)}

    def match(self, profile: dict[str, Any], top_k: int = 10) -> list[dict[str, Any]]:
        """Score every listing for a profile and return the best `top_k`."""
        snap = self.snapshot
        if not len(snap):
            return []
        query = self.embedder.embed_query(profile_text(profile))
        semantic = np.clip(snap.vectors @ query, 0.0, 1.0)

        skills = frozenset(normalize_skills(profile.get("skills")))
        city = city_of((profile.get("location") or "").strip().lower())
        months = profile.get("duration_months")

        scored = []
        for item, sim in zip(snap.items, semantic.tolist()):
            parts = {
                "required_skills": coverage(skills, item.required),
                "preferred_skills": coverage(skills, item.preferred),
                "location": 1.0 if item.remote or (city and city == item.city) else 0.0,
                "duration": duration_match(months, item.months),
                "semantic": sim,
            }
            scored.append((sum(WEIGHTS[k] * v for k, v in parts.items()), item, parts))

        scored.sort(key=lambda s: s[0], reverse=True)
        return [
            {
                "internship": item.internship,
                "match": {
                    "score": round(score * 100, 1),
                    "parts": {k: round(v * 100, 1) for k, v in parts.items()},
                },
            }
            for score, item, parts in scored[:top_k]
        ]


# ---------------------------------------------------------------------------
# Scoring parts
# ---------------------------------------------------------------------------
def normalize_skills(items: Iterable[str] | None) -> set[str]:
    return {s.strip().lower() for s in items or [] if s and s.strip()}


def city_of(location: str) -> str:
    """'Pune, India' -> 'pune'."""
    return location.split(",")[0].strip()


def coverage(have: frozenset[str] | set[str], wanted: frozenset[str] | set[str]) -> float:
    """Share of the wanted skills the student has (0 to 1).

    Coverage, not Jaccard: knowing more than a listing asks for is never a
    penalty. A listing that asks for nothing is fully covered.
    """
    if not wanted:
        return 1.0
    return len(have & wanted) / len(wanted)


def skill_overlap(have: Iterable[str] | None, wanted: Iterable[str] | None) -> float:
    return coverage(normalize_skills(have), normalize_skills(wanted))


def location_match(profile_location: str | None, internship_location: str | None) -> float:
    """1 for a remote role or the same city, otherwise 0."""
    job = (internship_location or "").strip().lower()
    if job == "remote":
        return 1.0
    mine = city_of((profile_location or "").strip().lower())
    return 1.0 if mine and mine == city_of(job) else 0.0


def duration_match(available_months: int | None, required_months: int | None) -> float:
    """1 if the student is free for the whole internship, scaled down if not."""
    if not available_months or not required_months:
        return 0.5  # unknown: neither reward nor punish
    return min(1.0, available_months / required_months)


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    va, vb = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    denom = float(np.linalg.norm(va) * np.linalg.norm(vb))
    return 0.0 if denom == 0 else float(np.dot(va, vb) / denom)


def score_match(
    profile: dict[str, Any],
    internship: Internship,
    profile_vector: Sequence[float],
    internship_vector: Sequence[float],
) -> dict[str, Any]:
    """Score one listing. The index uses the same formula, vectorised over all listings."""
    parts = {
        "required_skills": skill_overlap(profile.get("skills"), internship.get("skills_required")),
        "preferred_skills": skill_overlap(profile.get("skills"), internship.get("skills_preferred")),
        "location": location_match(profile.get("location"), internship.get("location")),
        "duration": duration_match(profile.get("duration_months"), internship.get("duration_months")),
        "semantic": max(0.0, cosine_similarity(profile_vector, internship_vector)),
    }
    score = sum(WEIGHTS[k] * v for k, v in parts.items())
    return {
        "score": round(score * 100, 1),
        "parts": {k: round(v * 100, 1) for k, v in parts.items()},
    }
