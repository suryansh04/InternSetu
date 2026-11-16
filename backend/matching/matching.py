"""Internship matching: load listings, embed them, and score them against a profile.

The score is deliberately explainable. Each internship gets five sub-scores
(required skills, preferred skills, location, duration and meaning) that are
combined with fixed weights, so the UI can show *why* something ranks highly.
"""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from typing import Any, Iterable, Sequence

import chromadb
import numpy as np
from chromadb.config import Settings
import requests

GEMINI_EMBED_MODEL = "gemini-embedding-001"
GEMINI_API = "https://generativelanguage.googleapis.com/v1beta"
EMBED_BATCH_SIZE = 100  # Gemini's batchEmbedContents limit

# How much each part counts towards the final score. Sums to 1.
WEIGHTS = {
    "required_skills": 0.40,
    "preferred_skills": 0.20,
    "location": 0.15,
    "duration": 0.10,
    "semantic": 0.15,
}

Internship = dict[str, Any]


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------
def fetch_internships(supabase_url: str, secret_key: str) -> list[Internship]:
    """Read every internship from the Supabase `internships` table."""
    headers = {"apikey": secret_key}
    if not secret_key.startswith("sb_"):
        # Legacy service_role JWT keys must also be sent as a bearer token.
        headers["Authorization"] = f"Bearer {secret_key}"
    resp = requests.get(
        f"{supabase_url.rstrip('/')}/rest/v1/internships",
        params={"select": "*", "order": "created_at.asc"},
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    internships = resp.json()
    for item in internships:
        item["id"] = str(item["id"])
    return internships


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------
class GeminiEmbedder:
    """Thin client for Gemini's embedding endpoint."""

    def __init__(self, api_key: str, model: str = GEMINI_EMBED_MODEL):
        self.api_key = api_key
        self.model = model

    def embed(self, texts: Sequence[str], task_type: str) -> list[list[float]]:
        vectors: list[list[float]] = []
        for start in range(0, len(texts), EMBED_BATCH_SIZE):
            batch = texts[start : start + EMBED_BATCH_SIZE]
            resp = requests.post(
                f"{GEMINI_API}/models/{self.model}:batchEmbedContents",
                headers={"x-goog-api-key": self.api_key},
                json={
                    "requests": [
                        {
                            "model": f"models/{self.model}",
                            "content": {"parts": [{"text": text}]},
                            "taskType": task_type,
                        }
                        for text in batch
                    ]
                },
                timeout=60,
            )
            resp.raise_for_status()
            vectors.extend(e["values"] for e in resp.json()["embeddings"])
        return vectors


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
            "Skills: " + ", ".join(profile.get("skills") or []),
            "Interests: " + ", ".join(profile.get("interests") or []),
            f"Location: {profile.get('location') or 'Any'}",
        ]
    )


# ---------------------------------------------------------------------------
# Index
# ---------------------------------------------------------------------------
@dataclass
class MatchIndex:
    """Internships plus their embeddings, stored in a persistent Chroma collection."""

    internships: dict[str, Internship]
    collection: chromadb.Collection
    embedder: GeminiEmbedder

    @classmethod
    def build(
        cls,
        internships: list[Internship],
        embedder: GeminiEmbedder,
        persist_dir: str,
    ) -> "MatchIndex":
        """Load the index from disk, or embed the internships if they changed.

        The collection name is a hash of the data and model, so a restart with
        the same listings reuses the stored vectors, and any edit rebuilds them.
        """
        texts = [internship_text(i) for i in internships]
        fingerprint = hashlib.sha256(
            json.dumps([embedder.model, *[[i["id"], t] for i, t in zip(internships, texts)]]).encode()
        ).hexdigest()[:16]

        os.makedirs(persist_dir, exist_ok=True)
        client = chromadb.PersistentClient(
            path=persist_dir, settings=Settings(anonymized_telemetry=False)
        )
        collection = client.get_or_create_collection(
            f"internships_{fingerprint}", metadata={"hnsw:space": "cosine"}
        )
        if collection.count() != len(internships):
            vectors = embedder.embed(texts, task_type="RETRIEVAL_DOCUMENT")
            collection.upsert(
                ids=[i["id"] for i in internships],
                embeddings=vectors,
                documents=texts,
            )
        # Drop collections left over from older versions of the data.
        for existing in client.list_collections():
            name = getattr(existing, "name", existing)
            if name != collection.name:
                client.delete_collection(name)

        return cls({i["id"]: i for i in internships}, collection, embedder)

    def match(self, profile: dict[str, Any], top_k: int = 10) -> list[dict[str, Any]]:
        """Rank internships for a profile. Candidates come from vector search,
        then every candidate is scored with the full explainable formula."""
        if not self.internships:
            return []
        [query] = self.embedder.embed([profile_text(profile)], task_type="RETRIEVAL_QUERY")
        n = min(len(self.internships), max(top_k * 3, 30))
        result = self.collection.query(
            query_embeddings=[query], n_results=n, include=["embeddings"]
        )
        matches = []
        for iid, vector in zip(result["ids"][0], result["embeddings"][0]):
            internship = self.internships.get(iid)
            if internship is None:
                continue
            matches.append(
                {"internship": internship, "match": score_match(profile, internship, query, vector)}
            )
        matches.sort(key=lambda m: m["match"]["score"], reverse=True)
        return matches[:top_k]


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------
def _normalize(items: Iterable[str] | None) -> set[str]:
    return {s.strip().lower() for s in items or [] if s and s.strip()}


def skill_overlap(have: Iterable[str] | None, wanted: Iterable[str] | None) -> float:
    """Share of the wanted skills the student has (0 to 1).

    Coverage, not Jaccard: a student with many extra skills should not be
    penalised for knowing more than a listing asks for.
    """
    want = _normalize(wanted)
    if not want:
        return 0.0
    return len(_normalize(have) & want) / len(want)


def location_match(profile_location: str | None, internship_location: str | None) -> float:
    """1 for a remote role or the same city, otherwise 0."""
    job = (internship_location or "").strip().lower()
    if job == "remote":
        return 1.0
    mine = (profile_location or "").strip().lower()
    if not mine or not job:
        return 0.0
    return 1.0 if mine.split(",")[0].strip() == job.split(",")[0].strip() else 0.0


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
    """Combine the five parts into a 0-100 score, keeping each part visible."""
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
