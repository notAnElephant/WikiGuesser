"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/** Size the play surface to the visible viewport, including the software keyboard. */
export function usePlayViewport(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  isTyping: boolean,
) {
  const [viewport, setViewport] = useState({
    isMobile: false,
    height: 0,
    visibleHeight: 0,
  });

  useLayoutEffect(() => {
    if (!enabled) return;
    const media = window.matchMedia("(max-width: 1023px)");
    const visual = window.visualViewport;
    let frame = 0;
    const measure = () => {
      const top = ref.current?.getBoundingClientRect().top ?? 0;
      const bottom = visual
        ? visual.offsetTop + visual.height
        : window.innerHeight;
      const next = {
        isMobile: media.matches,
        height: Math.max(0, bottom - top),
        visibleHeight: visual?.height ?? window.innerHeight,
      };
      setViewport((current) =>
        current.isMobile === next.isMobile &&
        current.height === next.height &&
        current.visibleHeight === next.visibleHeight
          ? current
          : next,
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(schedule);
    if (ref.current) observer.observe(ref.current);
    media.addEventListener("change", schedule);
    window.addEventListener("resize", schedule);
    visual?.addEventListener("resize", schedule);
    visual?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener("change", schedule);
      window.removeEventListener("resize", schedule);
      visual?.removeEventListener("resize", schedule);
      visual?.removeEventListener("scroll", schedule);
    };
  }, [enabled, ref, isTyping]);

  return viewport;
}
