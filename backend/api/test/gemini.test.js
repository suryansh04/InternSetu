import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGemini, retryDelayMs } from "../src/lib/gemini.js";

/**
 * A fetch that plays back responses in order.
 * @param {{ status: number, body: unknown }[]} responses
 */
function scriptedFetch(responses) {
  let calls = 0;
  /** @type {typeof fetch} */
  const fetchImpl = async () => {
    const { status, body } = responses[Math.min(calls++, responses.length - 1)];
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  };
  return { fetchImpl, calls: () => calls };
}

/** @param {unknown} json */
const answer = (json) => ({
  candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }],
});

describe("gemini client", () => {
  it("returns the parsed JSON answer", async () => {
    const { fetchImpl } = scriptedFetch([{ status: 200, body: answer({ ok: true }) }]);
    const gemini = createGemini({ apiKey: "k", model: "m", fetchImpl });
    assert.deepEqual(await gemini.generateJson("p", {}), { ok: true });
  });

  it("retries a short rate limit, waiting as long as Gemini asks", async () => {
    const limited = { status: 429, body: '{"error":{"details":[{"retryDelay":"3s"}]}}' };
    const { fetchImpl, calls } = scriptedFetch([limited, { status: 200, body: answer({ ok: 1 }) }]);
    /** @type {number[]} */
    const waits = [];
    const gemini = createGemini({
      apiKey: "k",
      model: "m",
      fetchImpl,
      sleep: async (ms) => waits.push(ms),
    });
    assert.deepEqual(await gemini.generateJson("p", {}), { ok: 1 });
    assert.equal(calls(), 2);
    assert.deepEqual(waits, [3000]);
  });

  it("gives up after its retries with a message safe to show", async () => {
    const { fetchImpl, calls } = scriptedFetch([{ status: 429, body: "{}" }]);
    const gemini = createGemini({ apiKey: "k", model: "m", fetchImpl, sleep: async () => {} });
    await assert.rejects(gemini.generateJson("p", {}), { status: 503, message: /usage limit/ });
    assert.equal(calls(), 3);
  });

  it("fails fast on a daily quota instead of waiting", async () => {
    const daily = { status: 429, body: '{"error":{"details":[{"retryDelay":"51623s"}]}}' };
    const { fetchImpl, calls } = scriptedFetch([daily]);
    const gemini = createGemini({ apiKey: "k", model: "m", fetchImpl, sleep: async () => {} });
    await assert.rejects(gemini.generateJson("p", {}), { status: 503 });
    assert.equal(calls(), 1);
  });

  it("does not retry other errors", async () => {
    const { fetchImpl, calls } = scriptedFetch([{ status: 400, body: "bad request" }]);
    const gemini = createGemini({ apiKey: "k", model: "m", fetchImpl, sleep: async () => {} });
    await assert.rejects(gemini.generateJson("p", {}), { status: 502 });
    assert.equal(calls(), 1);
  });

  it("rejects an empty answer", async () => {
    const { fetchImpl } = scriptedFetch([{ status: 200, body: { candidates: [] } }]);
    const gemini = createGemini({ apiKey: "k", model: "m", fetchImpl });
    await assert.rejects(gemini.generateJson("p", {}), { status: 502 });
  });
});

describe("retryDelayMs", () => {
  it("uses Gemini's hint, or backs off exponentially", () => {
    assert.equal(retryDelayMs('"retryDelay": "2.5s"', 0), 2500);
    assert.equal(retryDelayMs("", 0), 1000);
    assert.equal(retryDelayMs("", 1), 2000);
  });

  it("does not wait out a long limit such as a daily quota", () => {
    assert.equal(retryDelayMs('"retryDelay": "51623s"', 0), null);
  });
});
