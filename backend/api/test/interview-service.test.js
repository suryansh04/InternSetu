import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CRITERIA } from "../src/prompts/interview.js";
import {
  EMPTY_ANSWER,
  createInterviewService,
  normalizeScores,
} from "../src/services/interview.js";

/** An in-memory AttemptStore that records what happened to each attempt. */
function fakeAttempts({ failScoredWrite = false } = {}) {
  /** @type {string[]} */
  const events = [];
  /** @type {import("../src/types.js").AttemptStore} */
  const store = {
    create: async () => "a1",
    markScored: async (id, _transcript, result) => {
      if (failScoredWrite) throw new Error("write failed");
      events.push(`scored ${id} ${result.total}`);
    },
    markFailed: async (id) => {
      events.push(`failed ${id}`);
    },
    recordFlag: async (attempt) => {
      events.push(`flag ${attempt.reason}`);
    },
    failStale: async () => 3,
  };
  return { store, events };
}

/** @type {import("../src/types.js").Gemini} */
const gemini = {
  generateJson: async () => ({
    fluency: 8,
    correctness: 9,
    grammar: 8,
    confidence: 7,
    content: 9,
    feedback: "Good.",
  }),
};
/** @type {import("../src/types.js").VideoStore} */
const videos = { upload: async () => "https://video" };
/** @type {import("../src/types.js").Deepgram} */
const deepgram = { transcribeUrl: async () => "My answer." };

const ATTEMPT = { id: "a1", question: "Q?", videoUrl: "u" };

describe("normalizeScores", () => {
  it("clamps every criterion to 0-10 and recomputes the total", () => {
    const r = normalizeScores({
      fluency: 12,
      correctness: -3,
      grammar: 7.6,
      confidence: "5",
      content: 9,
      total: 50, // ignored: the model's arithmetic is never trusted
      feedback: " Good. ",
    });
    assert.deepEqual(r.scores, {
      fluency: 10,
      correctness: 0,
      grammar: 8,
      confidence: 5,
      content: 9,
    });
    assert.equal(r.total, 32);
    assert.equal(r.feedback, "Good.");
  });

  it("treats missing criteria and a non-object answer as 0", () => {
    assert.equal(normalizeScores({}).total, 0);
    assert.equal(normalizeScores(null).total, 0);
    assert.deepEqual(Object.keys(normalizeScores({}).scores), CRITERIA);
  });
});

describe("interview service", () => {
  it("keeps exactly two cleaned questions", async () => {
    const service = createInterviewService({
      gemini: { generateJson: async () => ({ questions: [" One? ", "", "Two?", "Three?"] }) },
      deepgram,
      videos,
      attempts: fakeAttempts().store,
    });
    assert.deepEqual(await service.generateQuestions("x"), ["One?", "Two?"]);
  });

  it("fails loudly when the model returns too few questions", async () => {
    const service = createInterviewService({
      gemini: { generateJson: async () => ({ questions: ["Only one?"] }) },
      deepgram,
      videos,
      attempts: fakeAttempts().store,
    });
    await assert.rejects(service.generateQuestions("x"));
  });

  it("stores the score computed by the server", async () => {
    const { store, events } = fakeAttempts();
    await createInterviewService({ gemini, deepgram, videos, attempts: store }).scoreAnswer(
      ATTEMPT,
    );
    assert.deepEqual(events, ["scored a1 41"]);
  });

  it("scores silence as 0 without calling the model", async () => {
    const { store, events } = fakeAttempts();
    let modelCalls = 0;
    await createInterviewService({
      gemini: {
        generateJson: async () => {
          modelCalls++;
          return {};
        },
      },
      deepgram: { transcribeUrl: async () => "  " },
      videos,
      attempts: store,
    }).scoreAnswer(ATTEMPT);
    assert.equal(modelCalls, 0);
    assert.deepEqual(events, [`scored a1 ${EMPTY_ANSWER.total}`]);
  });

  it("marks the attempt failed when transcription fails", async () => {
    const { store, events } = fakeAttempts();
    await createInterviewService({
      gemini,
      deepgram: { transcribeUrl: async () => Promise.reject(new Error("deepgram down")) },
      videos,
      attempts: store,
    }).scoreAnswer(ATTEMPT);
    assert.deepEqual(events, ["failed a1"]);
  });

  it("marks the attempt failed when saving the score fails, instead of leaving it processing", async () => {
    const { store, events } = fakeAttempts({ failScoredWrite: true });
    await createInterviewService({ gemini, deepgram, videos, attempts: store }).scoreAnswer(
      ATTEMPT,
    );
    assert.deepEqual(events, ["failed a1"]);
  });

  it("uploads the video into the user's folder before creating the attempt", async () => {
    /** @type {string[]} */
    const folders = [];
    const service = createInterviewService({
      gemini,
      deepgram,
      videos: {
        upload: async (_video, { folder }) => {
          folders.push(folder);
          return "https://video";
        },
      },
      attempts: fakeAttempts().store,
    });
    const result = await service.submitAnswer({
      userId: "u1",
      sessionId: "s1",
      role: "r",
      question: "q",
      video: Buffer.alloc(1),
    });
    assert.deepEqual(result, { id: "a1", videoUrl: "https://video" });
    assert.deepEqual(folders, ["interviews/u1"]);
  });
});
