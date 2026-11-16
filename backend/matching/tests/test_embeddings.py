import numpy as np
import pytest

from embeddings import GeminiEmbedder, normalize_rows


def test_normalize_rows_makes_unit_vectors_and_keeps_zero_rows():
    rows = normalize_rows(np.asarray([[3.0, 4.0], [0.0, 0.0]], dtype=np.float32))
    assert np.allclose(rows[0], [0.6, 0.8])
    assert np.allclose(rows[1], [0.0, 0.0])


def test_query_embeddings_are_cached_and_evicted(monkeypatch: pytest.MonkeyPatch):
    embedder = GeminiEmbedder("key", dimensions=2, cache_size=1)
    calls: list[list[str]] = []

    def fake_embed(texts, task_type):
        calls.append(list(texts))
        return [[3.0, 4.0]]

    monkeypatch.setattr(embedder, "embed", fake_embed)
    first = embedder.embed_query("Skills: Python")
    embedder.embed_query("Skills: Python")
    assert len(calls) == 1
    assert np.isclose(np.linalg.norm(first), 1.0)

    embedder.embed_query("Skills: Go")  # cache_size=1, so this evicts "Python"
    embedder.embed_query("Skills: Python")
    assert len(calls) == 3


def test_signature_names_the_vector_space():
    assert GeminiEmbedder("key", dimensions=768).signature == "gemini-embedding-001-768"
