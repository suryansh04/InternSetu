from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path
from typing import Any

import numpy as np
import pytest

from embeddings import Vector, normalize_rows
from index import MatchIndex

TOPICS = ["frontend", "backend", "design", "data"]


class FakeEmbedder:
    """Deterministic 4-d vectors: the topic words a text contains decide its direction."""

    signature = "fake-4"
    dimensions = 4

    def __init__(self) -> None:
        self.embedded: list[str] = []

    @staticmethod
    def vector(text: str) -> list[float]:
        return [1.0 if topic in text.lower() else 0.01 for topic in TOPICS]

    def embed(self, texts: Sequence[str], task_type: str) -> list[list[float]]:
        self.embedded.extend(texts)
        return [self.vector(t) for t in texts]

    def embed_query(self, text: str) -> Vector:
        return normalize_rows(np.asarray([self.vector(text)], dtype=np.float32))[0]


def listing(
    iid: str,
    title: str,
    required: Sequence[str] = (),
    *,
    location: str = "Pune, India",
    months: int | None = 3,
    preferred: Sequence[str] = (),
) -> dict[str, Any]:
    return {
        "id": iid,
        "title": title,
        "organization": "Acme",
        "location": location,
        "duration_months": months,
        "skills_required": list(required),
        "skills_preferred": list(preferred),
        "description": title,
    }


@pytest.fixture
def embedder() -> FakeEmbedder:
    return FakeEmbedder()


@pytest.fixture
def index(tmp_path: Path, embedder: FakeEmbedder) -> MatchIndex:
    return MatchIndex(embedder, str(tmp_path))
