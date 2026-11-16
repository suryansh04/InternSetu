import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Shows a live camera stream, mirrored like a selfie view. */
export function CameraView({
  stream,
  className,
}: {
  stream: MediaStream | null;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) video.play().catch(() => {});
  }, [stream]);

  return (
    <div className={cn("relative overflow-hidden bg-zinc-900", className)}>
      <video
        ref={videoRef}
        muted
        playsInline
        aria-label="Your camera"
        className={cn("h-full w-full -scale-x-100 object-cover", !stream && "hidden")}
      />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
          Camera off
        </div>
      )}
    </div>
  );
}
