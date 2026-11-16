// Shared contracts between the API's layers. The JavaScript is type-checked
// against these through JSDoc (`npm run typecheck`).

export type Criterion = "fluency" | "correctness" | "grammar" | "confidence" | "content";
export type Scores = Record<Criterion, number>;

export interface ScoreResult {
  scores: Scores;
  total: number;
  feedback: string;
}

export interface StudentProfile {
  name: string | null;
  location: string | null;
  skills: string[];
  interests: string[];
  duration_months: number | null;
}

export type FlagReason = "tab-hidden" | "window-blur" | "page-exit";

export interface AuthUser {
  id: string;
  email?: string;
}

// ---- Outside services ------------------------------------------------------
export interface Gemini {
  generateJson(prompt: string, schema: object): Promise<unknown>;
}

export interface Deepgram {
  transcribeUrl(url: string): Promise<string>;
}

export interface VideoStore {
  upload(video: Buffer, options: { folder: string }): Promise<string>;
}

export interface TokenVerifier {
  /** Returns the signed-in user, or null for a missing, invalid or expired token. */
  verify(token: string): Promise<AuthUser | null>;
}

// ---- Persistence -------------------------------------------------------------
export interface NewAttempt {
  userId: string;
  sessionId: string;
  role: string;
  question: string;
  videoUrl: string;
}

export interface FlaggedAttempt {
  userId: string;
  sessionId: string;
  role: string;
  question: string;
  reason: FlagReason;
}

export interface AttemptStore {
  create(attempt: NewAttempt): Promise<string>;
  markScored(id: string, transcript: string, result: ScoreResult): Promise<void>;
  markFailed(id: string): Promise<void>;
  recordFlag(attempt: FlaggedAttempt): Promise<void>;
  failStale(olderThanMinutes: number): Promise<number>;
}

// ---- Services ----------------------------------------------------------------
export interface ResumeService {
  extractProfile(pdf: Buffer): Promise<StudentProfile>;
}

export interface InterviewAnswer {
  userId: string;
  sessionId: string;
  role: string;
  question: string;
  video: Buffer;
}

export interface InterviewService {
  generateQuestions(role: string): Promise<string[]>;
  submitAnswer(answer: InterviewAnswer): Promise<{ id: string; videoUrl: string }>;
  scoreAnswer(attempt: { id: string; question: string; videoUrl: string }): Promise<void>;
  flag(attempt: FlaggedAttempt): Promise<void>;
  failStaleAttempts(olderThanMinutes?: number): Promise<number>;
}

declare global {
  namespace Express {
    interface Request {
      /** Set by the requireUser middleware. */
      user: AuthUser;
    }
  }
}
