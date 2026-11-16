"""Where internships come from: the Supabase `internships` table."""

from __future__ import annotations

from typing import cast

import requests

from http_client import http
from scoring import Internship

PAGE_SIZE = 1000  # PostgREST's default maximum rows per request


def fetch_internships(
    supabase_url: str, secret_key: str, session: requests.Session = http
) -> list[Internship]:
    """Read every internship, a page at a time, in a stable order."""
    headers = {"apikey": secret_key}
    if not secret_key.startswith("sb_"):
        # Legacy service_role JWT keys must also be sent as a bearer token.
        headers["Authorization"] = f"Bearer {secret_key}"

    internships: list[Internship] = []
    while True:
        start = len(internships)
        resp = session.get(
            f"{supabase_url.rstrip('/')}/rest/v1/internships",
            params={"select": "*", "order": "id.asc"},
            headers={**headers, "Range": f"{start}-{start + PAGE_SIZE - 1}"},
            timeout=30,
        )
        resp.raise_for_status()
        page = cast("list[Internship]", resp.json())
        internships.extend(page)
        if len(page) < PAGE_SIZE:
            break

    for item in internships:
        item["id"] = str(item["id"])
    return internships
