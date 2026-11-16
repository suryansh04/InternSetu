"""The explainable match score.

Each internship gets five sub-scores between 0 and 1, combined with fixed
weights. Everything here is pure and works on values normalised once, so the
index can score thousands of listings per request cheaply.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any, TypedDict

Internship = dict[str, Any]

# How much each part counts towards the final score. Sums to 1.
WEIGHTS: dict[str, float] = {
    "required_skills": 0.40,
    "preferred_skills": 0.20,
    "location": 0.15,
    "duration": 0.10,
    "semantic": 0.15,
}


class MatchScore(TypedDict):
    score: float  # 0-100
    parts: dict[str, float]  # each 0-100


class MatchResult(TypedDict):
    internship: Internship
    match: MatchScore


# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------
def normalize_skills(items: Iterable[str] | None) -> frozenset[str]:
    """Lower-cased, trimmed, without blanks: 'React ' and 'react' are the same skill."""
    return frozenset(s.strip().lower() for s in items or [] if s and s.strip())


def city_of(location: str | None) -> str:
    """'Pune, India' -> 'pune'."""
    return (location or "").split(",")[0].strip().lower()


@dataclass(frozen=True)
class Listing:
    """What scoring needs about one internship, normalised once when the index loads."""

    internship: Internship
    required: frozenset[str]
    preferred: frozenset[str]
    city: str
    remote: bool
    months: int | None

    @classmethod
    def from_internship(cls, internship: Internship) -> Listing:
        location = (internship.get("location") or "").strip().lower()
        return cls(
            internship=internship,
            required=normalize_skills(internship.get("skills_required")),
            preferred=normalize_skills(internship.get("skills_preferred")),
            city=city_of(location),
            remote=location == "remote",
            months=internship.get("duration_months"),
        )


@dataclass(frozen=True)
class Applicant:
    """What scoring needs about a student, normalised once per request."""

    skills: frozenset[str]
    city: str
    months: int | None

    @classmethod
    def from_profile(cls, profile: dict[str, Any]) -> Applicant:
        return cls(
            skills=normalize_skills(profile.get("skills")),
            city=city_of(profile.get("location")),
            months=profile.get("duration_months"),
        )


# ---------------------------------------------------------------------------
# The parts
# ---------------------------------------------------------------------------
def coverage(have: frozenset[str], wanted: frozenset[str]) -> float:
    """Share of the wanted skills the student has.

    Coverage, not Jaccard: knowing more than a listing asks for is never a
    penalty. A listing that asks for nothing is fully covered.
    """
    if not wanted:
        return 1.0
    return len(have & wanted) / len(wanted)


def location_match(applicant: Applicant, listing: Listing) -> float:
    """1 for a remote role or the same city, otherwise 0."""
    return 1.0 if listing.remote or (applicant.city and applicant.city == listing.city) else 0.0


def duration_match(available_months: int | None, required_months: int | None) -> float:
    """1 if the student is free for the whole internship, scaled down if not."""
    if not available_months or not required_months:
        return 0.5  # unknown: neither reward nor punish
    return min(1.0, available_months / required_months)


def score(applicant: Applicant, listing: Listing, similarity: float) -> MatchScore:
    """Combine the five parts into a 0-100 score, keeping each part visible."""
    parts = {
        "required_skills": coverage(applicant.skills, listing.required),
        "preferred_skills": coverage(applicant.skills, listing.preferred),
        "location": location_match(applicant, listing),
        "duration": duration_match(applicant.months, listing.months),
        "semantic": min(1.0, max(0.0, similarity)),
    }
    total = sum(WEIGHTS[name] * value for name, value in parts.items())
    return {
        "score": round(total * 100, 1),
        "parts": {name: round(value * 100, 1) for name, value in parts.items()},
    }


# ---------------------------------------------------------------------------
# Text used for embeddings
# ---------------------------------------------------------------------------
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
    """The text that represents a student when searching. Order-insensitive,
    so the same profile always hits the same cached embedding."""
    return "\n".join(
        [
            "Skills: " + ", ".join(sorted(profile.get("skills") or [], key=str.lower)),
            "Interests: " + ", ".join(sorted(profile.get("interests") or [], key=str.lower)),
            f"Location: {profile.get('location') or 'Any'}",
        ]
    )
