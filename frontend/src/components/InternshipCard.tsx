import { memo, useMemo } from "react";
import { Bookmark, BookmarkCheck, Check, Clock, IndianRupee, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Internship, MatchParts } from "@/lib/types";
import { cn } from "@/lib/utils";

const PART_LABELS: Record<keyof MatchParts, string> = {
  required_skills: "Required skills",
  preferred_skills: "Preferred skills",
  location: "Location",
  duration: "Availability",
  semantic: "Similar to your profile",
};

function scoreTone(score: number) {
  if (score >= 70) return "bg-emerald-100 text-emerald-800";
  if (score >= 45) return "bg-amber-100 text-amber-800";
  return "bg-muted text-muted-foreground";
}

interface InternshipCardProps {
  internship: Internship;
  score?: number;
  parts?: MatchParts;
  studentSkills?: string[];
  isSaved: boolean;
  isApplied: boolean;
  onToggleSaved: (internship: Internship) => void;
  onToggleApplied: (internship: Internship) => void;
}

/** Memoised: toggling one card's Save or Apply re-renders only that card. */
export const InternshipCard = memo(function InternshipCard({
  internship,
  score,
  parts,
  studentSkills = [],
  isSaved,
  isApplied,
  onToggleSaved,
  onToggleApplied,
}: InternshipCardProps) {
  const mine = useMemo(() => new Set(studentSkills.map((s) => s.toLowerCase())), [studentSkills]);

  return (
    <Card>
      <CardHeader className="gap-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-lg">{internship.title}</CardTitle>
            <CardDescription className="font-medium">{internship.organization}</CardDescription>
          </div>
          {score !== undefined && (
            <span
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-sm font-semibold",
                scoreTone(score),
              )}
              aria-label={`Match score ${Math.round(score)} out of 100`}
            >
              {Math.round(score)}% match
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{internship.description}</p>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {internship.location}
          </span>
          {internship.duration_months && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" /> {internship.duration_months} months
            </span>
          )}
          {internship.stipend && (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <IndianRupee className="h-4 w-4" /> {internship.stipend.replace(/^₹/, "")}
            </span>
          )}
        </div>

        <ul className="flex flex-wrap gap-1.5" aria-label="Required skills">
          {internship.skills_required.map((skill) => {
            const have = mine.has(skill.toLowerCase());
            return (
              <li
                key={skill}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                  have
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {have && <Check className="h-3 w-3" aria-label="You have this skill" />}
                {skill}
              </li>
            );
          })}
        </ul>

        {parts && (
          <details className="group rounded-md border px-3 py-2 text-sm">
            <summary className="cursor-pointer select-none font-medium">Why this score?</summary>
            <dl className="mt-3 space-y-2">
              {(Object.keys(PART_LABELS) as (keyof MatchParts)[]).map((key) => (
                <div key={key} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3">
                  <dt className="text-muted-foreground">{PART_LABELS[key]}</dt>
                  <dd className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${parts[key]}%` }}
                    />
                  </dd>
                  <dd className="text-right tabular-nums">{Math.round(parts[key])}%</dd>
                </div>
              ))}
            </dl>
          </details>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleSaved(internship)}
            aria-pressed={isSaved}
          >
            {isSaved ? <BookmarkCheck /> : <Bookmark />}
            {isSaved ? "Saved" : "Save"}
          </Button>
          <Button
            size="sm"
            variant={isApplied ? "secondary" : "default"}
            onClick={() => onToggleApplied(internship)}
            aria-pressed={isApplied}
          >
            {isApplied && <Check />}
            {isApplied ? "Applied" : "Mark as applied"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
