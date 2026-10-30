export interface MapFrameMetrics {
  duration_ms: number;
  frame_count: number;
  frame_time_p95_ms: number;
  frame_time_max_ms: number;
  slow_frame_percent: number;
}

/** Measure foreground animation-frame gaps, including the frame after gesture end. */
export function measureMapInteraction(
  onComplete: (metrics: MapFrameMetrics) => void,
) {
  const startedAt = performance.now();
  let previousFrame = startedAt;
  const gaps: number[] = [];
  let ending = false;
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    cancelAnimationFrame(frame);
    document.removeEventListener("visibilitychange", cancel);
  };
  const tick = (now: number) => {
    if (cancelled || document.visibilityState !== "visible") {
      cancel();
      return;
    }
    gaps.push(now - previousFrame);
    previousFrame = now;
    if (ending) {
      cancel();
      const duration = now - startedAt;
      // Ignore taps; retain even one very delayed frame from a stalled gesture.
      if (duration < 100) return;
      gaps.sort((a, b) => a - b);
      onComplete({
        duration_ms: duration,
        frame_count: gaps.length,
        frame_time_p95_ms: gaps[Math.ceil(gaps.length * 0.95) - 1],
        frame_time_max_ms: gaps[gaps.length - 1],
        slow_frame_percent:
          (100 * gaps.filter((gap) => gap > 32).length) / gaps.length,
      });
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  let frame = requestAnimationFrame(tick);
  document.addEventListener("visibilitychange", cancel);

  return {
    finish: () => {
      ending = true;
    },
    cancel,
  };
}
