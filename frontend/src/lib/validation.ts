import { PROFILE_LIMITS } from "./limits";
import type { StudentProfile } from "./types";

export type ProfileErrors = Partial<Record<keyof StudentProfile, string>>;

/** Check a profile before saving. Returns a message per invalid field. */
export function validateProfile(p: StudentProfile): ProfileErrors {
  const errors: ProfileErrors = {};
  const name = p.name.trim();
  const location = p.location.trim();
  const { minMonths, maxMonths } = PROFILE_LIMITS;

  if (name.length < 2) errors.name = "Enter your name.";
  else if (name.length > PROFILE_LIMITS.nameLength) errors.name = "That name is too long.";

  if (location.length < 2) errors.location = "Enter your city, e.g. Pune, India.";
  else if (location.length > PROFILE_LIMITS.locationLength)
    errors.location = "That location is too long.";

  if (p.skills.length === 0) errors.skills = "Add at least one skill.";
  else if (p.skills.length > PROFILE_LIMITS.skills) {
    errors.skills = `Keep it to your top ${PROFILE_LIMITS.skills} skills.`;
  }

  if (p.interests.length > PROFILE_LIMITS.interests) {
    errors.interests = `Keep it to ${PROFILE_LIMITS.interests} interests.`;
  }

  const months = p.duration_months;
  if (!Number.isInteger(months) || months < minMonths || months > maxMonths) {
    errors.duration_months = `Enter a number of months from ${minMonths} to ${maxMonths}.`;
  }
  return errors;
}
