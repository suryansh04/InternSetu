import { fileURLToPath } from "node:url";

// Load backend/api/.env when present; real environment variables win.
try {
  process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
} catch {
  // No .env file: rely on the environment.
}

const REQUIRED = /** @type {const} */ ([
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "GEMINI_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "DEEPGRAM_API_KEY",
]);

/**
 * Read and validate configuration. Throws one clear error listing every missing variable.
 * @param {NodeJS.ProcessEnv} env
 */
export function loadConfig(env = process.env) {
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Missing environment variables in backend/api/.env: ${missing.join(", ")}`);
  }
  /** @param {(typeof REQUIRED)[number]} name */
  const get = (name) => /** @type {string} */ (env[name]);

  return {
    port: Number(env.PORT) || 4000,
    corsOrigins: (env.CORS_ORIGINS || "http://localhost:5173").split(",").map((o) => o.trim()),
    supabase: { url: get("SUPABASE_URL"), secretKey: get("SUPABASE_SECRET_KEY") },
    geminiApiKey: get("GEMINI_API_KEY"),
    geminiModel: env.GEMINI_MODEL || "gemini-2.5-flash-lite",
    deepgramApiKey: get("DEEPGRAM_API_KEY"),
    cloudinary: {
      cloud_name: get("CLOUDINARY_CLOUD_NAME"),
      api_key: get("CLOUDINARY_API_KEY"),
      api_secret: get("CLOUDINARY_API_SECRET"),
    },
  };
}
