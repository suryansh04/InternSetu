import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { profilePrompt } from "../src/prompts/resume.js";
import { createResumeService, normalizeProfile, pdfToText } from "../src/services/resume.js";

const fixture = new URL("./fixtures/resume.pdf", import.meta.url);

describe("pdfToText", () => {
  it("extracts the text of a PDF", async () => {
    const text = await pdfToText(await readFile(fixture));
    assert.match(text, /Asha Verma/);
    assert.match(text, /FastAPI/);
  });

  it("works for small buffers that share Node's buffer pool", async () => {
    const pooled = Buffer.from(await readFile(fixture)); // small Buffer.from copies come from the pool
    for (let i = 0; i < 5; i++) assert.match(await pdfToText(pooled), /Asha Verma/);
  });

  it("rejects a file that is not a PDF with a 422", async () => {
    await assert.rejects(pdfToText(Buffer.from("not a pdf")), { status: 422 });
  });
});

describe("normalizeProfile", () => {
  it("trims, deduplicates case-insensitively and drops blanks", () => {
    const profile = normalizeProfile({
      name: "  Asha Verma ",
      location: "Pune, India",
      skills: ["Python", "python", " SQL ", "", null],
      interests: ["Web development"],
      duration_months: 3,
    });
    assert.deepEqual(profile, {
      name: "Asha Verma",
      location: "Pune, India",
      skills: ["Python", "SQL"],
      interests: ["Web development"],
      duration_months: 3,
    });
  });

  it("nulls out invalid or missing values", () => {
    const profile = normalizeProfile({ name: "", skills: "Python", duration_months: 99 });
    assert.equal(profile.name, null);
    assert.deepEqual(profile.skills, []);
    assert.equal(profile.duration_months, null);
  });

  it("caps list sizes", () => {
    const profile = normalizeProfile({
      skills: Array.from({ length: 100 }, (_, i) => `skill-${i}`),
    });
    assert.equal(profile.skills.length, 40);
  });

  it("handles a non-object answer", () => {
    assert.deepEqual(normalizeProfile(null).skills, []);
  });
});

describe("profilePrompt", () => {
  it("fences the resume text and truncates very long resumes", () => {
    const prompt = profilePrompt("x".repeat(50_000));
    assert.match(prompt, /<resume>/);
    assert.ok(prompt.length < 21_000);
  });
});

describe("resume service", () => {
  it("rejects PDFs with too little text before calling the model", async () => {
    let modelCalls = 0;
    const service = createResumeService({
      gemini: {
        generateJson: async () => {
          modelCalls++;
          return {};
        },
      },
    });
    const tiny = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
    );
    await assert.rejects(service.extractProfile(tiny), { status: 422 });
    assert.equal(modelCalls, 0);
  });

  it("returns a cleaned profile from the model's answer", async () => {
    const service = createResumeService({
      gemini: { generateJson: async () => ({ name: " Asha ", skills: ["Go", "go"] }) },
    });
    const profile = await service.extractProfile(await readFile(fixture));
    assert.equal(profile.name, "Asha");
    assert.deepEqual(profile.skills, ["Go"]);
  });
});
