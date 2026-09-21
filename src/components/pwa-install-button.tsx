"use client";

import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type ManualInstallInstructions = "ios" | "macos";

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isSafariBrowser() {
  return (
    /safari/i.test(navigator.userAgent) &&
    !/chrome|chromium|crios|fxios|edg|opr|opera|android/i.test(
      navigator.userAgent,
    )
  );
}

function getManualInstallInstructions(): ManualInstallInstructions | null {
  if (isIosDevice()) return "ios";
  if (isSafariBrowser()) return "macos";
  return null;
}

export function PwaInstallButton({
  variant = "icon",
}: {
  variant?: "icon" | "menu";
}) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [manualInstructions, setManualInstructions] =
    useState<ManualInstallInstructions | null>(null);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      return;
    }

    setManualInstructions(getManualInstallInstructions());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstallPrompt(null);
      setManualInstructions(null);
      toast.success("WikiGuesser installed.");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!installPrompt && !manualInstructions) {
    return null;
  }

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
      }
      return;
    }

    const message =
      manualInstructions === "macos"
        ? "In Safari, choose File > Add to Dock, then click Add."
        : "In Safari, tap Share, then Add to Home Screen.";

    toast.info(message, {
      duration: 8_000,
    });
  }

  return variant === "menu" ? (
    <Button
      icon={<Download aria-hidden="true" />}
      label="Install app"
      onClick={() => void install()}
      variant="secondary"
      width="100%"
    />
  ) : (
    <IconButton
      className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
      icon={<Download aria-hidden="true" />}
      label="Install WikiGuesser"
      onClick={() => void install()}
      tooltip="Install app to play offline"
      variant="ghost"
    />
  );
}
