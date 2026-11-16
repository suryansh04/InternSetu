import { HttpError } from "./http-error.js";

const API = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Ask Gemini for JSON that matches `schema`. Gemini's structured output mode
 * guarantees the reply parses, so no regex scraping of code fences is needed.
 */
export function createGemini({ apiKey, model, fetchImpl = fetch }) {
  return {
    async generateJson(prompt, schema) {
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
        signal: AbortSignal.timeout(60_000),
      });
      if (res.status === 429) {
        throw new HttpError(503, "The AI service has hit its usage limit. Please try again later.");
      }
      if (!res.ok) {
        console.error("Gemini error", res.status, (await res.text()).slice(0, 500));
        throw new HttpError(502, "The AI service is unavailable. Please try again.");
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new HttpError(502, "The AI service returned an empty answer.");
      return JSON.parse(text);
    },
  };
}
