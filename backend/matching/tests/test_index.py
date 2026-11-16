import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from matching import GeminiEmbedder, MatchIndex, profile_text  # noqa: E402


class FakeEmbedder:
    """Deterministic 4-d vectors: a listing's 'topic' decides its direction."""

    model = "fake"
    dimensions = 4
    signature = "fake-4"

    def __init__(self):
        self.embedded: list[str] = []
        self.query_calls = 0
        self._cache: dict[str, np.ndarray] = {}

    @staticmethod
    def _vector(text: str) -> list[float]:
        topics = ["frontend", "backend", "design", "data"]
        return [1.0 if t in text.lower() else 0.01 for t in topics]

    def embed(self, texts, task_type):
        self.embedded.extend(texts)
        return [self._vector(t) for t in texts]

    def embed_query(self, text):
        if text not in self._cache:
            self.query_calls += 1
            v = np.asarray(self._vector(text), dtype=np.float32)
            self._cache[text] = v / np.linalg.norm(v)
        return self._cache[text]


def listing(iid, title, required, location="Pune, India", months=3, preferred=()):
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
def index(tmp_path):
    return MatchIndex(FakeEmbedder(), str(tmp_path))


def test_refresh_embeds_only_new_or_changed_listings(index):
    a = listing("a", "Frontend Intern", ["React"])
    b = listing("b", "Backend Intern", ["Python"])
    assert index.refresh([a, b]) == {"total": 2, "embedded": 2, "removed": 0}

    # Same data again: nothing to embed.
    assert index.refresh([a, b])["embedded"] == 0

    # Edit one, remove one, add one.
    a2 = {**a, "description": "Frontend Intern working on design systems"}
    c = listing("c", "Data Intern", ["SQL"])
    assert index.refresh([a2, c]) == {"total": 2, "embedded": 2, "removed": 1}
    assert len(index.snapshot) == 2


def test_restart_reuses_stored_vectors(tmp_path):
    items = [listing("a", "Frontend Intern", ["React"])]
    MatchIndex(FakeEmbedder(), str(tmp_path)).refresh(items)
    fresh = FakeEmbedder()
    MatchIndex(fresh, str(tmp_path)).refresh(items)
    assert fresh.embedded == []


def test_every_listing_is_scored_not_just_nearest_neighbours(index):
    # 40 listings close in meaning to the query but asking for skills the student lacks...
    near = [listing(f"n{i}", "Backend Intern", ["Go", "Rust"], location="Delhi") for i in range(40)]
    # ...and one far in meaning that fits on skills, city and duration.
    fit = listing("fit", "Design Intern", ["Python", "SQL"])
    index.refresh(near + [fit])
    profile = {"skills": ["Python", "SQL"], "location": "Pune", "duration_months": 3, "interests": ["backend"]}
    top = index.match(profile, top_k=5)
    assert top[0]["internship"]["id"] == "fit"


def test_query_embeddings_are_cached_and_evicted():
    embedder = GeminiEmbedder("key", dimensions=4)
    calls = []
    embedder.embed = lambda texts, task_type: calls.append(texts) or [[3.0, 4.0, 0.0, 0.0]]

    first = embedder.embed_query("Skills: Python")
    embedder.embed_query("Skills: Python")
    assert len(calls) == 1
    assert np.isclose(np.linalg.norm(first), 1.0)  # stored as a unit vector

    embedder.embed_query("Skills: Go", cache_size=1)  # evicts the oldest entry
    embedder.embed_query("Skills: Python", cache_size=1)
    assert len(calls) == 3


def test_profile_text_is_order_insensitive():
    a = profile_text({"skills": ["SQL", "Python"], "interests": []})
    b = profile_text({"skills": ["Python", "SQL"], "interests": []})
    assert a == b


def test_empty_index_returns_no_matches(index):
    index.refresh([])
    assert index.match({"skills": ["Python"]}) == []
