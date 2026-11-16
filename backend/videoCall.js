const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");
const { nanoid } = require("nanoid");
const cloudinary = require("cloudinary").v2;
const fs = require("fs-extra");
const path = require("path");
const { fetch } = require("undici"); // ✅ using undici fetch

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "20mb" }));

// ----------------------------
// CONFIG: read from backend/.env (see .env.example)
// ----------------------------
try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch {
  // no .env file: fall back to variables already set in the environment
}

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  GEMINI_API_KEY,
  DEEPGRAM_API_KEY,
} = process.env;

const PORT = Number(process.env.INTERVIEW_PORT) || 4000;
const ATTEMPTS_FILE = path.join(process.cwd(), "attempts.json");
const EVENTS_FILE = path.join(process.cwd(), "events.json");

// ----------------------------
// Cloudinary config
// ----------------------------
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// ----------------------------
// multer (memory) for uploads
// ----------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 250 * 1024 * 1024 },
});

// ----------------------------
// local JSON helpers
// ----------------------------
async function readJSON(filePath) {
  try {
    const exists = await fs.pathExists(filePath);
    if (!exists) return [];
    const txt = await fs.readFile(filePath, "utf8");
    return JSON.parse(txt || "[]");
  } catch (e) {
    console.warn("readJSON error for", filePath, e);
    return [];
  }
}

async function writeJSON(filePath, arr) {
  try {
    await fs.writeFile(filePath, JSON.stringify(arr, null, 2));
  } catch (e) {
    console.warn("writeJSON error for", filePath, e);
  }
}

async function saveAttemptMetadata(meta) {
  const arr = await readJSON(ATTEMPTS_FILE);
  arr.push(meta);
  await writeJSON(ATTEMPTS_FILE, arr);
}

// ----------------------------
// Gemini helper (REST generateContent)
// ----------------------------
async function callGemini(promptText, model = "gemini-2.5-flash") {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in backend/.env");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const payload = {
    contents: [{ parts: [{ text: promptText }] }],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini error ${res.status}: ${txt}`);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === "string" ? text.trim() : JSON.stringify(json);
}

// ----------------------------
// Generate questions using Gemini (fallback to simple generator)
// ----------------------------
app.post("/api/generate-questions", async (req, res) => {
  try {
    const { rolePrompt } = req.body || {};
    if (!rolePrompt || typeof rolePrompt !== "string") {
      return res.status(400).json({ error: "rolePrompt required" });
    }

    if (GEMINI_API_KEY) {
      const prompt = `
You are an interviewer question generator. Given this role/prompt produce EXACTLY TWO concise interview questions suitable for a short recorded interview.
Role/prompt: "${rolePrompt}"

Requirements:
- Output exactly two questions separated by a blank line. No numbering or commentary.
- Keep each question one or two sentences, behaviorally or scenario focused when possible.
`;
      const out = await callGemini(prompt);
      const parts = out
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 2);
      if (parts.length >= 2) {
        const questions = parts.map((q) => ({ id: `q-${nanoid(6)}`, text: q }));
        return res.json({ questions });
      }
    }

    // fallback (if Gemini missing or fails)
    const base = rolePrompt.trim();
    const q1 = `Describe a challenging situation you solved that relates to "${base}". What steps did you take and what was the outcome?`;
    const q2 = `If hired for ${base}, how would you prioritize the first 3 things you work on? Walk us through your decision and rationale.`;
    const questions = [
      { id: `q-${nanoid(6)}`, text: q1 },
      { id: `q-${nanoid(6)}`, text: q2 },
    ];
    return res.json({ questions });
  } catch (err) {
    console.error("generate-questions error:", err);
    return res.status(500).json({ error: "server error generating questions" });
  }
});

// ----------------------------
// Upload endpoint (Cloudinary)
// ----------------------------
app.post("/api/upload-answer", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const { sessionId, questionId, userId, questionText } = req.body || {};

    if (!file)
      return res.status(400).send("file is required (multipart 'file')");
    if (!sessionId) return res.status(400).send("sessionId required");
    if (!questionId) return res.status(400).send("questionId required");
    if (!userId) return res.status(400).send("userId required");

    const attemptId = `attempt-${nanoid(8)}`;
    const originalName = file.originalname || `${attemptId}.webm`;

    const uploadStream = () =>
      new Promise((resolve, reject) => {
        const cldStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            folder: `interview_attempts/${sessionId}`,
            public_id: `${questionId}-${Date.now()}-${nanoid(6)}`,
            chunk_size: 6000000,
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        cldStream.end(file.buffer);
      });

    const result = await uploadStream();

    const meta = {
      attemptId,
      sessionId,
      questionId,
      questionText: questionText || null,
      userId,
      originalName,
      cloudinaryUrl: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      uploadedAt: new Date().toISOString(),
      processed: false,
      rawResult: result,
    };

    await saveAttemptMetadata(meta);

    // async process (fire and forget)
    processAttemptFile(meta).catch((e) =>
      console.error("processAttemptFile failed:", e)
    );

    return res.json({
      ok: true,
      meta: { attemptId: meta.attemptId, uploadedAt: meta.uploadedAt },
    });
  } catch (err) {
    console.error("upload-answer error:", err);
    return res.status(500).json({ error: err.message || "upload error" });
  }
});

// ----------------------------
// flag-suspicious
// ----------------------------
app.post("/api/flag-suspicious", async (req, res) => {
  try {
    const { sessionId, userId, reason } = req.body || {};
    // Fixed: Added backticks for template literal
    const event = {
      id: `evt-${nanoid(6)}`,
      sessionId,
      userId,
      reason: reason || "unknown",
      at: new Date().toISOString(),
    };
    const arr = await readJSON(EVENTS_FILE);
    arr.push(event);
    await writeJSON(EVENTS_FILE, arr);
    return res.json({ ok: true, event });
  } catch (err) {
    console.error("flag-suspicious error:", err);
    res.status(500).json({ error: "failed to flag" });
  }
});

// ----------------------------
// Admin: list attempts
// ----------------------------
app.get("/api/admin/attempts", async (req, res) => {
  try {
    const arr = await readJSON(ATTEMPTS_FILE);
    arr.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
    return res.json({ attempts: arr });
  } catch (err) {
    console.error("admin attempts error", err);
    res.status(500).json({ error: "failed to read attempts" });
  }
});

// ----------------------------
// Deepgram STT helper
// ----------------------------
async function transcribeWithDeepgram(fileUrl) {
  if (!DEEPGRAM_API_KEY) {
    console.warn("DEEPGRAM_API_KEY missing; returning empty transcript.");
    return "";
  }

  try {
    // Fixed: Added backticks for template literal
    const resp = await fetch(
      `https://api.deepgram.com/v1/listen?punctuate=true&language=en-US`,
      {
        method: "POST",
        headers: {
          // Fixed: Added backticks for template literal
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: fileUrl }),
      }
    );

    if (!resp.ok) {
      const txt = await resp.text();
      console.warn("Deepgram listen failed:", resp.status, txt);
      return "";
    }

    const j = await resp.json();
    const transcript = j?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    if (typeof transcript === "string") return transcript;
    return "";
  } catch (e) {
    console.warn("Deepgram request failed:", e);
    return "";
  }
}

// ----------------------------
// utility: extract JSON substring
// ----------------------------
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonStr = text.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

// ----------------------------
// processAttemptFile
// ----------------------------
async function processAttemptFile(meta) {
  try {
    console.log("processAttemptFile start for", meta.attemptId);
    const fileUrl = meta.cloudinaryUrl;
    // Fixed: Added backticks for template literal
    const questionText = meta.questionText || `Question ID: ${meta.questionId}`;

    let transcript = "";
    try {
      transcript = await transcribeWithDeepgram(fileUrl);
      console.log("Deepgram transcript length:", (transcript || "").length);
    } catch (e) {
      transcript = "";
    }

    const scoringPrompt = `
// You are an objective grader. Given the QUESTION and the CANDIDATE TRANSCRIPT below, assign integer scores (0-10) for each criterion: fluency, correctness, grammar, stammering (higher = fewer stammers), and content. Each criterion is worth 10 points. The total must equal 50.

// Return EXACTLY a JSON object and NOTHING else with the fields:
// {
//   "fluency": <int>,
//   "correctness": <int>,
//   "grammar": <int>,
//   "stammering": <int>,
//   "content": <int>,
//   "total": <int>, 
//   "notes": "<short explanation>"
// }

// QUESTION:
// ${questionText}

// TRANSCRIPT:
// ${transcript || "(empty)"}
`;

    let scoring = null;
    try {
      if (GEMINI_API_KEY) {
        const gResp = await callGemini(scoringPrompt);
        const parsed = extractJson(gResp);
        if (parsed && typeof parsed.total === "number") {
          scoring = parsed;
        }
      }
    } catch (e) {
      console.warn("Gemini scoring failed:", e);
    }

    if (!scoring) {
      const zeros = {
        fluency: 0,
        correctness: 0,
        grammar: 0,
        stammering: 0,
        content: 0,
      };
      scoring = { ...zeros, total: 0, notes: "Scoring not available." };
    }

    const arr = await readJSON(ATTEMPTS_FILE);
    const idx = arr.findIndex((a) => a.attemptId === meta.attemptId);
    const now = new Date().toISOString();
    const update = { processed: true, processedAt: now, transcript, scoring };
    if (idx >= 0) arr[idx] = { ...arr[idx], ...update };
    else arr.push({ ...meta, ...update });
    await writeJSON(ATTEMPTS_FILE, arr);

    console.log("processAttemptFile done for", meta.attemptId);
  } catch (err) {
    console.error("processAttemptFile error:", err);
  }
}

// ----------------------------
// Start server
// ----------------------------
app.listen(PORT, () => {
  console.log(`Interview server listening on port ${PORT}`);
  console.log(`Node version: ${process.version}`);
  console.log(`fetch available: ${typeof fetch === "function"}`);
  console.log(`Cloudinary uploads: interview_attempts/<sessionId>`);
  console.log(`Generate questions: POST /api/generate-questions`);
  console.log(`Upload: POST /api/upload-answer`);
  console.log(`Admin: GET /api/admin/attempts`);
});
