"""Gemini text embeddings."""

from __future__ import annotations

import threading
from collections import OrderedDict
from collections.abc import Sequence
from typing import Protocol

import numpy as np
import numpy.typing as npt
import requests

from http_client import http

GEMINI_API = "https://generativelanguage.googleapis.com/v1beta"
EMBED_MODEL = "gemini-embedding-001"
EMBED_DIMENSIONS = 768  # Matryoshka truncation: 4x smaller than 3072, near-identical ranking
EMBED_BATCH_SIZE = 100  # Gemini's batchEmbedContents limit

Vector = npt.NDArray[np.float32]
Matrix = npt.NDArray[np.float32]


class Embedder(Protocol):
    """What the index needs from an embedding provider."""

    @property
    def signature(self) -> str: ...

    @property
    def dimensions(self) -> int: ...

    def embed(self, texts: Sequence[str], task_type: str) -> list[list[float]]: ...

    def embed_query(self, text: str) -> Vector: ...


def normalize_rows(matrix: Matrix) -> Matrix:
    """Scale each row to length 1, so a dot product is a cosine similarity."""
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    unit: Matrix = (matrix / norms).astype(np.float32)
    return unit


class GeminiEmbedder:
    """Client for Gemini's batch embedding endpoint, with an LRU cache for queries."""

    def __init__(
        self,
        api_key: str,
        model: str = EMBED_MODEL,
        dimensions: int = EMBED_DIMENSIONS,
        cache_size: int = 1024,
        session: requests.Session = http,
    ) -> None:
        self._api_key = api_key
        self.model = model
        self._dimensions = dimensions
        self._cache_size = cache_size
        self._session = session
        self._cache: OrderedDict[str, Vector] = OrderedDict()
        self._lock = threading.Lock()

    @property
    def dimensions(self) -> int:
        return self._dimensions

    @property
    def signature(self) -> str:
        """Identifies the vector space: vectors with different signatures are not comparable."""
        return f"{self.model}-{self._dimensions}"

    def embed(self, texts: Sequence[str], task_type: str) -> list[list[float]]:
        vectors: list[list[float]] = []
        for start in range(0, len(texts), EMBED_BATCH_SIZE):
            batch = texts[start : start + EMBED_BATCH_SIZE]
            resp = self._session.post(
                f"{GEMINI_API}/models/{self.model}:batchEmbedContents",
                headers={"x-goog-api-key": self._api_key},
                json={
                    "requests": [
                        {
                            "model": f"models/{self.model}",
                            "content": {"parts": [{"text": text}]},
                            "taskType": task_type,
                            "outputDimensionality": self._dimensions,
                        }
                        for text in batch
                    ]
                },
                timeout=60,
            )
            resp.raise_for_status()
            vectors.extend(item["values"] for item in resp.json()["embeddings"])
        return vectors

    def embed_query(self, text: str) -> Vector:
        """Embed one search query as a unit vector. Identical queries hit the cache."""
        with self._lock:
            if text in self._cache:
                self._cache.move_to_end(text)
                return self._cache[text]
        [values] = self.embed([text], task_type="RETRIEVAL_QUERY")
        unit: Vector = normalize_rows(np.asarray([values], dtype=np.float32))[0]
        with self._lock:
            self._cache[text] = unit
            if len(self._cache) > self._cache_size:
                self._cache.popitem(last=False)
        return unit
