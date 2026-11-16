import { Router } from "express";
import multer from "multer";
import { HttpError } from "../lib/http-error.js";
import { requiredText } from "../lib/validate.js";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
});

/** @type {ReadonlySet<string>} */
const FLAG_REASONS = new Set(["tab-hidden", "window-blur", "page-exit"]);

/** @param {{ interviewService: import("../types.js").InterviewService }} deps */
export function interviewRoutes({ interviewService }) {
  const router = Router();

  router.post("/questions", async (req, res) => {
    const role = requiredText(req.body, "role", 200);
    res.json({ questions: await interviewService.generateQuestions(role) });
  });

  // One recorded answer. Replies as soon as the video is stored;
  // transcription and scoring continue in the background.
  router.post("/answers", upload.single("video"), async (req, res) => {
    if (!req.file) throw new HttpError(400, "Attach the recording as 'video'.");
    const question = requiredText(req.body, "question", 1000);
    const attempt = await interviewService.submitAnswer({
      userId: req.user.id, // from the verified token, never from the request body
      sessionId: requiredText(req.body, "sessionId", 100),
      role: requiredText(req.body, "role", 200),
      question,
      video: req.file.buffer,
    });
    res.status(202).json({ attemptId: attempt.id });
    void interviewService.scoreAnswer({ ...attempt, question });
  });

  router.post("/flags", async (req, res) => {
    const reason = requiredText(req.body, "reason", 40);
    if (!FLAG_REASONS.has(reason)) throw new HttpError(400, "Unknown flag reason.");
    await interviewService.flag({
      userId: req.user.id,
      sessionId: requiredText(req.body, "sessionId", 100),
      role: requiredText(req.body, "role", 200),
      question: requiredText(req.body, "question", 1000),
      reason: /** @type {import("../types.js").FlagReason} */ (reason),
    });
    res.status(201).json({ ok: true });
  });

  return router;
}
