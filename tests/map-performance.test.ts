import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { measureMapInteraction } from "@/src/lib/map-performance";

describe("map interaction measurements", () => {
  let callbacks: Map<number, FrameRequestCallback>;
  let document: EventTarget & { visibilityState: string };

  function frame(now: number) {
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((callback) => callback(now));
  }

  beforeEach(() => {
    callbacks = new Map();
    document = Object.assign(new EventTarget(), { visibilityState: "visible" });
    let id = 0;
    vi.stubGlobal("document", document);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callbacks.set(++id, callback);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
    vi.spyOn(performance, "now").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("emits once after the final frame and includes stalls", () => {
    const report = vi.fn();
    const measurement = measureMapInteraction(report);
    [16, 32, 48, 100].forEach(frame);
    expect(report).not.toHaveBeenCalled();
    measurement.finish();
    frame(116);
    expect(report).toHaveBeenCalledExactlyOnceWith({
      duration_ms: 116,
      frame_count: 5,
      frame_time_p95_ms: 52,
      frame_time_max_ms: 52,
      slow_frame_percent: 20,
    });
    expect(callbacks.size).toBe(0);
  });

  it("retains a gesture blocked until its first frame", () => {
    const report = vi.fn();
    const measurement = measureMapInteraction(report);
    measurement.finish();
    frame(250);
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        frame_time_max_ms: 250,
        slow_frame_percent: 100,
      }),
    );
  });

  it("ignores short interactions", () => {
    const report = vi.fn();
    const measurement = measureMapInteraction(report);
    measurement.finish();
    frame(16);
    expect(report).not.toHaveBeenCalled();
  });

  it("discards backgrounded gestures even if the page becomes visible again", () => {
    const report = vi.fn();
    const measurement = measureMapInteraction(report);
    frame(16);
    document.visibilityState = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
    document.visibilityState = "visible";
    measurement.finish();
    frame(1000);
    expect(callbacks.size).toBe(0);
    expect(report).not.toHaveBeenCalled();
  });

  it("cancels pending work on cleanup", () => {
    const report = vi.fn();
    const measurement = measureMapInteraction(report);
    measurement.cancel();
    frame(200);
    expect(callbacks.size).toBe(0);
    expect(report).not.toHaveBeenCalled();
  });
});
