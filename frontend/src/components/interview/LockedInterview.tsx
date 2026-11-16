import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatClock, type Phase } from "@/lib/interview";
import { CameraView } from "./CameraView";

interface LockedInterviewProps {
  role: string;
  question: string;
  number: number;
  total: number;
  phase: Phase;
  secondsLeft: number;
  stream: MediaStream | null;
  onStartAnswering: () => void;
  onStopAnswering: () => void;
}

/** The full-screen view while a question is being prepared, answered or saved. */
export function LockedInterview({
  role,
  question,
  number,
  total,
  phase,
  secondsLeft,
  stream,
  onStartAnswering,
  onStopAnswering,
}: LockedInterviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b px-6 py-3 text-sm text-muted-foreground">
        <span>{role}</span>
        <span>
          Question {number} of {total}
        </span>
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6">
        <p className="text-2xl leading-snug font-semibold md:text-3xl">{question}</p>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <Countdown phase={phase} seconds={secondsLeft} />
          <CameraView stream={stream} className="h-28 w-44 rounded-lg border" />
        </div>
        <div className="flex justify-center">
          {phase === "prep" && (
            <Button size="lg" onClick={onStartAnswering}>
              <Mic /> Start answering now
            </Button>
          )}
          {phase === "recording" && (
            <Button size="lg" variant="destructive" onClick={onStopAnswering}>
              <Square /> I'm done
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Stay on this tab. Switching away ends the attempt.
        </p>
      </div>
    </div>
  );
}

function Countdown({ phase, seconds }: { phase: Phase; seconds: number }) {
  if (phase === "saving") {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin" /> Saving your answers…
      </div>
    );
  }
  const recording = phase === "recording";
  return (
    <div aria-live="polite">
      <div
        className={
          recording ? "text-xs font-semibold text-red-600" : "text-xs text-muted-foreground"
        }
      >
        {recording ? "● RECORDING" : "THINK"}
      </div>
      <div className="font-mono text-5xl tabular-nums">{formatClock(seconds)}</div>
    </div>
  );
}
