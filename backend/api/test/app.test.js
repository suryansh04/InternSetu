import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import { createApp } from "../src/app.js";

/** @typedef {import("../src/types.js").InterviewService} InterviewService */

const USER = { id: "11111111-1111-1111-1111-111111111111" };
const TOKEN = "valid-token";

/** @type {import("../src/types.js").TokenVerifier} */
const tokenVerifier = { verify: async (token) => (token === TOKEN ? USER : null) };

/** @type {import("../src/types.js").ResumeService} */
const resumeService = {
  extractProfile: async () => ({
    name: "Asha Verma",
    location: null,
    skills: ["Python"],
    interests: [],
    duration_months: null,
  }),
};

/** @type {[string, unknown][]} */
const calls = [];
/** @type {InterviewService} */
const interviewService = {
  generateQuestions: async (role) => [`Tell me about ${role}?`, "Why us?"],
  submitAnswer: async (answer) => {
    calls.push(["submit", answer]);
    return { id: "attempt-1", videoUrl: "https://video" };
  },
  scoreAnswer: async (attempt) => {
    calls.push(["score", attempt]);
  },
  flag: async (attempt) => {
    calls.push(["flag", attempt]);
  },
  failStaleAttempts: async () => 0,
};

/** @type {import("node:http").Server} */
let server;
let base = "";
before(async () => {
  const app = createApp({
    corsOrigins: ["http://localhost:5173"],
    tokenVerifier,
    resumeService,
    interviewService,
  });
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = /** @type {import("node:net").AddressInfo} */ (server.address());
  base = `http://localhost:${address.port}`;
});
after(() => server.close());

/**
 * @param {RequestInit} [init]
 * @returns {RequestInit}
 */
const authed = (init = {}) => ({
  ...init,
  headers: { Authorization: `Bearer ${TOKEN}`, ...init.headers },
});

/** @param {unknown} body */
const json = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("API", () => {
  it("reports health without auth", async () => {
    assert.equal((await fetch(`${base}/health`)).status, 200);
  });

  it("rejects requests without a token", async () => {
    const res = await fetch(`${base}/api/interview/questions`, json({ role: "x" }));
    assert.equal(res.status, 401);
  });

  it("rejects an invalid token", async () => {
    const res = await fetch(`${base}/api/interview/questions`, {
      ...json({ role: "x" }),
      headers: { "Content-Type": "application/json", Authorization: "Bearer nope" },
    });
    assert.equal(res.status, 401);
  });

  it("generates questions for a role", async () => {
    const res = await fetch(
      `${base}/api/interview/questions`,
      authed(json({ role: "Backend intern" })),
    );
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).questions, ["Tell me about Backend intern?", "Why us?"]);
  });

  it("validates the role", async () => {
    const res = await fetch(
      `${base}/api/interview/questions`,
      authed(json({ role: "x".repeat(201) })),
    );
    assert.equal(res.status, 400);
  });

  it("parses a PDF resume", async () => {
    const form = new FormData();
    const pdf = await readFile(new URL("./fixtures/resume.pdf", import.meta.url));
    form.append("file", new Blob([pdf], { type: "application/pdf" }), "resume.pdf");
    const res = await fetch(`${base}/api/resume/parse`, authed({ method: "POST", body: form }));
    assert.equal(res.status, 200);
    assert.equal((await res.json()).profile.name, "Asha Verma");
  });

  it("refuses files that are not PDFs, whatever their name", async () => {
    const form = new FormData();
    form.append("file", new Blob(["hello"], { type: "application/pdf" }), "resume.pdf");
    const res = await fetch(`${base}/api/resume/parse`, authed({ method: "POST", body: form }));
    assert.equal(res.status, 415);
  });

  it("stores an answer, replies 202, then scores it in the background", async () => {
    const form = new FormData();
    form.append("sessionId", "s1");
    form.append("role", "Backend intern");
    form.append("question", "Why us?");
    form.append("video", new Blob([Buffer.alloc(10)], { type: "video/webm" }), "a.webm");
    const res = await fetch(
      `${base}/api/interview/answers`,
      authed({ method: "POST", body: form }),
    );
    assert.equal(res.status, 202);
    assert.equal((await res.json()).attemptId, "attempt-1");

    const submitted = /** @type {{ userId: string }} */ (calls.find(([k]) => k === "submit")?.[1]);
    assert.equal(submitted.userId, USER.id); // the user comes from the token, not the body
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(calls.some(([k]) => k === "score"));
  });

  it("records a valid flag and rejects unknown reasons", async () => {
    const body = { sessionId: "s1", role: "r", question: "q", reason: "tab-hidden" };
    assert.equal((await fetch(`${base}/api/interview/flags`, authed(json(body)))).status, 201);
    const bad = await fetch(`${base}/api/interview/flags`, authed(json({ ...body, reason: "x" })));
    assert.equal(bad.status, 400);
  });

  it("returns JSON errors for unknown routes and bad JSON", async () => {
    const missing = await fetch(`${base}/nope`);
    assert.equal(missing.status, 404);
    assert.ok((await missing.json()).error);

    const badJson = await fetch(`${base}/api/interview/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: "{not json",
    });
    assert.equal(badJson.status, 400);
  });
});
