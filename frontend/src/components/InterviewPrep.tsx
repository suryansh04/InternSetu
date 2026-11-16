//-------------------------------------------OLD CODE --------------------------------------------------------------\

// src/components/InterviewFlow.tsx
import { useEffect, useRef, useState } from "react";
import {
  Play,
  Camera,
  StopCircle,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";

type GeneratedQuestion = { id: string; text: string };

export default function InterviewFlow({
  apiBase = "http://localhost:4000",
}: {
  apiBase?: string;
}) {
  const PREP_TIME = 5; // seconds
  const REC_TIME = 10; // seconds

  const [rolePrompt, setRolePrompt] = useState("");
  const [questions, setQuestions] = useState<GeneratedQuestion[] | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "generating" | "ready" | "blocked" | "prep" | "recording" | "done"
  >("idle");

  // media + timers
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [prepSeconds, setPrepSeconds] = useState(PREP_TIME);
  const [recSeconds, setRecSeconds] = useState(REC_TIME);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  const [userId] = useState(
    () => `user-${Math.random().toString(36).slice(2, 9)}`
  );
  const [isUploading, setUploading] = useState(false);

  // session + anti-cheat
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<{
    reason?: string;
    at?: string;
  } | null>(null);

  // preview state
  const [previewActive, setPreviewActive] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // --- generate questions from server ---
  async function generateQuestions() {
    if (!rolePrompt.trim()) return alert("Enter the role / prompt");
    setPhase("generating");
    try {
      const res = await fetch(`${apiBase}/api/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rolePrompt }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!Array.isArray(data.questions) || data.questions.length < 2)
        throw new Error("Expected 2 questions");
      // store questions but do not reveal until Start Attempt
      setQuestions(data.questions.slice(0, 2));
      setSessionId(
        (s) =>
          s ??
          `sess-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 6)}`
      );
      setPhase("ready");
    } catch (err: any) {
      console.error(err);
      alert("Failed to generate questions: " + (err?.message || err));
      setPhase("idle");
    }
  }

  async function tryRequestFullscreen() {
    try {
      const el = document.documentElement;
      if ((el as any).requestFullscreen) await (el as any).requestFullscreen();
    } catch (e) {
      /* ignore */
    }
  }

  // --- camera preview helpers ---
  async function startPreview() {
    setPreviewError(null);
    try {
      // get camera + mic
      const s = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      // replace any old stream (stop tracks)
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {}
      }

      streamRef.current = s;
      attachStreamToVideo(s);
      setPreviewActive(true);
    } catch (err: any) {
      console.error("startPreview error", err);
      setPreviewError(
        "Unable to access camera. Allow camera & microphone and try again."
      );
      setPreviewActive(false);
    }
  }

  function stopPreview() {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {}
    streamRef.current = null;
    setPreviewActive(false);
  }

  // attach stream to the video element robustly
  function attachStreamToVideo(stream: MediaStream) {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    try {
      videoEl.srcObject = stream;
      // ensure objectFit and mirrored preview
      videoEl.style.objectFit = "cover";
      videoEl.style.transform = "scaleX(-1)";
      // play once metadata is loaded (avoids black frame)
      const tryPlay = () => {
        try {
          const p = videoEl.play();
          if (p && typeof p.then === "function") {
            p.catch((e) => {
              // autoplay might be blocked; ignore, user can click preview
              console.warn("video play blocked", e);
            });
          }
        } catch (e) {
          /* ignore */
        }
      };
      videoEl.onloadedmetadata = () => tryPlay();
      // some browsers don't fire loadedmetadata reliably when replacing stream; also try immediate play
      setTimeout(tryPlay, 150);
    } catch (e) {
      console.warn("attachStreamToVideo failed", e);
    }
  }

  // --- start preview AND start interview (prep -> recording) ---
  async function startPreviewAndStart() {
    if (!questions) return alert("No questions generated");
    setPreviewError(null);
    try {
      // request fresh stream and replace preview stream (if any)
      const s = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      // stop any previous stream
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {}
      }

      streamRef.current = s;
      attachStreamToVideo(s);

      setCurrentQIndex(0);
      setPrepSeconds(PREP_TIME);
      setPhase("prep");

      attachAntiCheatListeners();
      document.documentElement.style.cursor = "none";
      setPreviewActive(true); // keep showing preview in locked UI
      tryRequestFullscreen();
    } catch (err: any) {
      console.error(err);
      alert(
        "Please allow camera and mic. The interview cannot proceed without them."
      );
    }
  }

  // PREP timer effect
  useEffect(() => {
    if (phase !== "prep") return;
    if (prepSeconds <= 0) {
      startRecordingForCurrentQuestion();
      return;
    }
    const t = setTimeout(() => setPrepSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prepSeconds]);

  // start recording
  function startRecordingForCurrentQuestion() {
    const stream = streamRef.current;
    if (!stream) {
      setPhase("blocked");
      return;
    }
    chunksRef.current = [];

    let options: MediaRecorderOptions = {};
    if ((MediaRecorder as any).isTypeSupported?.("video/webm;codecs=vp9"))
      options = { mimeType: "video/webm;codecs=vp9" };
    else if ((MediaRecorder as any).isTypeSupported?.("video/webm;codecs=vp8"))
      options = { mimeType: "video/webm;codecs=vp8" };

    try {
      const mr = new MediaRecorder(stream, options);
      recorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: chunksRef.current.length
            ? chunksRef.current[0].type
            : "video/webm",
        });
        await uploadAndFinalize(
          blob,
          questions![currentQIndex].id,
          questions![currentQIndex].text
        );
        if (currentQIndex === 0) {
          setCurrentQIndex(1);
          setPrepSeconds(PREP_TIME);
          setPhase("prep");
        } else {
          setPhase("done");
          try {
            streamRef.current?.getTracks().forEach((t) => t.stop());
          } catch (e) {}
          detachAntiCheatListeners();
          document.documentElement.style.cursor = "";
          setPreviewActive(false);
        }
      };

      mr.start();
      setRecSeconds(REC_TIME);
      setPhase("recording");

      const recTimer = setInterval(() => {
        setRecSeconds((s) => {
          if (s <= 1) {
            try {
              recorderRef.current?.stop();
            } catch (e) {}
            clearInterval(recTimer);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("startRecording failed", err);
      setPhase("blocked");
    }
  }

  function stopRecordingEarly() {
    try {
      recorderRef.current?.stop();
    } catch (e) {}
  }

  // upload
  async function uploadAndFinalize(
    file: Blob,
    questionId: string,
    questionText: string
  ) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("sessionId", sessionId || "local-session");
      form.append("questionId", questionId);
      form.append("userId", userId);
      form.append("questionText", questionText);
      form.append("file", file, `${userId}_${questionId}_${Date.now()}.webm`);

      const res = await fetch(`${apiBase}/api/upload-answer`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "upload failed");
      }
    } catch (err: any) {
      console.error(err);
      alert("Upload failed: " + (err?.message || err));
    } finally {
      setUploading(false);
    }
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      detachAntiCheatListeners();
      document.documentElement.style.cursor = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // anti-cheat
  function attachAntiCheatListeners() {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);
  }
  function detachAntiCheatListeners() {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("blur", handleBlur);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  }
  function handleVisibilityChange() {
    if (document.visibilityState !== "visible")
      flagAndBlock("visibilitychange");
  }
  function handleBlur() {
    flagAndBlock("blur");
  }
  function handleBeforeUnload(e: BeforeUnloadEvent) {
    try {
      navigator.sendBeacon?.(
        `${apiBase}/api/flag-suspicious`,
        JSON.stringify({ sessionId, userId, reason: "beforeunload" })
      );
    } catch (e) {}
    e.preventDefault();
    e.returnValue = "";
    return "";
  }
  async function flagAndBlock(reason: string) {
    if (flagged) return;
    const at = new Date().toISOString();
    setFlagged({ reason, at });
    setPhase("blocked");
    try {
      recorderRef.current?.stop();
    } catch (e) {}
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (e) {}
    detachAntiCheatListeners();
    document.documentElement.style.cursor = "";
    try {
      await fetch(`${apiBase}/api/flag-suspicious`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, userId, reason }),
      });
    } catch (e) {
      console.warn("flag-suspicious failed", e);
    }
  }

  const formattedSeconds = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // small modular components used below
  function Sidebar() {
    return (
      <div className="lg:col-span-1 bg-white border rounded-lg p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Role / prompt
          </label>
          <input
            value={rolePrompt}
            onChange={(e) => setRolePrompt(e.target.value)}
            placeholder='e.g. "Product Manager — e-commerce"'
            className="mt-2 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 py-2 px-3 bg-indigo-600 text-white rounded-md flex items-center justify-center gap-2"
            onClick={generateQuestions}
            disabled={phase === "generating"}
          >
            {phase === "generating" ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Generating...
              </>
            ) : (
              <>
                <Play size={16} /> Generate
              </>
            )}
          </button>

          <button
            className="px-3 py-2 border rounded-md flex items-center gap-2"
            onClick={() => (previewActive ? stopPreview() : startPreview())}
          >
            <Camera size={16} /> {previewActive ? "Stop" : "Preview"}
          </button>
        </div>

        <div className="text-sm text-gray-500">
          <div>
            <strong>Session:</strong> {sessionId ?? "not created"}
          </div>
          <div className="mt-2">
            User ID: <span className="font-mono">{userId}</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-2">Camera preview</div>
          <div className="aspect-video w-full overflow-hidden rounded-md bg-gray-900">
            {previewActive ? (
              <video
                // Re-attach the stream whenever this element is (re)mounted.
                ref={(el) => {
                  videoRef.current = el;
                  if (el && streamRef.current && el.srcObject !== streamRef.current) {
                    el.srcObject = streamRef.current;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-400">
                Camera off. Press Preview to test it.
              </div>
            )}
          </div>
          {previewError && (
            <p className="mt-2 text-xs text-red-600">{previewError}</p>
          )}
        </div>
      </div>
    );
  }

  function QuestionList() {
    return (
      <div>
        {phase === "ready" ? (
          <div className="rounded-md p-4 bg-yellow-50 text-sm text-yellow-900 border border-yellow-100">
            Questions generated — click <strong>Start Attempt (Locked)</strong>{" "}
            to begin and reveal the questions.
          </div>
        ) : (
          <ol className="list-decimal pl-5 space-y-2">
            {(questions ?? []).map((q, idx) => (
              <li
                key={q.id}
                className={`${
                  currentQIndex === idx ? "bg-yellow-50 p-3 rounded-md" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="pr-2">{q.text}</div>
                  <div className="text-xs text-gray-500">Q{idx + 1}</div>
                </div>
                {phase === "done" && idx <= currentQIndex && (
                  <div className="mt-2 text-xs text-green-700">Uploaded</div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  function MainPanel() {
    return (
      <div className="lg:col-span-2 bg-white border rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Questions for</div>
            <div className="font-semibold">{rolePrompt || "—"}</div>
          </div>
          <div className="text-xs text-gray-400">2 questions • locked flow</div>
        </div>

        <div className="mt-4 space-y-3">
          <QuestionList />

          <div className="mt-3">
            <progress
              className="w-full"
              value={
                questions
                  ? currentQIndex +
                    (phase === "done" ? 1 : phase === "recording" ? 0.5 : 0)
                  : 0
              }
              max={questions ? questions.length : 2}
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              className="flex-1 px-3 py-2 border rounded-md"
              onClick={() => {
                setCurrentQIndex(0);
                setPrepSeconds(PREP_TIME);
                setPhase("ready");
              }}
            >
              Reset
            </button>
            <button
              className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-md"
              onClick={() => {
                // create session if not created and start locked flow which reveals questions
                if (!sessionId) setSessionId(`sess-${Date.now().toString(36)}`);
                startPreviewAndStart();
              }}
              disabled={!questions}
            >
              Start Attempt (Locked)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- top-level render ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {(phase === "idle" || phase === "generating" || phase === "ready") && (
        <div className="max-w-5xl mx-auto p-6">
          <motion.header
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <h1 className="text-2xl md:text-3xl font-bold">
              AI Interview — 2 Questions
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Enter the role/prompt, generate questions, then start the locked
              interview flow.
            </p>
          </motion.header>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Sidebar />
            <MainPanel />
          </div>
        </div>
      )}

      {/* Locked fullscreen interview UI */}
      {(phase === "prep" ||
        phase === "recording" ||
        phase === "blocked" ||
        phase === "done") &&
        questions && (
          <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Interview — {sessionId}
              </div>
              <div className="text-sm text-gray-600">
                Question {currentQIndex + 1} / {questions.length}
              </div>
            </div>

            <div className="max-w-3xl mx-auto w-full px-6">
              <div className="rounded-xl border p-8 shadow-lg bg-white">
                <div className="text-sm text-gray-500 mb-4">Question</div>
                <div className="text-xl md:text-2xl font-semibold leading-snug">
                  {questions[currentQIndex].text}
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {phase === "prep" && (
                      <div className="text-center">
                        <div className="text-xs text-gray-500">PREP</div>
                        <div className="text-4xl font-mono">{prepSeconds}s</div>
                      </div>
                    )}
                    {phase === "recording" && (
                      <div className="text-center">
                        <div className="text-xs text-red-600">RECORDING</div>
                        <div className="text-4xl font-mono">
                          {formattedSeconds(recSeconds)}
                        </div>
                      </div>
                    )}
                    {phase === "blocked" && (
                      <div className="text-center text-red-600">
                        <AlertTriangle size={20} />
                        <div className="text-sm">
                          Attempt blocked: {flagged?.reason}
                        </div>
                      </div>
                    )}
                    {phase === "done" && (
                      <div className="text-center text-green-600">
                        <CheckCircle size={20} />
                        <div className="text-sm">Completed. Thank you.</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-36 h-24 rounded overflow-hidden border bg-black">
                      {/* locked flow uses same videoRef + stream */}
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        style={{ transform: "scaleX(-1)" }}
                      />
                    </div>

                    <div className="text-sm text-gray-600">
                      {isUploading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="animate-spin" size={14} />{" "}
                          Uploading...
                        </div>
                      ) : null}
                      <div className="mt-1">
                        User: <span className="font-mono">{userId}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center">
                  {phase === "recording" && (
                    <button
                      className="px-5 py-3 bg-red-600 text-white rounded-md flex items-center gap-2"
                      onClick={stopRecordingEarly}
                    >
                      <StopCircle size={18} /> Stop early
                    </button>
                  )}
                  {phase === "prep" && (
                    <div className="text-sm text-gray-500">
                      Prepare your answer. The recording will start
                      automatically.
                    </div>
                  )}
                  {phase === "blocked" && (
                    <div className="text-sm text-red-600">
                      You switched away from the test. This attempt has been
                      flagged.
                    </div>
                  )}
                  {phase === "done" && (
                    <div className="text-sm text-green-600">
                      Your answers were uploaded. You may close this tab.
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <progress
                    className="w-full"
                    value={
                      currentQIndex +
                      (phase === "done" ? 1 : phase === "recording" ? 0.5 : 0)
                    }
                    max={questions.length}
                  ></progress>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
