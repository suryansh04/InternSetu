import { describe, expect, it } from "vitest";
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
  it("accepts a complete profile", () => {
    expect(validateProfile(valid)).toEqual({});
  });

  it("does not require interests", () => {
    expect(validateProfile({ ...valid, interests: [] })).toEqual({});
  });

  it("flags every missing required field at once", () => {
    const errors = validateProfile({ ...valid, name: " ", location: "", skills: [] });
    expect(Object.keys(errors).sort()).toEqual(["location", "name", "skills"]);
  });

  it.each([0, 25, 2.5, Number.NaN])("rejects %s months", (months) => {
    expect(validateProfile({ ...valid, duration_months: months }).duration_months).toBeDefined();
  });
});
