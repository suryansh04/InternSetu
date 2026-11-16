import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import { createApp } from "../src/app.js";

const USER = { id: "11111111-1111-1111-1111-111111111111" };
const TOKEN = "valid-token";

// Fakes for everything outside the process.
const supabase = {
  auth: {
    getUser: async (token) =>
      token === TOKEN ? { data: { user: USER }, error: null } : { data: null, error: new Error("bad") },
  },
};
const calls = [];
const resumeService = {
  extractProfile: async () => ({ name: "Asha Verma", skills: ["Python"] }),
};
const interviewService = {
  generateQuestions: async (role) => [`Tell me about ${role}?`, "Why us?"],
  createAttempt: async (input) => (calls.push(["create", input]), { id: "attempt-1", videoUrl: "u" }),
  scoreAttempt: async (input) => calls.push(["score", input]),
  flagSession: async (input) => calls.push(["flag", input]),
};

let server;
let base;
before(async () => {
  const app = createApp({ corsOrigins: ["http://localhost:5173"], supabase, resumeService, interviewService });
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://localhost:${server.address().port}`;
});
after(() => server.close());

const authed = (init = {}) => ({ ...init, headers: { Authorization: `Bearer ${TOKEN}`, ...init.headers } });
const json = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("API", () => {
  it("reports health without auth", async () => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
  });

  it("rejects requests without a token", async () => {
    const res = await fetch(`${base}/api/interview/questions`, json({ role: "x" }));
    assert.equal(res.status, 401);
  });

  it("rejects an invalid token", async () => {
    const res = await fetch(
      `${base}/api/interview/questions`,
      { ...json({ role: "x" }), headers: { "Content-Type": "application/json", Authorization: "Bearer nope" } },
    );
    assert.equal(res.status, 401);
  });

  it("generates questions for a role", async () => {
    const res = await fetch(`${base}/api/interview/questions`, authed(json({ role: "Backend intern" })));
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).questions, ["Tell me about Backend intern?", "Why us?"]);
  });

  it("validates the role", async () => {
    const res = await fetch(`${base}/api/interview/questions`, authed(json({ role: "x".repeat(201) })));
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
    const res = await fetch(`${base}/api/interview/answers`, authed({ method: "POST", body: form }));
    assert.equal(res.status, 202);
    assert.equal((await res.json()).attemptId, "attempt-1");
    const [, created] = calls.find(([k]) => k === "create");
    assert.equal(created.userId, USER.id); // the user comes from the token, not the body
    await new Promise((r) => setImmediate(r));
    assert.ok(calls.some(([k]) => k === "score"));
  });

  it("rejects unknown flag reasons", async () => {
    const body = { sessionId: "s1", role: "r", question: "q", reason: "hacking" };
    const res = await fetch(`${base}/api/interview/flags`, authed(json(body)));
    assert.equal(res.status, 400);
  });

  it("returns JSON 404s", async () => {
    const res = await fetch(`${base}/nope`);
    assert.equal(res.status, 404);
    assert.ok((await res.json()).error);
  });
});
