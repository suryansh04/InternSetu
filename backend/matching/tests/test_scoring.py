import math

import pytest

from scoring import (
    WEIGHTS,
    Applicant,
    Listing,
    city_of,
    coverage,
    duration_match,
    internship_text,
    location_match,
    normalize_skills,
    profile_text,
    score,
)
from tests.conftest import listing


def test_weights_sum_to_one():
    assert math.isclose(sum(WEIGHTS.values()), 1.0)


def test_normalize_skills_ignores_case_whitespace_and_blanks():
    assert normalize_skills([" React ", "react", "", "SQL"]) == {"react", "sql"}
    assert normalize_skills(None) == frozenset()


@pytest.mark.parametrize(
    ("have", "wanted", "expected"),
    [
        ({"python", "sql"}, {"python", "sql"}, 1.0),
        ({"python"}, {"python", "sql"}, 0.5),
        ({"python", "go", "rust"}, {"python"}, 1.0),  # extra skills never count against you
        (set(), {"python"}, 0.0),
        ({"python"}, set(), 1.0),  # a listing that asks for nothing is fully covered
    ],
)
def test_coverage(have, wanted, expected):
    assert coverage(frozenset(have), frozenset(wanted)) == expected


@pytest.mark.parametrize(
    ("mine", "job", "expected"),
    [
        ("Pune, India", "Pune, India", 1.0),
        ("pune", "Pune, India", 1.0),  # the city is enough
        ("Delhi, India", "Pune, India", 0.0),
        ("Delhi, India", "Remote", 1.0),  # remote suits everyone
        (None, "Pune, India", 0.0),
    ],
)
def test_location_match(mine, job, expected):
    applicant = Applicant.from_profile({"location": mine})
    job_listing = Listing.from_internship(listing("a", "x", location=job))
    assert location_match(applicant, job_listing) == expected


def test_city_of():
    assert city_of("Pune, India") == "pune"
    assert city_of(None) == ""


def test_duration_match():
    assert duration_match(6, 3) == 1.0
    assert duration_match(3, 6) == 0.5
    assert duration_match(None, 3) == 0.5


def test_a_perfect_fit_scores_100_with_every_part_visible():
    job = Listing.from_internship(
        listing("a", "x", ["React"], location="Remote", preferred=["TypeScript"])
    )
    applicant = Applicant.from_profile(
        {"skills": ["react", "TypeScript"], "location": "Pune", "duration_months": 3}
    )
    result = score(applicant, job, similarity=1.0)
    assert result["score"] == 100.0
    assert set(result["parts"]) == set(WEIGHTS)


def test_similarity_is_clamped_to_0_1():
    job = Listing.from_internship(listing("a", "x"))
    applicant = Applicant.from_profile({})
    assert score(applicant, job, similarity=-0.4)["parts"]["semantic"] == 0.0
    assert score(applicant, job, similarity=1.2)["parts"]["semantic"] == 100.0


def test_internship_text_contains_the_key_fields():
    text = internship_text(listing("a", "ML Intern", ["Python"], location="Remote"))
    assert "ML Intern" in text
    assert "Python" in text


def test_profile_text_is_order_insensitive():
    assert profile_text({"skills": ["SQL", "Python"]}) == profile_text(
        {"skills": ["Python", "SQL"]}
    )
