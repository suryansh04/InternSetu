/** Speech to text for a hosted audio or video file. Returns "" when nothing was said. */
export function createDeepgram({ apiKey, fetchImpl = fetch }) {
  return {
    async transcribeUrl(url) {
      const res = await fetchImpl(
        "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&language=en",
        {
          method: "POST",
          headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
          signal: AbortSignal.timeout(120_000),
        },
      );
      if (!res.ok) {
        throw new Error(`Deepgram ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      const data = await res.json();
      return data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    },
  };
}
