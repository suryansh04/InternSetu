import { fileURLToPath } from "node:url";

// Load backend/api/.env when present; real environment variables win.
try {
  process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
} catch {
  // No .env file: rely on the environment.
}

const required = [
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "GEMINI_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "DEEPGRAM_API_KEY",
];

/** Read and validate configuration. Throws one clear error listing every missing variable. */
export function loadConfig(env = process.env) {
  const missing = required.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Missing environment variables in backend/api/.env: ${missing.join(", ")}`);
  }
  return {
    port: Number(env.PORT) || 4000,
    corsOrigins: (env.CORS_ORIGINS || "http://localhost:5173").split(",").map((o) => o.trim()),
    supabase: { url: env.SUPABASE_URL, secretKey: env.SUPABASE_SECRET_KEY },
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL || "gemini-2.5-flash-lite",
    deepgramApiKey: env.DEEPGRAM_API_KEY,
    cloudinary: {
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    },
  };
}
