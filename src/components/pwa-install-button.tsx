"use client";

import { IconButton } from "@astryxdesign/core/IconButton";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

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

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      return;
    }

    setShowIosInstructions(isIosDevice());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstallPrompt(null);
      setShowIosInstructions(false);
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

  if (!installPrompt && !showIosInstructions) {
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

    toast.info("In Safari, tap Share, then Add to Home Screen.", {
      duration: 8_000,
    });
  }

  return (
    <IconButton
      icon={<Download aria-hidden="true" />}
      label="Install WikiGuesser"
      onClick={() => void install()}
      size="lg"
      tooltip="Install app"
      variant="secondary"
    />
  );
}
