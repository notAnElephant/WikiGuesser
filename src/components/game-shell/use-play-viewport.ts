"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/** Size the play surface to the visible viewport, including the software keyboard. */
export function usePlayViewport(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const [viewport, setViewport] = useState({
    isMobile: false,
    isShort: false,
  });

  useLayoutEffect(() => {
    if (!enabled) return;
    const media = window.matchMedia("(max-width: 1023px)");
    const visual = window.visualViewport;
    let frame = 0;
    const measure = () => {
      const element = ref.current;
      if (!element) return;
      // Safari can zoom and open the keyboard in the same focus gesture.
      if (
        visual &&
        visual.scale !== 1 &&
        !(media.matches && element.querySelector("input:focus"))
      ) {
        return;
      }
      const visibleHeight = visual?.height ?? window.innerHeight;
      const offset = visual?.offsetTop ?? 0;
      const top = element.getBoundingClientRect().top;
      const bottom = visibleHeight + (media.matches ? 0 : offset);
      // Move the panel in the same frame as the keyboard resize.
      element.style.setProperty("--play-viewport-top", `${offset}px`);
      element.style.setProperty(
        "--play-viewport-height",
        `${Math.max(0, bottom - top)}px`,
      );
      const next = {
        isMobile: media.matches,
        isShort: visibleHeight < 500,
      };
      setViewport((current) =>
        current.isMobile === next.isMobile &&
        current.isShort === next.isShort
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
    media.addEventListener("change", measure);
    window.addEventListener("resize", measure);
    visual?.addEventListener("resize", measure);
    visual?.addEventListener("scroll", measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener("change", measure);
      window.removeEventListener("resize", measure);
      visual?.removeEventListener("resize", measure);
      visual?.removeEventListener("scroll", measure);
    };
  }, [enabled, ref]);

  return viewport;
}
