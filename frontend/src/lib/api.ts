import { supabase } from "./supabase";
import type { Match, StudentProfile } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const MATCHING_URL = import.meta.env.VITE_MATCHING_URL ?? "http://localhost:8000";

/** Fetch from one of our services with the user's access token, and turn
 * error responses into Errors whose message is safe to show. */
async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (typeof init.body === "string") headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    throw new Error("Can't reach the server. Check that the backend is running.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? body?.detail ?? `Request failed (${res.status}).`);
  }
  return body as T;
}

export const api = {
  parseResume(file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<{ profile: Partial<StudentProfile> }>(`${API_URL}/api/resume/parse`, {
      method: "POST",
      body: form,
    });
  },

  matches(profile: StudentProfile) {
    const { skills, interests, location, duration_months } = profile;
    return request<{ matches: Match[] }>(`${MATCHING_URL}/match`, {
      method: "POST",
      body: JSON.stringify({ skills, interests, location, duration_months }),
    });
  },

  interviewQuestions(role: string) {
    return request<{ questions: string[] }>(`${API_URL}/api/interview/questions`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });
  },

  submitAnswer(input: { sessionId: string; role: string; question: string; video: Blob }) {
    const form = new FormData();
    form.append("sessionId", input.sessionId);
    form.append("role", input.role);
    form.append("question", input.question);
    form.append("video", input.video, "answer.webm");
    return request<{ attemptId: string }>(`${API_URL}/api/interview/answers`, {
      method: "POST",
      body: form,
    });
  },

  flagInterview(input: { sessionId: string; role: string; question: string; reason: string }) {
    return request<{ ok: true }>(`${API_URL}/api/interview/flags`, {
      method: "POST",
      body: JSON.stringify(input),
      keepalive: true, // still delivered if the tab is closing
    });
  },
};
