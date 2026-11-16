"""The match index: internship vectors persisted in Chroma, scored in memory.

Every listing is scored on every request. Semantic similarity is one matrix
product over unit vectors, so this stays in the low milliseconds even for tens
of thousands of listings, and a listing that fits on skills and location is
never missed because its description embeds far away. Chroma persists the
vectors, so restarts and refreshes only embed what changed.
"""

from __future__ import annotations

import hashlib
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import chromadb
import numpy as np
from chromadb.config import Settings

from embeddings import Embedder, Matrix, normalize_rows
from scoring import (
    Applicant,
    Internship,
    Listing,
    MatchResult,
    internship_text,
    profile_text,
    score,
)


@dataclass(frozen=True)
class SyncStats:
    total: int
    embedded: int
    removed: int


@dataclass(frozen=True)
class Snapshot:
    """An immutable view of the index. A sync builds a new one and swaps it in,
    so requests never see a half-updated index and need no locks."""

    listings: list[Listing] = field(default_factory=list)
    vectors: Matrix = field(default_factory=lambda: np.zeros((0, 0), dtype=np.float32))

    def __len__(self) -> int:
        return len(self.listings)


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


class MatchIndex:
    def __init__(self, embedder: Embedder, persist_dir: str) -> None:
        self._embedder = embedder
        Path(persist_dir).mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(
            path=persist_dir, settings=Settings(anonymized_telemetry=False)
        )
        name = "internships_" + "".join(c if c.isalnum() else "_" for c in embedder.signature)
        self._collection = client.get_or_create_collection(name, metadata={"hnsw:space": "cosine"})
        # Vectors from another model or size can never be compared again: drop them.
        for existing in client.list_collections():
            if existing.name != name:
                client.delete_collection(existing.name)
        self.snapshot = Snapshot()
        self._sync_lock = threading.Lock()

    def sync(self, internships: list[Internship]) -> SyncStats:
        """Bring the index in line with `internships`, embedding only new or edited ones."""
        with self._sync_lock:
            texts = {item["id"]: internship_text(item) for item in internships}
            hashes = {iid: _content_hash(text) for iid, text in texts.items()}

            stored = self._collection.get(include=["metadatas"])
            stored_hash = {
                iid: (meta or {}).get("hash")
                for iid, meta in zip(stored["ids"], stored["metadatas"] or [], strict=False)
            }
            changed = [iid for iid in texts if stored_hash.get(iid) != hashes[iid]]
            removed = [iid for iid in stored_hash if iid not in texts]

            if changed:
                vectors = self._embedder.embed(
                    [texts[iid] for iid in changed], task_type="RETRIEVAL_DOCUMENT"
                )
                self._collection.upsert(
                    ids=changed,
                    embeddings=np.asarray(vectors, dtype=np.float32),
                    metadatas=[{"hash": hashes[iid]} for iid in changed],
                )
            if removed:
                self._collection.delete(ids=removed)

            self.snapshot = Snapshot(
                listings=[Listing.from_internship(item) for item in internships],
                vectors=self._load_vectors([item["id"] for item in internships]),
            )
            return SyncStats(total=len(internships), embedded=len(changed), removed=len(removed))

    def _load_vectors(self, ids: list[str]) -> Matrix:
        if not ids:
            return np.zeros((0, self._embedder.dimensions), dtype=np.float32)
        got = self._collection.get(ids=ids, include=["embeddings"])
        by_id = dict(
            zip(got["ids"], got["embeddings"] if got["embeddings"] is not None else [], strict=True)
        )
        return normalize_rows(np.asarray([by_id[iid] for iid in ids], dtype=np.float32))

    def match(self, profile: dict[str, Any], top_k: int = 10) -> list[MatchResult]:
        """Score every listing for a profile and return the best `top_k`."""
        snapshot = self.snapshot
        if not len(snapshot):
            return []
        query = self._embedder.embed_query(profile_text(profile))
        similarities = (snapshot.vectors @ query).tolist()
        applicant = Applicant.from_profile(profile)

        results: list[MatchResult] = [
            {"internship": listing.internship, "match": score(applicant, listing, similarity)}
            for listing, similarity in zip(snapshot.listings, similarities, strict=True)
        ]
        results.sort(key=lambda r: r["match"]["score"], reverse=True)
        return results[:top_k]
