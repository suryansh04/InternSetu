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

const app = createApp({
  corsOrigins: config.corsOrigins,
  supabase,
  resumeService: createResumeService({ gemini }),
  interviewService: createInterviewService({
    gemini,
    deepgram: createDeepgram({ apiKey: config.deepgramApiKey }),
    videos: createVideoStore(config.cloudinary),
    supabase,
  }),
});

app.listen(config.port, () => {
  console.log(`InternSetu API listening on http://localhost:${config.port}`);
});
