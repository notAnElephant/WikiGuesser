"use client";

import { LayerProvider } from "@astryxdesign/core/Layer";
import { useToast } from "@astryxdesign/core/Toast";
import { useCallback, useMemo, useRef } from "react";

interface AppToastOptions {
  duration?: number;
  id?: string;
}

type ToastTone = "error" | "info" | "success" | "warning";

const toastViewportOrigins = new WeakMap<
  HTMLElement,
  { restore: () => void }
>();

function setToastViewportOpen(viewport: HTMLElement, isOpen: boolean) {
  try {
    if (isOpen) {
      viewport.showPopover();
    } else if (viewport.matches(":popover-open")) {
      viewport.hidePopover();
    }
  } catch {
    // The viewport may already have changed popover state during a render.
  }
}

export function promoteToastViewport() {
  requestAnimationFrame(() => {
    const viewport = document.querySelector<HTMLElement>(
      '[popover="manual"][aria-label="Notifications"]',
    );
    if (!viewport) {
      return;
    }

    const dialog = document.querySelector<HTMLDialogElement>("dialog[open]");
    const origin = toastViewportOrigins.get(viewport);

    if (dialog && !dialog.contains(viewport)) {
      const parent = viewport.parentElement;
      if (!parent) {
        return;
      }

      const nextSibling = viewport.nextSibling;
      setToastViewportOpen(viewport, false);
      dialog.append(viewport);
      setToastViewportOpen(viewport, true);

      const restore = () => {
        if (parent.isConnected) {
          setToastViewportOpen(viewport, false);
          parent.insertBefore(
            viewport,
            nextSibling?.parentNode === parent ? nextSibling : null,
          );
          setToastViewportOpen(viewport, true);
        }
        toastViewportOrigins.delete(viewport);
      };

      toastViewportOrigins.set(viewport, { restore });
      dialog.addEventListener("close", restore, { once: true });
      return;
    }

    if (!dialog && origin) {
      origin.restore();
      return;
    }

    setToastViewportOpen(viewport, false);
    setToastViewportOpen(viewport, true);
  });
}

/** Provides app-wide toasts in the browser top layer, above native dialogs. */
export function AppToaster({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <LayerProvider toast={{ position: "topEnd" }}>{children}</LayerProvider>
  );
}

/** Compatibility wrapper for the success/info/error toast API used by the app. */
export function useAppToast() {
  const showToast = useToast();
  const dismissers = useRef(new Map<string, () => void>());

  const show = useCallback(
    (body: string, tone: ToastTone, options: AppToastOptions = {}) => {
      let dismiss: () => void;
      dismiss = showToast({
        autoHideDuration: options.duration,
        body,
        onHide: () => {
          if (options.id && dismissers.current.get(options.id) === dismiss) {
            dismissers.current.delete(options.id);
          }
        },
        type: tone as "error" | "info",
        uniqueID: options.id,
      });

      if (options.id) {
        dismissers.current.set(options.id, dismiss);
      }

      promoteToastViewport();

      return dismiss;
    },
    [showToast],
  );

  return useMemo(
    () => ({
      dismiss: (id: string) => dismissers.current.get(id)?.(),
      error: (body: string, options?: AppToastOptions) =>
        show(body, "error", options),
      info: (body: string, options?: AppToastOptions) =>
        show(body, "info", options),
      success: (body: string, options?: AppToastOptions) =>
        show(body, "success", options),
      warning: (body: string, options?: AppToastOptions) =>
        show(body, "warning", options),
    }),
    [show],
  );
}
