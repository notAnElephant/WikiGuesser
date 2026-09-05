"use client";

import { Toaster } from "sonner";

import { useAstryxTheme } from "@/src/components/theme-provider";

export function AppToaster() {
  const { colorMode } = useAstryxTheme();

  return (
    <Toaster
      closeButton
      position="top-center"
      richColors
      theme={colorMode}
      toastOptions={{ classNames: { toast: "font-sans" } }}
    />
  );
}
