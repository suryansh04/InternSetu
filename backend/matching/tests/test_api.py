from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from auth import InvalidTokenError
from index import MatchIndex
from main import create_app
from tests.conftest import listing

GOOD_TOKEN = "good-token"
AUTH = {"Authorization": f"Bearer {GOOD_TOKEN}"}


def verify(token: str) -> str:
    if token != GOOD_TOKEN:
        raise InvalidTokenError("Please sign in again.")
    return "user-1"


@pytest.fixture
def client(index: MatchIndex) -> Iterator[TestClient]:
    items = [listing("a", "Backend Intern", ["Python"]), listing("b", "Frontend Intern", ["React"])]
    app = create_app(
        index=index,
        load_internships=lambda: items,
        verify_token=verify,
        cors_origins=["http://localhost:5173"],
    )
    with TestClient(app) as test_client:  # entering runs the start-up sync
        yield test_client


def test_health_reports_the_index_size(client: TestClient):
    assert client.get("/health").json() == {"status": "ok", "internships": 2}


def test_match_requires_a_token(client: TestClient):
    assert client.post("/match", json={"skills": ["Python"]}).status_code == 401


def test_match_rejects_an_invalid_token(client: TestClient):
    response = client.post("/match", json={}, headers={"Authorization": "Bearer nope"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Please sign in again."


def test_match_ranks_listings_for_a_profile(client: TestClient):
    response = client.post(
        "/match",
        json={"skills": ["Python"], "location": "Pune", "duration_months": 3},
        headers=AUTH,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 2
    assert body["matches"][0]["internship"]["id"] == "a"


def test_match_validates_the_profile(client: TestClient):
    response = client.post("/match", json={"location": "x" * 121}, headers=AUTH)
    assert response.status_code == 422
