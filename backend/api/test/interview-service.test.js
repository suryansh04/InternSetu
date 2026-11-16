import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInterviewService } from "../src/services/interview.js";

/** A tiny stand-in for the supabase-js query builder that records updates. */
function fakeSupabase({ failUpdates = 0 } = {}) {
  const updates = [];
  let failuresLeft = failUpdates;
  return {
    updates,
    from: () => ({
      update: (fields) => ({
        eq: async () => {
          updates.push(fields);
          if (failuresLeft > 0) {
            failuresLeft--;
            return { error: new Error("write failed") };
          }
          return { error: null };
        },
      }),
    }),
  };
}

const gemini = {
  generateJson: async () => ({ fluency: 8, correctness: 9, grammar: 8, confidence: 7, content: 9, feedback: "Good." }),
};
const videos = { upload: async () => "https://video" };

const service = (overrides) =>
  createInterviewService({ gemini, videos, deepgram: { transcribeUrl: async () => "My answer." }, ...overrides });

describe("scoreAttempt", () => {
  it("stores the transcript and the server-computed total", async () => {
    const supabase = fakeSupabase();
    await service({ supabase }).scoreAttempt({ id: "a1", question: "Q?", videoUrl: "u" });
    assert.equal(supabase.updates.length, 1);
    assert.equal(supabase.updates[0].status, "scored");
    assert.equal(supabase.updates[0].total_score, 41);
    assert.equal(supabase.updates[0].transcript, "My answer.");
  });

  it("scores silence as 0 without calling the model", async () => {
    const supabase = fakeSupabase();
    let modelCalls = 0;
    await service({
      supabase,
      deepgram: { transcribeUrl: async () => "  " },
      gemini: { generateJson: async () => (modelCalls++, {}) },
    }).scoreAttempt({ id: "a1", question: "Q?", videoUrl: "u" });
    assert.equal(modelCalls, 0);
    assert.equal(supabase.updates[0].total_score, 0);
  });

  it("marks the attempt failed when transcription fails", async () => {
    const supabase = fakeSupabase();
    await service({
      supabase,
      deepgram: { transcribeUrl: async () => Promise.reject(new Error("deepgram down")) },
    }).scoreAttempt({ id: "a1", question: "Q?", videoUrl: "u" });
    assert.deepEqual(supabase.updates, [{ status: "failed" }]);
  });

  it("marks the attempt failed when saving the score fails, instead of leaving it processing", async () => {
    const supabase = fakeSupabase({ failUpdates: 1 });
    await service({ supabase }).scoreAttempt({ id: "a1", question: "Q?", videoUrl: "u" });
    assert.equal(supabase.updates.at(-1).status, "failed");
  });
});
