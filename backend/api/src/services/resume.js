// Import the library file: the package entry runs a debug self-test under ESM.
import pdf from "pdf-parse/lib/pdf-parse.js";
import { HttpError } from "../lib/http-error.js";
import { profilePrompt, profileSchema } from "../prompts/resume.js";

const MIN_TEXT_CHARS = 50;
const MAX_SKILLS = 40;
const MAX_INTERESTS = 10;
const MAX_ITEM_CHARS = 60;

/**
 * Pull the text out of a PDF.
 * @param {Buffer} buffer
 */
export async function pdfToText(buffer) {
  try {
    // pdf-parse's bundled pdf.js misreads Node Buffers that sit inside the
    // shared buffer pool (common for small uploads); a Uint8Array copy is safe.
    const { text } = await pdf(new Uint8Array(buffer));
    return text.trim();
  } catch {
    throw new HttpError(422, "This PDF could not be read. Try exporting it again.");
  }
}

/** @param {unknown} value */
const cleanText = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Trimmed, deduplicated case-insensitively, without blanks, at most `max` items.
 * @param {unknown} items
 * @param {number} max
 */
function cleanList(items, max) {
  /** @type {Map<string, string>} */
  const unique = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const value = cleanText(item).slice(0, MAX_ITEM_CHARS);
    if (value && !unique.has(value.toLowerCase())) unique.set(value.toLowerCase(), value);
  }
  return [...unique.values()].slice(0, max);
}

/**
 * Make the model's answer safe to put in the form: trimmed, deduplicated, bounded.
 * @param {unknown} raw
 * @returns {import("../types.js").StudentProfile}
 */
export function normalizeProfile(raw) {
  const answer = /** @type {Record<string, unknown> | null} */ (raw);
  const months = Number(answer?.duration_months);
  return {
    name: cleanText(answer?.name).slice(0, 100) || null,
    location: cleanText(answer?.location).slice(0, 120) || null,
    skills: cleanList(answer?.skills, MAX_SKILLS),
    interests: cleanList(answer?.interests, MAX_INTERESTS),
    duration_months: Number.isInteger(months) && months >= 1 && months <= 24 ? months : null,
  };
}

/**
 * @param {{ gemini: import("../types.js").Gemini }} deps
 * @returns {import("../types.js").ResumeService}
 */
export function createResumeService({ gemini }) {
  return {
    async extractProfile(pdfBuffer) {
      const text = await pdfToText(pdfBuffer);
      if (text.length < MIN_TEXT_CHARS) {
        throw new HttpError(
          422,
          "No text found in this PDF. Scanned resumes are not supported yet.",
        );
      }
      return normalizeProfile(await gemini.generateJson(profilePrompt(text), profileSchema));
    },
  };
}
