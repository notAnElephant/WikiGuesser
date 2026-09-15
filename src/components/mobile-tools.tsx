"use client";

import { useEffect, useState } from "react";
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Menu, MessageSquare } from "lucide-react";
import { FeedbackForm } from "@/src/components/feedback-form";
import { PwaInstallButton } from "@/src/components/pwa-install-button";
import { ThemeSettings } from "@/src/components/theme-toggle";

export function MobileTools() {
  const [view, setView] = useState<"settings" | "feedback" | null>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 640px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setView(null);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <HStack className="sm:hidden">
      <IconButton
        label="More options"
        tooltip="More options"
        icon={<Menu aria-hidden="true" />}
        variant="ghost"
        onClick={() => setView("settings")}
      />
      {view ? (
        <Dialog
          isOpen
          onOpenChange={() => setView(null)}
          padding={5}
          purpose={view === "feedback" ? "form" : "info"}
        >
          <DialogHeader
            title={view === "feedback" ? "Send feedback" : "More options"}
            onOpenChange={() => setView(null)}
          />
          {view === "feedback" ? (
            <VStack gap={3}>
              <FeedbackForm
                context={{ source: "global" }}
                onSubmitted={() => setView(null)}
              />
              <Button
                label="Back to options"
                variant="ghost"
                onClick={() => setView("settings")}
              />
            </VStack>
          ) : (
            <VStack gap={4}>
              <ThemeSettings />
              <Button
                label="Send feedback"
                icon={<MessageSquare aria-hidden="true" />}
                variant="secondary"
                onClick={() => setView("feedback")}
              />
              <PwaInstallButton />
            </VStack>
          )}
        </Dialog>
      ) : null}
    </HStack>
  );
}
