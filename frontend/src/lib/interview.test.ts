import { describe, expect, it } from "vitest";
import { formatClock, groupBySession, isLocked, isStuck, pickMimeType } from "./interview";
import type { InterviewAttempt } from "./types";

const attempt = (overrides: Partial<InterviewAttempt>): InterviewAttempt => ({
  id: "a",
  session_id: "s",
  role: "Backend Intern",
  question: "Q?",
  transcript: null,
  scores: null,
  total_score: null,
  feedback: null,
  status: "scored",
  flagged_reason: null,
  created_at: "2026-01-01T10:00:00Z",
  ...overrides,
});

describe("groupBySession", () => {
  it("keeps sessions newest first and answers in question order", () => {
    // Rows arrive newest first, as the API returns them.
    const rows = [
      attempt({ id: "s2-q2", session_id: "s2", created_at: "2026-01-02T10:02:00Z" }),
      attempt({ id: "s2-q1", session_id: "s2", created_at: "2026-01-02T10:01:00Z" }),
      attempt({ id: "s1-q1", session_id: "s1", role: "Data Intern" }),
    ];
    const sessions = groupBySession(rows);
    expect(sessions.map((s) => s.id)).toEqual(["s2", "s1"]);
    expect(sessions[0].attempts.map((a) => a.id)).toEqual(["s2-q1", "s2-q2"]);
    expect(sessions[1].role).toBe("Data Intern");
  });

  it("returns nothing for no attempts", () => {
    expect(groupBySession([])).toEqual([]);
  });
});

describe("isStuck", () => {
  const now = Date.parse("2026-01-01T12:00:00Z");

  it("flags attempts processing for more than 15 minutes", () => {
    expect(
      isStuck(attempt({ status: "processing", created_at: "2026-01-01T11:40:00Z" }), now),
    ).toBe(true);
  });

  it("leaves recent or finished attempts alone", () => {
    expect(
      isStuck(attempt({ status: "processing", created_at: "2026-01-01T11:50:00Z" }), now),
    ).toBe(false);
    expect(isStuck(attempt({ status: "scored", created_at: "2026-01-01T09:00:00Z" }), now)).toBe(
      false,
    );
  });
});

describe("helpers", () => {
  it("formats a countdown", () => {
    expect(formatClock(90)).toBe("1:30");
    expect(formatClock(5)).toBe("0:05");
  });

  it("locks the screen only while answering", () => {
    expect(["prep", "recording", "saving"].every((p) => isLocked(p as never))).toBe(true);
    expect(["setup", "ready", "done", "flagged"].some((p) => isLocked(p as never))).toBe(false);
  });

  it("picks the best supported recording format", () => {
    expect(pickMimeType((t) => t === "video/webm;codecs=vp8,opus")).toBe(
      "video/webm;codecs=vp8,opus",
    );
    expect(pickMimeType(() => false)).toBeUndefined();
  });
});
