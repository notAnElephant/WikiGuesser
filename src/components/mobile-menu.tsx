"use client";

import { useEffect, useState } from "react";
import { Show } from "@clerk/nextjs";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { IconButton } from "@astryxdesign/core/IconButton";
import { MobileNav } from "@astryxdesign/core/MobileNav";
import { SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { VStack } from "@astryxdesign/core/VStack";
import {
  ChartNoAxesCombined,
  LogIn,
  Menu,
  MessageSquare,
  Trophy,
} from "lucide-react";

import { FeedbackForm } from "@/src/components/feedback-form";
import { PwaInstallButton } from "@/src/components/pwa-install-button";
import { ThemeSettings } from "@/src/components/theme-toggle";

/**
 * Mobile navigation drawer. Replaces the always-visible secondary header
 * controls with a native slide-out menu so the top bar stays compact.
 *
 * Signed-in state is read from Clerk's client store (via `<Show>`) rather than
 * a server prop, so the drawer updates instantly on sign-in/sign-out instead
 * of waiting for a `router.refresh()` round trip.
 */
export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"menu" | "feedback">("menu");

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 640px)");
    const closeOnDesktop = () => {
      if (desktop.matches) {
        setIsOpen(false);
        setView("menu");
      }
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const close = () => {
    setIsOpen(false);
    setView("menu");
  };

  return (
    <>
      <IconButton
        className="min-h-11 min-w-11 sm:hidden"
        icon={<Menu aria-hidden="true" />}
        label="Open menu"
        onClick={() => setIsOpen(true)}
        variant="ghost"
      />
      <MobileNav
        header="Menu"
        isOpen={isOpen}
        label="Menu"
        onOpenChange={(nextIsOpen) => {
          setIsOpen(nextIsOpen);
          if (!nextIsOpen) {
            setView("menu");
          }
        }}
        side="end"
      >
        {view === "feedback" ? (
          <VStack gap={4}>
            <FeedbackForm context={{ source: "global" }} onSubmitted={close} />
            <Button
              label="Back to menu"
              variant="ghost"
              width="100%"
              onClick={() => setView("menu")}
            />
          </VStack>
        ) : (
          <VStack gap={4}>
            <SideNavSection title="Explore">
              <SideNavItem
                href="/leaderboard"
                icon={Trophy}
                label="Leaderboard"
                onClick={close}
              />
              <Show when="signed-in">
                <SideNavItem
                  href="/stats"
                  icon={ChartNoAxesCombined}
                  label="My stats"
                  onClick={close}
                />
              </Show>
              <Show when="signed-out">
                <SideNavItem
                  href="/sign-in"
                  icon={LogIn}
                  label="Log in"
                  onClick={close}
                />
              </Show>
            </SideNavSection>

            <Divider />

            <SideNavSection title="Appearance">
              <ThemeSettings showStyle={false} />
            </SideNavSection>

            <Divider />

            <Button
              icon={<MessageSquare aria-hidden="true" />}
              label="Send feedback"
              variant="secondary"
              width="100%"
              onClick={() => setView("feedback")}
            />
            <PwaInstallButton variant="menu" />
          </VStack>
        )}
      </MobileNav>
    </>
  );
}
