import { useCallback, useEffect, useRef, useState } from "react";

const CONSTRAINTS: MediaStreamConstraints = {
  audio: true,
  video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
};

/** The camera and microphone stream, released when the component unmounts. */
export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
      setStream(media);
      return media;
    } catch {
      setError("Allow camera and microphone access in your browser to practise.");
      return null;
    }
  }, []);

  const stop = useCallback(() => {
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop());
      return null;
    });
  }, []);

  const latest = useRef(stream);
  useEffect(() => {
    latest.current = stream;
  }, [stream]);
  useEffect(() => () => latest.current?.getTracks().forEach((track) => track.stop()), []);

  return { stream, error, start, stop };
}
