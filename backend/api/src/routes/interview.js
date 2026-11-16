import { Router } from "express";
import multer from "multer";
import { HttpError } from "../lib/http-error.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
});

const FLAG_REASONS = new Set(["tab-hidden", "window-blur", "page-exit"]);

/** Read a required, trimmed string field and cap its length. */
function text(body, field, max) {
  const value = typeof body?.[field] === "string" ? body[field].trim() : "";
  if (!value) throw new HttpError(400, `'${field}' is required.`);
  if (value.length > max) throw new HttpError(400, `'${field}' must be at most ${max} characters.`);
  return value;
}

export function interviewRoutes({ interviewService }) {
  const router = Router();

  router.post("/questions", async (req, res) => {
    const role = text(req.body, "role", 200);
    const questions = await interviewService.generateQuestions(role);
    res.json({ questions });
  });

  // One recorded answer. Responds as soon as the video is stored;
  // transcription and scoring continue in the background.
  router.post("/answers", upload.single("video"), async (req, res) => {
    if (!req.file) throw new HttpError(400, "Attach the recording as 'video'.");
    const input = {
      userId: req.user.id,
      sessionId: text(req.body, "sessionId", 100),
      role: text(req.body, "role", 200),
      question: text(req.body, "question", 1000),
      video: req.file.buffer,
    };
    const attempt = await interviewService.createAttempt(input);
    res.status(202).json({ attemptId: attempt.id });

    void interviewService.scoreAttempt({ ...attempt, question: input.question });
  });

  router.post("/flags", async (req, res) => {
    const reason = text(req.body, "reason", 40);
    if (!FLAG_REASONS.has(reason)) throw new HttpError(400, "Unknown flag reason.");
    await interviewService.flagSession({
      userId: req.user.id,
      sessionId: text(req.body, "sessionId", 100),
      role: text(req.body, "role", 200),
      question: text(req.body, "question", 1000),
      reason,
    });
    res.status(201).json({ ok: true });
  });

  return router;
}
