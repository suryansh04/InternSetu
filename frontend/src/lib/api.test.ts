import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: "token-123" } } }) },
  },
}));

const { api } = await import("./api");

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("api", () => {
  it("sends the user's token and JSON body", async () => {
    fetchMock.mockResolvedValue(reply(200, { questions: ["a", "b"] }));
    const result = await api.interviewQuestions("Backend intern");

    expect(result.questions).toEqual(["a", "b"]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/interview\/questions$/);
    expect(init.headers.get("Authorization")).toBe("Bearer token-123");
    expect(init.headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ role: "Backend intern" });
  });

  it("only sends the fields the matching API needs", async () => {
    fetchMock.mockResolvedValue(reply(200, { matches: [] }));
    await api.matches({ name: "A", location: "Pune", skills: ["Go"], interests: [], duration_months: 3 });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ skills: ["Go"], interests: [], location: "Pune", duration_months: 3 });
  });

  it("surfaces the server's error message (Express style)", async () => {
    fetchMock.mockResolvedValue(reply(415, { error: "Only PDF resumes are supported." }));
    await expect(api.parseResume(new File(["x"], "a.pdf"))).rejects.toThrow("Only PDF resumes are supported.");
  });

  it("surfaces the server's error message (FastAPI style)", async () => {
    fetchMock.mockResolvedValue(reply(401, { detail: "Sign in to see matches." }));
    await expect(
      api.matches({ name: "A", location: "Pune", skills: ["Go"], interests: [], duration_months: 3 }),
    ).rejects.toThrow("Sign in to see matches.");
  });

  it("explains when the server cannot be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api.interviewQuestions("x")).rejects.toThrow(/Can't reach the server/);
  });
});
