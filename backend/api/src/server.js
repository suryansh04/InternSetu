import { createClient } from "@supabase/supabase-js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDeepgram } from "./lib/deepgram.js";
import { createGemini } from "./lib/gemini.js";
import { createTokenVerifier } from "./lib/token-verifier.js";
import { createVideoStore } from "./lib/video-store.js";
import { createAttemptStore } from "./repositories/attempts.js";
import { createInterviewService } from "./services/interview.js";
import { createResumeService } from "./services/resume.js";

const STALE_SWEEP_MS = 15 * 60_000;

const config = loadConfig();
const supabase = createClient(config.supabase.url, config.supabase.secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const gemini = createGemini({ apiKey: config.geminiApiKey, model: config.geminiModel });

const interviewService = createInterviewService({
  gemini,
  deepgram: createDeepgram({ apiKey: config.deepgramApiKey }),
  videos: createVideoStore(config.cloudinary),
  attempts: createAttemptStore(supabase),
});

const app = createApp({
  corsOrigins: config.corsOrigins,
  tokenVerifier: createTokenVerifier(supabase),
  resumeService: createResumeService({ gemini }),
  interviewService,
});

// Scoring runs in memory: fail attempts orphaned by a restart, now and periodically.
async function sweepStaleAttempts() {
  try {
    const count = await interviewService.failStaleAttempts();
    if (count) console.log(`Marked ${count} stale interview attempts as failed`);
  } catch (err) {
    console.error("Stale attempt sweep failed", err);
  }
}
void sweepStaleAttempts();
setInterval(sweepStaleAttempts, STALE_SWEEP_MS).unref();

app.listen(config.port, () => {
  console.log(`InternSetu API listening on http://localhost:${config.port}`);
});
