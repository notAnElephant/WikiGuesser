"use client";

import { Dialog } from "@astryxdesign/core/Dialog";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Maximize2, X } from "lucide-react";
import { useState } from "react";

interface FlagColorsClueProps {
  src: string;
  revealed?: boolean;
}

const blurredFlagClass =
  "aspect-[3/2] w-full scale-105 object-cover blur-md";

export function FlagColorsClue({ src, revealed = false }: FlagColorsClueProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <button
        aria-label={revealed ? "Enlarge country flag" : "Enlarge blurred country flag"}
        className="group relative block w-full max-w-72 overflow-hidden rounded-2xl border border-border bg-surface p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bg"
        onClick={() => setIsExpanded(true)}
        type="button"
      >
        <img
          alt={revealed ? "Country flag" : "Blurred country flag"}
          className={revealed ? "aspect-[3/2] w-full object-cover" : blurredFlagClass}
          height={320}
          loading="lazy"
          src={src}
          width={480}
        />
        <span className="pointer-events-none absolute bottom-2 right-2 inline-flex size-8 items-center justify-center rounded-full bg-overlay text-on-dark shadow-sm backdrop-blur-sm">
          <Maximize2 aria-hidden="true" className="size-4" strokeWidth={2.2} />
        </span>
      </button>

      <Dialog
        aria-label={revealed ? "Enlarged country flag" : "Enlarged blurred country flag"}
        isOpen={isExpanded}
        maxHeight="90dvh"
        onOpenChange={setIsExpanded}
        padding={3}
        width="64rem"
      >
        <IconButton
          className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4"
          icon={<X aria-hidden="true" />}
          label="Close enlarged flag"
          onClick={() => setIsExpanded(false)}
          size="lg"
          tooltip="Close enlarged flag"
          variant="secondary"
        />
        <div className="w-full overflow-hidden rounded-lg border border-border bg-surface">
          <img
            alt={revealed ? "Country flag, enlarged" : "Blurred country flag, enlarged"}
            className={revealed ? "aspect-[3/2] max-h-[80dvh] w-full object-cover" : "aspect-[3/2] max-h-[80dvh] w-full scale-105 object-cover blur-[clamp(16px,3.2vw,32px)]"}
            height={960}
            src={src}
            width={1440}
          />
        </div>
      </Dialog>
    </>
  );
}
