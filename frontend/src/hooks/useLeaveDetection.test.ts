import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useLeaveDetection } from "./useLeaveDetection";

describe("useLeaveDetection", () => {
  it("reports leaving the window once while active", () => {
    const onLeave = vi.fn();
    renderHook(() => useLeaveDetection(true, onLeave));
    window.dispatchEvent(new Event("blur"));
    window.dispatchEvent(new Event("blur"));
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(onLeave).toHaveBeenCalledWith("window-blur");
  });

  it("ignores leaving while inactive", () => {
    const onLeave = vi.fn();
    renderHook(() => useLeaveDetection(false, onLeave));
    window.dispatchEvent(new Event("blur"));
    expect(onLeave).not.toHaveBeenCalled();
  });

  it("stops listening when it becomes inactive", () => {
    const onLeave = vi.fn();
    const { rerender } = renderHook(({ active }) => useLeaveDetection(active, onLeave), {
      initialProps: { active: true },
    });
    rerender({ active: false });
    window.dispatchEvent(new Event("pagehide"));
    expect(onLeave).not.toHaveBeenCalled();
  });
});
