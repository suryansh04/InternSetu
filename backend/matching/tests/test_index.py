from pathlib import Path

from index import MatchIndex
from tests.conftest import FakeEmbedder, listing


def test_sync_embeds_only_new_or_changed_listings(index: MatchIndex):
    a = listing("a", "Frontend Intern", ["React"])
    b = listing("b", "Backend Intern", ["Python"])
    first = index.sync([a, b])
    assert (first.total, first.embedded, first.removed) == (2, 2, 0)

    assert index.sync([a, b]).embedded == 0  # unchanged: nothing to embed

    edited = {**a, "description": "Frontend Intern working on design systems"}
    third = index.sync([edited, listing("c", "Data Intern", ["SQL"])])
    assert (third.total, third.embedded, third.removed) == (2, 2, 1)
    assert len(index.snapshot) == 2


def test_a_restart_reuses_stored_vectors(tmp_path: Path):
    items = [listing("a", "Frontend Intern", ["React"])]
    MatchIndex(FakeEmbedder(), str(tmp_path)).sync(items)
    fresh = FakeEmbedder()
    MatchIndex(fresh, str(tmp_path)).sync(items)
    assert fresh.embedded == []


def test_every_listing_is_scored_not_just_nearest_neighbours(index: MatchIndex):
    # 40 listings close in meaning to the query but asking for skills the student lacks...
    near = [listing(f"n{i}", "Backend Intern", ["Go", "Rust"], location="Delhi") for i in range(40)]
    # ...and one far in meaning that fits on skills, city and duration.
    fit = listing("fit", "Design Intern", ["Python", "SQL"])
    index.sync([*near, fit])
    profile = {
        "skills": ["Python", "SQL"],
        "location": "Pune",
        "duration_months": 3,
        "interests": ["backend"],
    }
    assert index.match(profile, top_k=5)[0]["internship"]["id"] == "fit"


def test_results_are_sorted_and_limited(index: MatchIndex):
    index.sync([listing(str(i), "Backend Intern", ["Python"] * (i % 2)) for i in range(12)])
    results = index.match(
        {"skills": ["Python"], "location": "Pune", "duration_months": 3}, top_k=10
    )
    scores = [r["match"]["score"] for r in results]
    assert len(results) == 10
    assert scores == sorted(scores, reverse=True)


def test_an_empty_index_returns_no_matches(index: MatchIndex):
    index.sync([])
    assert index.match({"skills": ["Python"]}) == []
