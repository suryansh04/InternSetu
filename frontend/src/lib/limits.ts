// Limits shared by the forms. They match the database constraints
// (supabase/migrations) and the matching API, so valid input is never rejected later.

export const PROFILE_LIMITS = {
  nameLength: 100,
  locationLength: 120,
  skills: 40,
  interests: 10,
  minMonths: 1,
  maxMonths: 24,
} as const;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_RESUME_MB = 5;
