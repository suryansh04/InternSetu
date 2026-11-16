from sources import PAGE_SIZE, fetch_internships


class FakeResponse:
    def __init__(self, rows):
        self.rows = rows

    def raise_for_status(self):
        pass

    def json(self):
        return self.rows


class FakeSession:
    """Serves `total` rows, honouring the Range header like PostgREST."""

    def __init__(self, total):
        self.total = total
        self.ranges: list[str] = []

    def get(self, url, params, headers, timeout):
        self.ranges.append(headers["Range"])
        start, end = (int(x) for x in headers["Range"].split("-"))
        return FakeResponse([{"id": i} for i in range(start, min(end + 1, self.total))])


def test_reads_every_page_and_stringifies_ids():
    session = FakeSession(total=PAGE_SIZE * 2 + 5)
    rows = fetch_internships("https://x.supabase.co", "sb_secret_x", session=session)
    assert len(rows) == PAGE_SIZE * 2 + 5
    assert rows[0]["id"] == "0"
    assert len(session.ranges) == 3


def test_stops_after_a_short_page():
    session = FakeSession(total=3)
    assert len(fetch_internships("https://x.supabase.co", "sb_secret_x", session=session)) == 3
    assert session.ranges == [f"0-{PAGE_SIZE - 1}"]
