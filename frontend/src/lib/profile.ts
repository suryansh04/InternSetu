import type { StudentProfile } from "./types";

/** A profile is complete once it has enough for matching. */
export const isProfileComplete = (p: StudentProfile | null | undefined): p is StudentProfile =>
  !!p && p.skills.length > 0 && !!p.location && p.duration_months > 0;

/**
 * Only the fields that affect matching, normalised and in a stable order:
 * renaming yourself or reordering skills reuses cached matches.
 */
export function matchFields(p: StudentProfile) {
  const sorted = (items: string[]) => items.map((x) => x.toLowerCase()).sort();
  return {
    skills: sorted(p.skills),
    interests: sorted(p.interests),
    location: p.location.toLowerCase(),
    months: p.duration_months,
  };
}
