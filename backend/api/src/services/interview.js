import {
  CRITERIA,
  questionsPrompt,
  questionsSchema,
  scorePrompt,
  scoreSchema,
} from "../prompts/interview.js";

/** @typedef {import("../types.js").ScoreResult} ScoreResult */

const MAX_FEEDBACK_CHARS = 1000;

/**
 * Clamp each criterion to 0-10 and compute the total ourselves: the model's
 * own arithmetic is never trusted.
 * @param {unknown} raw
 * @returns {ScoreResult}
 */
export function normalizeScores(raw) {
  const answer = /** @type {Record<string, unknown> | null} */ (raw);
  const scores = /** @type {import("../types.js").Scores} */ (
    Object.fromEntries(
      CRITERIA.map((c) => {
        const n = Math.round(Number(answer?.[c]));
        return [c, Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : 0];
      }),
    )
  );
  const total = CRITERIA.reduce((sum, c) => sum + scores[c], 0);
  const feedback =
    typeof answer?.feedback === "string" ? answer.feedback.trim().slice(0, MAX_FEEDBACK_CHARS) : "";
  return { scores, total, feedback };
}

/** @type {ScoreResult} */
export const EMPTY_ANSWER = {
  scores: /** @type {import("../types.js").Scores} */ (
    Object.fromEntries(CRITERIA.map((c) => [c, 0]))
  ),
  total: 0,
  feedback: "No speech was detected. Check that your microphone is on and try again.",
};

/**
 * @param {{
 *   gemini: import("../types.js").Gemini,
 *   deepgram: import("../types.js").Deepgram,
 *   videos: import("../types.js").VideoStore,
 *   attempts: import("../types.js").AttemptStore,
 * }} deps
 * @returns {import("../types.js").InterviewService}
 */
export function createInterviewService({ gemini, deepgram, videos, attempts }) {
  return {
    async generateQuestions(role) {
      const answer = /** @type {{ questions?: unknown[] }} */ (
        await gemini.generateJson(questionsPrompt(role), questionsSchema)
      );
      const questions = (answer.questions ?? [])
        .map((q) => String(q).trim())
        .filter(Boolean)
        .slice(0, 2);
      if (questions.length < 2) throw new Error("Gemini returned fewer than two questions");
      return questions;
    },

    /** Store the recording and create a 'processing' attempt. */
    async submitAnswer({ userId, sessionId, role, question, video }) {
      const videoUrl = await videos.upload(video, { folder: `interviews/${userId}` });
      const id = await attempts.create({ userId, sessionId, role, question, videoUrl });
      return { id, videoUrl };
    },

    /** Transcribe and score an attempt. Runs after the response is sent, so it never throws. */
    async scoreAnswer({ id, question, videoUrl }) {
      try {
        const transcript = (await deepgram.transcribeUrl(videoUrl)).trim();
        const result = transcript
          ? normalizeScores(
              await gemini.generateJson(scorePrompt(question, transcript), scoreSchema),
            )
          : EMPTY_ANSWER; // nothing was said: no need to ask the model
        await attempts.markScored(id, transcript, result);
      } catch (err) {
        console.error("Scoring failed for attempt", id, err);
        await attempts
          .markFailed(id)
          .catch((e) => console.error("Could not mark attempt failed", id, e));
      }
    },

    flag(attempt) {
      return attempts.recordFlag(attempt);
    },

    /** Scoring runs in memory, so a restart orphans in-flight attempts. Fail them. */
    failStaleAttempts(olderThanMinutes = 15) {
      return attempts.failStale(olderThanMinutes);
    },
  };
}
