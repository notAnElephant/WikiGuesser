"use client";

import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { useState } from "react";

interface CountryFlagPreviewProps {
  countryName: string;
  src: string;
}

export function CountryFlagPreview({
  countryName,
  src,
}: CountryFlagPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        aria-label={`Enlarge flag of ${countryName}`}
        className="inline-flex h-10 w-16 shrink-0 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bg"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <img
          alt={`Flag of ${countryName}`}
          className="h-auto max-h-10 w-auto max-w-16 object-contain"
          height={44}
          src={src}
          width={64}
        />
      </button>
      <Dialog
        isOpen={isOpen}
        maxHeight="90dvh"
        onOpenChange={setIsOpen}
        padding={4}
        width="48rem"
      >
        <DialogHeader
          onOpenChange={setIsOpen}
          title={`Flag of ${countryName}`}
        />
        <img
          alt={`Flag of ${countryName}, enlarged`}
          className="h-auto max-h-full w-full rounded-lg border border-border object-contain"
          height={480}
          src={src}
          width={720}
        />
      </Dialog>
    </>
  );
}
