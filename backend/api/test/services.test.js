import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { CRITERIA, EMPTY_ANSWER, normalizeScores } from "../src/services/interview.js";
import { normalizeProfile, pdfToText, profilePrompt } from "../src/services/resume.js";

const fixture = new URL("./fixtures/resume.pdf", import.meta.url);

describe("pdfToText", () => {
  it("extracts the text of a PDF", async () => {
    const text = await pdfToText(await readFile(fixture));
    assert.match(text, /Asha Verma/);
    assert.match(text, /FastAPI/);
  });

  it("works for small buffers that share Node's buffer pool", async () => {
    const original = await readFile(fixture);
    const pooled = Buffer.from(original); // small Buffer.from copies come from the pool
    for (let i = 0; i < 5; i++) assert.match(await pdfToText(pooled), /Asha Verma/);
  });

  it("rejects a file that is not a PDF with a 422", async () => {
    await assert.rejects(pdfToText(Buffer.from("not a pdf")), { status: 422 });
  });
});

describe("normalizeProfile", () => {
  it("trims, deduplicates case-insensitively and drops blanks", () => {
    const p = normalizeProfile({
      name: "  Asha Verma ",
      location: "Pune, India",
      skills: ["Python", "python", " SQL ", "", null],
      interests: ["Web development"],
      duration_months: 3,
    });
    assert.deepEqual(p, {
      name: "Asha Verma",
      location: "Pune, India",
      skills: ["Python", "SQL"],
      interests: ["Web development"],
      duration_months: 3,
    });
  });

  it("nulls out invalid or missing values", () => {
    const p = normalizeProfile({ name: "", skills: "Python", duration_months: 99 });
    assert.equal(p.name, null);
    assert.deepEqual(p.skills, []);
    assert.equal(p.duration_months, null);
  });

  it("caps list sizes", () => {
    const p = normalizeProfile({ skills: Array.from({ length: 100 }, (_, i) => `skill-${i}`) });
    assert.equal(p.skills.length, 40);
  });
});

describe("profilePrompt", () => {
  it("fences the resume text and truncates very long resumes", () => {
    const prompt = profilePrompt("x".repeat(50_000));
    assert.match(prompt, /<resume>/);
    assert.ok(prompt.length < 21_000);
  });
});

describe("normalizeScores", () => {
  it("clamps every criterion to 0-10 and recomputes the total", () => {
    const r = normalizeScores({
      fluency: 12,
      correctness: -3,
      grammar: 7.6,
      confidence: "5",
      content: 9,
      total: 50, // ignored: we never trust the model's sum
      feedback: " Good. ",
    });
    assert.deepEqual(r.scores, { fluency: 10, correctness: 0, grammar: 8, confidence: 5, content: 9 });
    assert.equal(r.total, 32);
    assert.equal(r.feedback, "Good.");
  });

  it("treats missing criteria as 0", () => {
    const r = normalizeScores({});
    assert.equal(r.total, 0);
    assert.deepEqual(Object.keys(r.scores), CRITERIA);
  });

  it("scores an empty answer as 0", () => {
    assert.equal(EMPTY_ANSWER.total, 0);
  });
});
