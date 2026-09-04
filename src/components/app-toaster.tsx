"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      closeButton
      position="top-center"
      richColors
      theme="dark"
      toastOptions={{ classNames: { toast: "font-sans" } }}
    />
  );
}
