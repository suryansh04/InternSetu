import type { InterviewAttempt } from "./types";

export const PREP_SECONDS = 20;
export const ANSWER_SECONDS = 90;
export const MAX_ROLE_LENGTH = 200;

export type Phase =
  | "setup" // choosing a role
  | "loading" // asking for questions
  | "ready" // questions ready, not started
  | "prep" // reading the question
  | "recording"
  | "saving" // waiting for the last uploads
  | "done"
  | "flagged"; // left the tab mid-interview

export type FlagReason = "tab-hidden" | "window-blur" | "page-exit";

/** Phases shown full screen, where leaving the tab ends the attempt. */
export const isLocked = (phase: Phase) =>
  phase === "prep" || phase === "recording" || phase === "saving";

/** The best recording format this browser supports. */
export function pickMimeType(isSupported = (type: string) => MediaRecorder.isTypeSupported(type)) {
  return ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(
    isSupported,
  );
}

/** 75 -> "1:15" */
export const formatClock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const STUCK_AFTER_MS = 15 * 60 * 1000;

/** An attempt still processing after 15 minutes was lost (e.g. a server restart). */
export const isStuck = (attempt: InterviewAttempt, now = Date.now()) =>
  attempt.status === "processing" && now - new Date(attempt.created_at).getTime() > STUCK_AFTER_MS;

export interface InterviewSession {
  id: string;
  role: string;
  createdAt: string;
  attempts: InterviewAttempt[];
}

/**
 * Group attempts (newest first) into sessions (newest first), with each
 * session's answers in the order the questions were asked.
 */
export function groupBySession(attempts: InterviewAttempt[]): InterviewSession[] {
  const sessions = new Map<string, InterviewSession>();
  for (const attempt of attempts) {
    let session = sessions.get(attempt.session_id);
    if (!session) {
      session = {
        id: attempt.session_id,
        role: attempt.role,
        createdAt: attempt.created_at,
        attempts: [],
      };
      sessions.set(attempt.session_id, session);
    }
    session.attempts.unshift(attempt);
  }
  return [...sessions.values()];
}
