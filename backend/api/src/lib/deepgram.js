const LISTEN_URL = "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=en";
const TIMEOUT_MS = 120_000;

/**
 * Speech to text for a hosted audio or video file.
 * @param {{ apiKey: string, fetchImpl?: typeof fetch }} options
 * @returns {import("../types.js").Deepgram}
 */
export function createDeepgram({ apiKey, fetchImpl = fetch }) {
  return {
    /** Returns "" when nothing was said. */
    async transcribeUrl(url) {
      const res = await fetchImpl(LISTEN_URL, {
        method: "POST",
        headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`Deepgram ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      const data = await res.json();
      const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      return typeof transcript === "string" ? transcript : "";
    },
  };
}
