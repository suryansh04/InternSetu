import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from matching import (  # noqa: E402
    WEIGHTS,
    cosine_similarity,
    duration_match,
    internship_text,
    location_match,
    score_match,
    skill_overlap,
)


def test_weights_sum_to_one():
    assert math.isclose(sum(WEIGHTS.values()), 1.0)


@pytest.mark.parametrize(
    "have, wanted, expected",
    [
        (["Python", "SQL"], ["python", "sql"], 1.0),  # case-insensitive
        (["Python"], ["Python", "SQL"], 0.5),
        (["Python", "Go", "Rust", "C"], ["Python"], 1.0),  # extra skills are not penalised
        ([], ["Python"], 0.0),
        (["Python"], [], 1.0),  # a listing that asks for nothing is fully covered
        ([" python "], ["Python"], 1.0),  # whitespace is ignored
    ],
)
def test_skill_overlap(have, wanted, expected):
    assert skill_overlap(have, wanted) == expected


@pytest.mark.parametrize(
    "mine, job, expected",
    [
        ("Pune, India", "Pune, India", 1.0),
        ("pune", "Pune, India", 1.0),  # city is enough
        ("Delhi, India", "Pune, India", 0.0),
        ("Delhi, India", "Remote", 1.0),  # remote suits everyone
        (None, "Pune, India", 0.0),
    ],
)
def test_location_match(mine, job, expected):
    assert location_match(mine, job) == expected


def test_duration_match():
    assert duration_match(6, 3) == 1.0
    assert duration_match(3, 6) == 0.5
    assert duration_match(None, 3) == 0.5


def test_cosine_similarity():
    assert math.isclose(cosine_similarity([1, 0], [1, 0]), 1.0)
    assert math.isclose(cosine_similarity([1, 0], [0, 1]), 0.0)
    assert cosine_similarity([0, 0], [1, 1]) == 0.0


def test_score_match_perfect_fit_scores_100():
    internship = {
        "skills_required": ["React"],
        "skills_preferred": ["TypeScript"],
        "location": "Remote",
        "duration_months": 3,
    }
    profile = {"skills": ["React", "TypeScript"], "location": "Pune", "duration_months": 3}
    result = score_match(profile, internship, [1, 0], [1, 0])
    assert result["score"] == 100.0
    assert set(result["parts"]) == set(WEIGHTS)


def test_score_match_ranks_better_fit_higher():
    job = {"skills_required": ["Python", "SQL"], "skills_preferred": [], "location": "Pune, India", "duration_months": 3}
    good = score_match({"skills": ["Python", "SQL"], "location": "Pune", "duration_months": 3}, job, [1, 0], [1, 0])
    weak = score_match({"skills": ["Figma"], "location": "Delhi", "duration_months": 1}, job, [1, 0], [0, 1])
    assert good["score"] > weak["score"]


def test_internship_text_contains_key_fields():
    text = internship_text({"title": "ML Intern", "skills_required": ["Python"], "location": "Remote"})
    assert "ML Intern" in text and "Python" in text and "Remote" in text
