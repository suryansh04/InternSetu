import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCamera } from "@/hooks/useCamera";
import { useLeaveDetection } from "@/hooks/useLeaveDetection";
import { api } from "@/lib/api";
import {
  ANSWER_SECONDS,
  PREP_SECONDS,
  isLocked,
  pickMimeType,
  type FlagReason,
  type Phase,
} from "@/lib/interview";

const newSessionId = () => crypto.randomUUID();

/**
 * The interview state machine:
 * setup -> loading -> ready -> (prep -> recording) x questions -> saving -> done,
 * with any locked phase ending in "flagged" if the user leaves the tab.
 *
 * Answers upload in the background so the next question starts at once; only
 * the end of the interview waits for them.
 */
export function useInterviewSession({ onAnswerSaved }: { onAnswerSaved: () => void }) {
  const camera = useCamera();
  const { stream, start: startCamera, stop: stopCamera } = camera;

  const [role, setRole] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState(newSessionId);
  const [phase, setPhase] = useState<Phase>("setup");
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const uploadsRef = useRef<Promise<unknown>[]>([]);
  const flaggedRef = useRef(false); // once flagged, nothing more is uploaded

  const finish = useCallback(
    (next: "done" | "flagged") => {
      setPhase(next);
      stopCamera();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    },
    [stopCamera],
  );

  const generateQuestions = async () => {
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

  const start = async () => {
    if (!(stream ?? (await startCamera()))) return;
    flaggedRef.current = false;
    uploadsRef.current = [];
    setIndex(0);
    setSecondsLeft(PREP_SECONDS);
    setPhase("prep");
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const startAnswering = useCallback(() => {
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

  const stopAnswering = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.onstop = async () => {
      if (flaggedRef.current) return;
      const video = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      uploadsRef.current.push(
        api
          .submitAnswer({ sessionId, role, question: questions[index], video })
          .then(() => onAnswerSaved())
          .catch((err: Error) => toast.error(`Your answer could not be saved: ${err.message}`)),
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
      // The user may have left the tab while we waited: keep the "flagged" state.
      if (!flaggedRef.current) finish("done");
    };
    recorder.stop();
  }, [finish, index, onAnswerSaved, questions, role, sessionId]);

  // One timer drives both countdowns.
  useEffect(() => {
    if (phase !== "prep" && phase !== "recording") return;
    if (secondsLeft <= 0) {
      if (phase === "prep") startAnswering();
      else stopAnswering();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft, startAnswering, stopAnswering]);

  // Leaving the tab during the interview ends and flags the attempt.
  useLeaveDetection(isLocked(phase), (reason: FlagReason) => {
    flaggedRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    api
      .flagInterview({ sessionId, role, question: questions[index], reason })
      .then(() => onAnswerSaved())
      .catch(() => {});
    finish("flagged");
  });

  const reset = () => {
    setPhase("setup");
    setQuestions([]);
    setIndex(0);
  };

  return {
    camera,
    role,
    setRole,
    questions,
    phase,
    index,
    secondsLeft,
    generateQuestions,
    start,
    startAnswering,
    stopAnswering,
    reset,
  };
}
