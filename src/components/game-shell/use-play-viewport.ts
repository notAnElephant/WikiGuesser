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
    keyboardDismissed: false,
  });

  useLayoutEffect(() => {
    if (!enabled) return;
    const media = window.matchMedia("(max-width: 1023px)");
    const visual = window.visualViewport;
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    let beforeKeyboard: { height: number; width: number } | undefined;
    let keyboardOpened = false;
    function rememberFocus(event: FocusEvent) {
      if (!media.matches || !(event.target instanceof HTMLInputElement)) return;
      beforeKeyboard = {
        height: visual?.height ?? window.innerHeight,
        width: window.innerWidth,
      };
      keyboardOpened = false;
      measure();
    }
    function forgetFocus() {
      beforeKeyboard = undefined;
      keyboardOpened = false;
    }
    const measure = () => {
      // Safari can zoom and open the keyboard in the same focus gesture.
      if (
        visual &&
        visual.scale !== 1 &&
        !(media.matches && element.querySelector("input:focus"))
      ) {
        return;
      }
      const visibleHeight = visual?.height ?? window.innerHeight;
      // Android Back can leave the field focused. Restore the headers when
      // the viewport recovers, preserving focus if the IME resizes again.
      let keyboardDismissed = false;
      if (beforeKeyboard && beforeKeyboard.width !== window.innerWidth)
        forgetFocus();
      if (beforeKeyboard && (!visual || visual.scale === 1)) {
        const lostHeight = beforeKeyboard.height - visibleHeight;
        if (lostHeight > 120) keyboardOpened = true;
        // The browser toolbar can resize mid-animation. Wait for the original
        // height (allowing subpixel rounding) before uncovering the headers.
        keyboardDismissed = keyboardOpened && lostHeight <= 1;
      }
      const offset = visual?.offsetTop ?? 0;
      const top = element.getBoundingClientRect().top;
      const bottom = offset + visibleHeight;
      // The focused stage is fixed in layout-viewport coordinates.
      element.style.setProperty("--play-visible-height", `${visibleHeight}px`);
      element.style.setProperty("--play-viewport-top", `${offset}px`);
      element.style.setProperty(
        "--play-viewport-height",
        `${Math.max(0, bottom - top)}px`,
      );
      const next = {
        isMobile: media.matches,
        isShort: visibleHeight < 500,
        keyboardDismissed,
      };
      setViewport((current) =>
        current.isMobile === next.isMobile &&
        current.isShort === next.isShort &&
        current.keyboardDismissed === next.keyboardDismissed
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
    observer.observe(element);
    element.addEventListener("focusin", rememberFocus);
    element.addEventListener("focusout", forgetFocus);
    media.addEventListener("change", measure);
    window.addEventListener("resize", measure);
    visual?.addEventListener("resize", measure);
    visual?.addEventListener("scroll", measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("focusin", rememberFocus);
      element.removeEventListener("focusout", forgetFocus);
      media.removeEventListener("change", measure);
      window.removeEventListener("resize", measure);
      visual?.removeEventListener("resize", measure);
      visual?.removeEventListener("scroll", measure);
    };
  }, [enabled, ref]);

  return viewport;
}
