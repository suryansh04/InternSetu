import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, Camera, CameraOff, CheckCircle2, Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { AttemptCard } from "@/components/AttemptCard";
import { CameraView } from "@/components/CameraView";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInterviewAttempts } from "@/hooks/useStudentData";
import { api } from "@/lib/api";

const PREP_SECONDS = 20;
const ANSWER_SECONDS = 90;

type Phase =
  | "setup" // choosing a role
  | "loading" // asking for questions
  | "ready" // questions ready, not started
  | "prep" // reading the question
  | "recording"
  | "saving" // uploading an answer
  | "done"
  | "flagged"; // left the tab mid-interview

type FlagReason = "tab-hidden" | "window-blur" | "page-exit";
const LOCKED: Phase[] = ["prep", "recording", "saving"];

const newSessionId = () => crypto.randomUUID();

function pickMimeType() {
  return ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );
}

export default function InterviewPage() {
  const attempts = useInterviewAttempts();
  const refetchAttempts = attempts.refetch;

  const [role, setRole] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState(newSessionId);
  const [phase, setPhase] = useState<Phase>("setup");
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const discardRef = useRef(false); // set when an attempt is flagged, so nothing uploads
  // Uploads run in the background so the next question starts at once;
  // only the end of the interview waits for them.
  const uploadsRef = useRef<Promise<unknown>[]>([]);

  // ----- camera -----
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(media);
      return media;
    } catch {
      setCameraError("Allow camera and microphone access in your browser to practise.");
      return null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((t) => t.stop());
      return null;
    });
  }, []);

  // Release the camera when leaving the page.
  const streamRef = useRef(stream);
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  // ----- questions -----
  const onGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!role.trim()) return;
    setPhase("loading");
    try {
      const { questions } = await api.interviewQuestions(role.trim());
      setQuestions(questions);
      setSessionId(newSessionId());
      setIndex(0);
      setPhase("ready");
    } catch (err) {
      toast.error((err as Error).message);
      setPhase("setup");
    }
  };

  const onStart = async () => {
    const media = stream ?? (await startCamera());
    if (!media) return;
    discardRef.current = false;
    uploadsRef.current = [];
    setIndex(0);
    setSecondsLeft(PREP_SECONDS);
    setPhase("prep");
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const finish = useCallback(
    (next: "done" | "flagged") => {
      setPhase(next);
      stopCamera();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    },
    [stopCamera],
  );

  // ----- recording -----
  const startRecording = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: pickMimeType() });
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorderRef.current = recorder;
    recorder.start(1000);
    setSecondsLeft(ANSWER_SECONDS);
    setPhase("recording");
  }, [stream]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.onstop = async () => {
      if (discardRef.current) return;
      const video = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      uploadsRef.current.push(
        api
          .submitAnswer({ sessionId, role, question: questions[index], video })
          .then(() => refetchAttempts())
          .catch((err) => toast.error(`Your answer could not be saved: ${(err as Error).message}`)),
      );
      if (index + 1 < questions.length) {
        setIndex(index + 1);
        setSecondsLeft(PREP_SECONDS);
        setPhase("prep");
        return;
      }
      setPhase("saving");
      await Promise.allSettled(uploadsRef.current);
      uploadsRef.current = [];
      // The user may have left the tab while we waited: keep the 'flagged' state.
      if (!discardRef.current) finish("done");
    };
    recorder.stop();
  }, [finish, index, questions, refetchAttempts, role, sessionId]);

  // One timer drives both countdowns.
  useEffect(() => {
    if (phase !== "prep" && phase !== "recording") return;
    if (secondsLeft <= 0) {
      if (phase === "prep") startRecording();
      else stopRecording();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft, startRecording, stopRecording]);

  // ----- integrity: leaving the tab during the interview ends it -----
  useEffect(() => {
    if (!LOCKED.includes(phase)) return;
    const flag = (reason: FlagReason) => {
      discardRef.current = true;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      api
        .flagInterview({ sessionId, role, question: questions[index], reason })
        .then(() => refetchAttempts())
        .catch(() => {});
      finish("flagged");
    };
    const onVisibility = () => document.visibilityState === "hidden" && flag("tab-hidden");
    const onBlur = () => flag("window-blur");
    const onPageHide = () => flag("page-exit");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [phase, finish, index, questions, role, sessionId, refetchAttempts]);

  const reset = () => {
    setPhase("setup");
    setQuestions([]);
    setIndex(0);
  };

  // ----- render -----
  if (LOCKED.includes(phase)) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center justify-between border-b px-6 py-3 text-sm text-muted-foreground">
          <span>{role}</span>
          <span>
            Question {index + 1} of {questions.length}
          </span>
        </div>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6">
          <p className="text-2xl font-semibold leading-snug md:text-3xl">{questions[index]}</p>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <Countdown phase={phase} seconds={secondsLeft} />
            <CameraView stream={stream} className="h-28 w-44 rounded-lg border" />
          </div>
          <div className="flex justify-center">
            {phase === "prep" && (
              <Button size="lg" onClick={startRecording}>
                <Mic /> Start answering now
              </Button>
            )}
            {phase === "recording" && (
              <Button size="lg" variant="destructive" onClick={stopRecording}>
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

  const sessions = groupBySession(attempts.data ?? []);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="grid gap-6 rounded-xl border bg-card p-6 md:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          {phase === "done" && (
            <Notice icon={<CheckCircle2 className="text-emerald-600" />} title="Answers submitted">
              Your answers are being transcribed and scored. Results appear below in about a minute.
            </Notice>
          )}
          {phase === "flagged" && (
            <Notice icon={<AlertTriangle className="text-destructive" />} title="Attempt ended">
              You left the interview tab, so this attempt was stopped and flagged. Start a new one when
              you are ready.
            </Notice>
          )}

          {phase === "ready" ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Ready when you are</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Two questions for "{role}". You see each one only when the interview starts.</li>
                <li>
                  {PREP_SECONDS} seconds to think, then up to {ANSWER_SECONDS} seconds to answer on camera.
                </li>
                <li>The interview goes full screen. Leaving the tab ends the attempt.</li>
              </ul>
              <div className="flex gap-2">
                <Button onClick={onStart}>Start interview</Button>
                <Button variant="outline" onClick={reset}>
                  Change role
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={onGenerate} className="space-y-3">
              <Label htmlFor="role">Which internship are you practising for?</Label>
              <Input
                id="role"
                value={role}
                maxLength={200}
                placeholder="e.g. Backend Developer Intern"
                onChange={(e) => setRole(e.target.value)}
              />
              <Button type="submit" disabled={!role.trim() || phase === "loading"}>
                {phase === "loading" && <Loader2 className="animate-spin" />}
                {phase === "done" || phase === "flagged" ? "Practise again" : "Get questions"}
              </Button>
            </form>
          )}
        </div>

        <div className="space-y-2">
          <CameraView stream={stream} className="aspect-video w-full rounded-lg" />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => (stream ? stopCamera() : startCamera())}
          >
            {stream ? <CameraOff /> : <Camera />}
            {stream ? "Turn camera off" : "Test camera"}
          </Button>
          {cameraError && (
            <p className="text-xs text-destructive" role="alert">
              {cameraError}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your results</h2>
        {attempts.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : sessions.length === 0 ? (
          <EmptyState title="No practice yet">
            Your transcripts, scores and feedback will appear here after your first interview.
          </EmptyState>
        ) : (
          sessions.map((session) => (
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
    </div>
  );
}

function Countdown({ phase, seconds }: { phase: Phase; seconds: number }) {
  const recording = phase === "recording";
  if (phase === "saving") {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin" /> Saving your answers…
      </div>
    );
  }
  return (
    <div aria-live="polite">
      <div className={recording ? "text-xs font-semibold text-red-600" : "text-xs text-muted-foreground"}>
        {recording ? "● RECORDING" : "THINK"}
      </div>
      <div className="font-mono text-5xl tabular-nums">
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </div>
    </div>
  );
}

function Notice({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
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

function groupBySession<T extends { session_id: string; role: string; created_at: string }>(rows: T[]) {
  const sessions = new Map<string, { id: string; role: string; createdAt: string; attempts: T[] }>();
  for (const row of rows) {
    const session = sessions.get(row.session_id) ?? {
      id: row.session_id,
      role: row.role,
      createdAt: row.created_at,
      attempts: [],
    };
    session.attempts.unshift(row); // rows arrive newest first; show questions in order
    sessions.set(row.session_id, session);
  }
  return [...sessions.values()];
}
