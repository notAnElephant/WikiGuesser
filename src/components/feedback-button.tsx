"use client";

import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { IconButton } from "@astryxdesign/core/IconButton";
import { MessageSquare } from "lucide-react";
import { useState } from "react";

import { FeedbackForm } from "@/src/components/feedback-form";

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <IconButton
        className="min-h-11 min-w-11 sm:min-h-0 sm:min-w-0"
        icon={
          <MessageSquare
            aria-hidden="true"
            className="size-4"
            strokeWidth={2.2}
          />
        }
        label="Send feedback"
        onClick={() => setIsOpen(true)}
        tooltip="Send feedback"
        variant="ghost"
      />
      <Dialog
        isOpen={isOpen}
        maxHeight="calc(100dvh - var(--spacing-8))"
        onOpenChange={setIsOpen}
        padding={6}
        purpose="form"
        width="32rem"
      >
        <DialogHeader
          onOpenChange={setIsOpen}
          subtitle="WikiGuesser is in beta. Your thoughts shape what we build next."
          title="Send feedback"
        />
        <FeedbackForm
          context={{ source: "global" }}
          onSubmitted={() => setIsOpen(false)}
        />
      </Dialog>
    </>
  );
}
