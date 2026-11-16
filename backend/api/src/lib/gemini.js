import { HttpError } from "./http-error.js";

const API = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT_MS = 60_000;
const RETRIES = 2;
const MAX_RETRY_DELAY_MS = 8_000;

/** @param {number} ms */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * How long to wait before retrying, or null when it is not worth it. Gemini
 * puts its own hint in RetryInfo ("17s"): a short one is a per-minute limit
 * worth waiting out; a long one (hours, for a daily quota) is not.
 * @param {string} body
 * @param {number} attempt
 * @returns {number | null}
 */
export function retryDelayMs(body, attempt) {
  const hinted = /"retryDelay":\s*"(\d+(?:\.\d+)?)s"/.exec(body);
  const ms = hinted ? Number(hinted[1]) * 1000 : 1000 * 2 ** attempt;
  return ms <= MAX_RETRY_DELAY_MS ? ms : null;
}

/**
 * Ask Gemini for JSON that matches a schema. Structured output mode guarantees
 * the reply parses, so no scraping of code fences is needed. Short rate limits
 * (429) and overloads (503) are retried, since the free tier's per-minute
 * limits are bursty.
 * @param {{
 *   apiKey: string,
 *   model: string,
 *   fetchImpl?: typeof fetch,
 *   sleep?: (ms: number) => Promise<unknown>,
 * }} options
 * @returns {import("../types.js").Gemini}
 */
export function createGemini({ apiKey, model, fetchImpl = fetch, sleep = wait }) {
  return {
    async generateJson(prompt, schema) {
      for (let attempt = 0; ; attempt++) {
        const res = await fetchImpl(`${API}/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: schema,
              temperature: 0.4,
            },
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (typeof text !== "string" || !text) {
            throw new HttpError(502, "The AI service returned an empty answer.");
          }
          return JSON.parse(text);
        }

        const body = (await res.text()).slice(0, 1000);
        const delay = res.status === 429 || res.status === 503 ? retryDelayMs(body, attempt) : null;
        if (delay !== null && attempt < RETRIES) {
          await sleep(delay);
          continue;
        }
        console.error("Gemini error", res.status, body.slice(0, 300));
        if (res.status === 429) {
          throw new HttpError(
            503,
            "The AI service has hit its usage limit. Please try again later.",
          );
        }
        throw new HttpError(502, "The AI service is unavailable. Please try again.");
      }
    },
  };
}
