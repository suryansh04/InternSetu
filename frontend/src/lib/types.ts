export interface Internship {
  id: string;
  title: string;
  organization: string;
  location: string;
  duration_months: number | null;
  stipend: string | null;
  skills_required: string[];
  skills_preferred: string[];
  description: string;
}

/** The parts of a match score, each 0-100. */
export interface MatchParts {
  required_skills: number;
  preferred_skills: number;
  location: number;
  duration: number;
  semantic: number;
}

export interface Match {
  internship: Internship;
  match: { score: number; parts: MatchParts };
}

/** What the matching API needs to know about a student. */
export interface StudentProfile {
  name: string;
  location: string;
  skills: string[];
  interests: string[];
  duration_months: number;
}

export type InterviewCriterion = "fluency" | "correctness" | "grammar" | "confidence" | "content";

export interface InterviewAttempt {
  id: string;
  session_id: string;
  role: string;
  question: string;
  transcript: string | null;
  scores: Record<InterviewCriterion, number> | null;
  total_score: number | null;
  feedback: string | null;
  status: "processing" | "scored" | "failed";
  flagged_reason: string | null;
  created_at: string;
}
