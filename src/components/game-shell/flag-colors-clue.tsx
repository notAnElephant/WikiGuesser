"use client";

import { Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface FlagColorsClueProps {
  src: string;
}

const blurredFlagClass =
  "aspect-[3/2] w-full scale-105 object-cover blur-[12px] sm:scale-110 sm:blur-xl";

export function FlagColorsClue({ src }: FlagColorsClueProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  return (
    <>
      <button
        aria-label="Enlarge blurred country flag"
        className="group relative block w-full max-w-72 overflow-hidden rounded-2xl border border-black/10 bg-white p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] dark:border-white/12 dark:bg-white/8"
        onClick={() => setIsExpanded(true)}
        type="button"
      >
        <img
          alt="Blurred country flag"
          className={blurredFlagClass}
          height={320}
          loading="lazy"
          src={src}
          width={480}
        />
        <span className="pointer-events-none absolute bottom-2 right-2 inline-flex size-8 items-center justify-center rounded-full bg-black/58 text-white opacity-90 shadow-sm backdrop-blur-sm transition group-hover:bg-black/72 dark:bg-black/64">
          <Maximize2 aria-hidden="true" className="size-4" strokeWidth={2.2} />
        </span>
      </button>

      {isExpanded
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(25,20,14,0.78)] p-3 backdrop-blur-sm dark:bg-[rgba(3,7,14,0.86)] sm:p-8"
              onClick={() => setIsExpanded(false)}
            >
              <div
                aria-label="Enlarged blurred country flag"
                aria-modal="true"
                className="relative flex max-h-full w-full max-w-5xl items-center justify-center overflow-hidden rounded-[28px] border border-white/18 bg-white/92 p-3 shadow-[0_32px_90px_rgba(0,0,0,0.38)] dark:bg-[#111a27]/94 sm:p-6"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <button
                  aria-label="Close enlarged flag"
                  autoFocus
                  className="absolute right-3 top-3 z-10 inline-flex size-11 items-center justify-center rounded-full border border-black/10 bg-white/90 text-[#1f1b17] shadow-md transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] dark:border-white/12 dark:bg-[#182536]/92 dark:text-white sm:right-4 sm:top-4"
                  onClick={() => setIsExpanded(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-5" strokeWidth={2.2} />
                </button>
                <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/12 dark:bg-white/8">
                  <img
                    alt="Blurred country flag, enlarged"
                    className="aspect-[3/2] max-h-[80dvh] w-full scale-105 object-cover blur-[clamp(16px,3.2vw,32px)]"
                    height={960}
                    src={src}
                    width={1440}
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
