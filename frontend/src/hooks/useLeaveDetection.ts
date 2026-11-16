import { useEffect, useRef } from "react";
import type { FlagReason } from "@/lib/interview";

/**
 * While `active`, calls `onLeave` once if the user switches tabs, focuses
 * another window, or closes the page.
 */
export function useLeaveDetection(active: boolean, onLeave: (reason: FlagReason) => void) {
  // Keep the latest callback without re-subscribing on every render.
  const callback = useRef(onLeave);
  useEffect(() => {
    callback.current = onLeave;
  }, [onLeave]);

  useEffect(() => {
    if (!active) return;
    let fired = false;
    const leave = (reason: FlagReason) => {
      if (fired) return;
      fired = true;
      callback.current(reason);
    };
    const onVisibility = () => document.visibilityState === "hidden" && leave("tab-hidden");
    const onBlur = () => leave("window-blur");
    const onPageHide = () => leave("page-exit");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [active]);
}
