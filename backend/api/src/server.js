import { createClient } from "@supabase/supabase-js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDeepgram } from "./lib/deepgram.js";
import { createGemini } from "./lib/gemini.js";
import { createVideoStore } from "./lib/video-store.js";
import { createInterviewService } from "./services/interview.js";
import { createResumeService } from "./services/resume.js";

const config = loadConfig();

const supabase = createClient(config.supabase.url, config.supabase.secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const gemini = createGemini({ apiKey: config.geminiApiKey, model: config.geminiModel });

const interviewService = createInterviewService({
  gemini,
  deepgram: createDeepgram({ apiKey: config.deepgramApiKey }),
  videos: createVideoStore(config.cloudinary),
  supabase,
});

const app = createApp({
  corsOrigins: config.corsOrigins,
  supabase,
  resumeService: createResumeService({ gemini }),
  interviewService,
});

// Fail attempts orphaned by a previous restart, now and every 15 minutes.
const sweep = () =>
  interviewService
    .failStaleAttempts()
    .then((n) => n && console.log(`Marked ${n} stale interview attempts as failed`))
    .catch((err) => console.error("Stale attempt sweep failed", err));
sweep();
setInterval(sweep, 15 * 60_000).unref();

app.listen(config.port, () => {
  console.log(`InternSetu API listening on http://localhost:${config.port}`);
});
