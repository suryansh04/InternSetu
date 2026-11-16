import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { groupBySession } from "@/lib/interview";
import type { InterviewAttempt } from "@/lib/types";
import { AttemptCard } from "./AttemptCard";

/** Past interviews, newest first, each with its answers in question order. */
export function InterviewResults({ attempts }: { attempts: InterviewAttempt[] | undefined }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Your results</h2>
      {!attempts ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
      ) : attempts.length === 0 ? (
        <EmptyState title="No practice yet">
          Your transcripts, scores and feedback will appear here after your first interview.
        </EmptyState>
      ) : (
        groupBySession(attempts).map((session) => (
          <div key={session.id} className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {session.role} · {new Date(session.createdAt).toLocaleString()}
            </h3>
            {session.attempts.map((attempt) => (
              <AttemptCard key={attempt.id} attempt={attempt} />
            ))}
          </div>
        ))
      )}
    </section>
  );
}
