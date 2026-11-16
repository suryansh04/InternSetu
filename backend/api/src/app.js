import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { requireUser } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { interviewRoutes } from "./routes/interview.js";
import { resumeRoutes } from "./routes/resume.js";

/**
 * Build the Express app. Every dependency is passed in, so tests can run the
 * real routes against fakes without network calls.
 */
export function createApp({ corsOrigins, supabase, resumeService, interviewService }) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // AI calls cost money: cap each user at 30 requests per 10 minutes.
  const aiLimit = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => req.user.id,
    message: { error: "Too many requests. Please wait a few minutes." },
  });

  const auth = requireUser(supabase);
  app.use("/api/resume", auth, aiLimit, resumeRoutes({ resumeService }));
  app.use("/api/interview", auth, aiLimit, interviewRoutes({ interviewService }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
