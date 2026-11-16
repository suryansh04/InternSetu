import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { requireUser } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { interviewRoutes } from "./routes/interview.js";
import { resumeRoutes } from "./routes/resume.js";

const AI_REQUESTS_PER_WINDOW = 30;
const AI_WINDOW_MS = 10 * 60 * 1000;

/**
 * Build the Express app. Every dependency is passed in, so tests run the real
 * routes against fakes with no network calls.
 * @param {{
 *   corsOrigins: string[],
 *   tokenVerifier: import("./types.js").TokenVerifier,
 *   resumeService: import("./types.js").ResumeService,
 *   interviewService: import("./types.js").InterviewService,
 * }} deps
 */
export function createApp({ corsOrigins, tokenVerifier, resumeService, interviewService }) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  // maxAge lets browsers cache the preflight instead of sending one before every call.
  app.use(cors({ origin: corsOrigins, maxAge: 3600 }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // AI calls cost money: cap each user's requests.
  const aiLimit = rateLimit({
    windowMs: AI_WINDOW_MS,
    limit: AI_REQUESTS_PER_WINDOW,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => req.user.id,
    message: { error: "Too many requests. Please wait a few minutes." },
  });

  const auth = requireUser(tokenVerifier);
  app.use("/api/resume", auth, aiLimit, resumeRoutes({ resumeService }));
  app.use("/api/interview", auth, aiLimit, interviewRoutes({ interviewService }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
