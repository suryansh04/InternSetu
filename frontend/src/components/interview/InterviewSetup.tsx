import type { FormEvent, ReactNode } from "react";
import { AlertTriangle, Camera, CameraOff, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ANSWER_SECONDS, MAX_ROLE_LENGTH, PREP_SECONDS, type Phase } from "@/lib/interview";
import { CameraView } from "./CameraView";

interface InterviewSetupProps {
  phase: Phase;
  role: string;
  onRoleChange: (role: string) => void;
  onGenerate: () => void;
  onStart: () => void;
  onChangeRole: () => void;
  camera: {
    stream: MediaStream | null;
    error: string | null;
    start: () => void;
    stop: () => void;
  };
}

/** Choose a role, get questions, test the camera, and start. */
export function InterviewSetup({
  phase,
  role,
  onRoleChange,
  onGenerate,
  onStart,
  onChangeRole,
  camera,
}: InterviewSetupProps) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onGenerate();
  };

  return (
    <section className="grid gap-6 rounded-xl border bg-card p-6 md:grid-cols-[1fr_16rem]">
      <div className="space-y-4">
        {phase === "done" && (
          <Notice icon={<CheckCircle2 className="text-emerald-600" />} title="Answers submitted">
            Your answers are being transcribed and scored. Results appear below in about a minute.
          </Notice>
        )}
        {phase === "flagged" && (
          <Notice icon={<AlertTriangle className="text-destructive" />} title="Attempt ended">
            You left the interview tab, so this attempt was stopped and flagged. Start a new one
            when you are ready.
          </Notice>
        )}

        {phase === "ready" ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Ready when you are</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Two questions for "{role}". You see each one only when the interview starts.</li>
              <li>
                {PREP_SECONDS} seconds to think, then up to {ANSWER_SECONDS} seconds to answer on
                camera.
              </li>
              <li>The interview goes full screen. Leaving the tab ends the attempt.</li>
            </ul>
            <div className="flex gap-2">
              <Button onClick={onStart}>Start interview</Button>
              <Button variant="outline" onClick={onChangeRole}>
                Change role
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Label htmlFor="role">Which internship are you practising for?</Label>
            <Input
              id="role"
              value={role}
              maxLength={MAX_ROLE_LENGTH}
              placeholder="e.g. Backend Developer Intern"
              onChange={(e) => onRoleChange(e.target.value)}
            />
            <Button type="submit" disabled={!role.trim() || phase === "loading"}>
              {phase === "loading" && <Loader2 className="animate-spin" />}
              {phase === "done" || phase === "flagged" ? "Practise again" : "Get questions"}
            </Button>
          </form>
        )}
      </div>

      <div className="space-y-2">
        <CameraView stream={camera.stream} className="aspect-video w-full rounded-lg" />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={camera.stream ? camera.stop : camera.start}
        >
          {camera.stream ? <CameraOff /> : <Camera />}
          {camera.stream ? "Turn camera off" : "Test camera"}
        </Button>
        {camera.error && (
          <p className="text-xs text-destructive" role="alert">
            {camera.error}
          </p>
        )}
      </div>
    </section>
  );
}

function Notice({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-lg border bg-muted/40 p-4 text-sm" role="status">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
