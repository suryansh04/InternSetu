import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Internship } from "@/lib/types";
import { InternshipCard } from "./InternshipCard";

const internship: Internship = {
  id: "i1",
  title: "Backend Developer Intern",
  organization: "Ledgerline",
  location: "Pune, India",
  duration_months: 3,
  stipend: "₹22,000/month",
  skills_required: ["Python", "SQL", "REST APIs"],
  skills_preferred: [],
  description: "Work on the payments service.",
};

const parts = {
  required_skills: 66.7,
  preferred_skills: 100,
  location: 100,
  duration: 100,
  semantic: 77,
};

function renderCard(overrides: Partial<Parameters<typeof InternshipCard>[0]> = {}) {
  const props = {
    internship,
    score: 83.4,
    parts,
    studentSkills: ["python", "SQL"],
    isSaved: false,
    isApplied: false,
    onToggleSaved: vi.fn(),
    onToggleApplied: vi.fn(),
    ...overrides,
  };
  render(<InternshipCard {...props} />);
  return props;
}

describe("InternshipCard", () => {
  it("shows the listing, its rounded score and the stipend without a doubled rupee sign", () => {
    renderCard();
    expect(screen.getByText("Backend Developer Intern")).toBeInTheDocument();
    expect(screen.getByLabelText("Match score 83 out of 100")).toHaveTextContent("83% match");
    expect(screen.getByText("22,000/month")).toBeInTheDocument();
  });

  it("ticks the required skills the student already has, case-insensitively", () => {
    renderCard();
    const skills = within(screen.getByRole("list", { name: "Required skills" }));
    expect(skills.getAllByLabelText("You have this skill")).toHaveLength(2);
  });

  it("explains the score part by part", () => {
    renderCard();
    expect(screen.getByText("Why this score?")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("Similar to your profile")).toBeInTheDocument();
  });

  it("passes the internship to the save and apply handlers", async () => {
    const user = userEvent.setup();
    const props = renderCard();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Mark as applied" }));
    expect(props.onToggleSaved).toHaveBeenCalledWith(internship);
    expect(props.onToggleApplied).toHaveBeenCalledWith(internship);
  });

  it("reflects saved and applied state", () => {
    renderCard({ isSaved: true, isApplied: true });
    expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Applied" })).toHaveAttribute("aria-pressed", "true");
  });

  it("hides the score when there is none (saved and applied lists)", () => {
    renderCard({ score: undefined, parts: undefined });
    expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
    expect(screen.queryByText("Why this score?")).not.toBeInTheDocument();
  });
});
