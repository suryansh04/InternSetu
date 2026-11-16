import { describe, expect, it } from "vitest";
import { isProfileComplete, matchFields } from "./profile";
import type { StudentProfile } from "./types";

const profile: StudentProfile = {
  name: "Asha",
  location: "Pune, India",
  skills: ["SQL", "Python"],
  interests: ["Backend"],
  duration_months: 3,
};

describe("isProfileComplete", () => {
  it("needs skills, a location and availability", () => {
    expect(isProfileComplete(profile)).toBe(true);
    expect(isProfileComplete({ ...profile, skills: [] })).toBe(false);
    expect(isProfileComplete({ ...profile, location: "" })).toBe(false);
    expect(isProfileComplete({ ...profile, duration_months: 0 })).toBe(false);
    expect(isProfileComplete(undefined)).toBe(false);
  });
});

describe("matchFields", () => {
  it("ignores the name, case and skill order", () => {
    const renamed = { ...profile, name: "Asha V", skills: ["python", "SQL"] };
    expect(matchFields(renamed)).toEqual(matchFields(profile));
  });

  it("changes when a matching field changes", () => {
    expect(matchFields({ ...profile, duration_months: 6 })).not.toEqual(matchFields(profile));
  });
});
