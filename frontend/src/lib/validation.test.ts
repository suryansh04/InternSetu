import { describe, expect, it } from "vitest";
import { PROFILE_LIMITS } from "./limits";
import type { StudentProfile } from "./types";
import { validateProfile } from "./validation";

const valid: StudentProfile = {
  name: "Asha Verma",
  location: "Pune, India",
  skills: ["Python"],
  interests: [],
  duration_months: 3,
};

describe("validateProfile", () => {
  it("accepts a complete profile, with or without interests", () => {
    expect(validateProfile(valid)).toEqual({});
  });

  it("flags every missing required field at once", () => {
    const errors = validateProfile({ ...valid, name: " ", location: "", skills: [] });
    expect(Object.keys(errors).sort()).toEqual(["location", "name", "skills"]);
  });

  it.each([0, 25, 2.5, Number.NaN])("rejects %s months", (months) => {
    expect(validateProfile({ ...valid, duration_months: months }).duration_months).toBeDefined();
  });

  it("enforces the same limits as the database", () => {
    const tooMany = (n: number) => Array.from({ length: n }, (_, i) => `item-${i}`);
    const errors = validateProfile({
      ...valid,
      name: "x".repeat(PROFILE_LIMITS.nameLength + 1),
      location: "x".repeat(PROFILE_LIMITS.locationLength + 1),
      skills: tooMany(PROFILE_LIMITS.skills + 1),
      interests: tooMany(PROFILE_LIMITS.interests + 1),
    });
    expect(Object.keys(errors).sort()).toEqual(["interests", "location", "name", "skills"]);
  });
});
