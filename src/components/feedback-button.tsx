"use client";

import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { IconButton } from "@astryxdesign/core/IconButton";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";

import {
  FeedbackForm,
  type FeedbackContext,
} from "@/src/components/feedback-form";

const feedbackRequestEvent = "wikiguesser:feedback-request";

export function requestFeedback(context: FeedbackContext) {
  window.dispatchEvent(
    new CustomEvent<FeedbackContext>(feedbackRequestEvent, { detail: context }),
  );
}

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<FeedbackContext>({ source: "global" });

  useEffect(() => {
    function openRequestedFeedback(event: Event) {
      setContext((event as CustomEvent<FeedbackContext>).detail);
      setIsOpen(true);
    }

    window.addEventListener(feedbackRequestEvent, openRequestedFeedback);
    return () => window.removeEventListener(feedbackRequestEvent, openRequestedFeedback);
  }, []);

  return (
    <>
      <IconButton icon={<MessageSquare aria-hidden="true" className="size-4" strokeWidth={2.2} />} label="Send feedback" onClick={() => { setContext({ source: "global" }); setIsOpen(true); }} tooltip="Send feedback" variant="ghost" />
      <Dialog isOpen={isOpen} maxHeight="calc(100dvh - var(--spacing-8))" onOpenChange={setIsOpen} padding={6} purpose="form" width="32rem">
        <DialogHeader onOpenChange={setIsOpen} subtitle="WikiGuesser is in beta. Your thoughts shape what we build next." title="Send feedback" />
        <FeedbackForm context={context} onSubmitted={() => setIsOpen(false)} />
      </Dialog>
    </>
  );
}
