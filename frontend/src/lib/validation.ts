import type { StudentProfile } from "./types";

export type ProfileErrors = Partial<Record<keyof StudentProfile, string>>;

/** Check a profile before saving. Returns a message per invalid field. */
export function validateProfile(p: StudentProfile): ProfileErrors {
  const errors: ProfileErrors = {};
  if (p.name.trim().length < 2) errors.name = "Enter your name.";
  if (p.location.trim().length < 2) errors.location = "Enter your city, e.g. Pune, India.";
  if (p.skills.length === 0) errors.skills = "Add at least one skill.";
  if (!Number.isInteger(p.duration_months) || p.duration_months < 1 || p.duration_months > 24) {
    errors.duration_months = "Enter a number of months from 1 to 24.";
  }
  return errors;
}
