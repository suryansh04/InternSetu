import { AlertTriangle, Loader2 } from "lucide-react";
import type { InterviewAttempt, InterviewCriterion } from "@/lib/types";

const CRITERIA: { key: InterviewCriterion; label: string }[] = [
  { key: "content", label: "Content" },
  { key: "correctness", label: "Correctness" },
  { key: "fluency", label: "Fluency" },
  { key: "grammar", label: "Grammar" },
  { key: "confidence", label: "Confidence" },
];

const FLAG_TEXT: Record<string, string> = {
  "tab-hidden": "You switched tabs",
  "window-blur": "You left the window",
  "page-exit": "You closed or reloaded the page",
};

export function AttemptCard({ attempt }: { attempt: InterviewAttempt }) {
  const scores = attempt.scores;
  return (
    <article className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="font-medium">{attempt.question}</p>
        {attempt.status === "scored" && attempt.total_score !== null && (
          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {attempt.total_score}/50
          </span>
        )}
      </div>

      {attempt.status === "processing" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Transcribing and scoring…
        </p>
      )}

      {attempt.status === "failed" && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {attempt.flagged_reason
            ? `Attempt stopped: ${FLAG_TEXT[attempt.flagged_reason] ?? attempt.flagged_reason}.`
            : "This answer could not be scored."}
        </p>
      )}

      {attempt.status === "scored" && scores && (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-5">
            {CRITERIA.map(({ key, label }) => (
              <div key={key}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${scores[key] * 10}%` }}
                    />
                  </span>
                  <span className="tabular-nums">{scores[key]}</span>
                </dd>
              </div>
            ))}
          </dl>
          {attempt.feedback && <p className="text-sm">{attempt.feedback}</p>}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Transcript</summary>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
              {attempt.transcript || "No speech detected."}
            </p>
          </details>
        </>
      )}
    </article>
  );
}
