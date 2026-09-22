"use client";

import { Show } from "@clerk/nextjs";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { ChartNoAxesCombined, LogIn, UserPlus } from "lucide-react";
import type { ReactNode } from "react";

import { AccountUserButton } from "@/src/components/account-user-button";
import { MobileMenu } from "@/src/components/mobile-menu";

interface HeaderAuthControlsProps {
  adminDailyAnswersPage?: ReactNode;
  isAdmin: boolean;
}

/**
 * Auth-dependent header controls.
 *
 * This must be a client component so Clerk's client-side `<Show>` is used
 * instead of the server one. The server `<Show>` only re-renders when the
 * server re-renders the layout (triggered by a full `router.refresh()` round
 * trip after sign-in/sign-out), which is what caused the multi-second delay
 * before the buttons/drawer updated. The client variant reacts instantly to
 * Clerk's in-memory session state.
 */
export function HeaderAuthControls({
  adminDailyAnswersPage,
  isAdmin,
}: HeaderAuthControlsProps) {
  return (
    <>
      <Show when="signed-out">
        <Button
          className="hidden sm:inline-flex"
          href="/sign-in"
          icon={
            <LogIn aria-hidden="true" className="size-4" strokeWidth={2.2} />
          }
          label="Log in"
          size="sm"
          variant="ghost"
        />
        <Button
          href="/sign-up"
          icon={
            <UserPlus aria-hidden="true" className="size-4" strokeWidth={2.2} />
          }
          label="Sign up"
          size="sm"
          variant="primary"
        />
      </Show>
      <Show when="signed-in">
        <IconButton
          className="hidden min-h-11 min-w-11 sm:inline-flex sm:min-h-0 sm:min-w-0"
          href="/stats"
          icon={
            <ChartNoAxesCombined
              aria-hidden="true"
              className="size-4"
              strokeWidth={2.2}
            />
          }
          label="My stats"
          tooltip="My stats"
          variant="ghost"
        />
        <AccountUserButton
          adminDailyAnswersPage={adminDailyAnswersPage}
          isAdmin={isAdmin}
        />
      </Show>
      <MobileMenu isAdmin={isAdmin} />
    </>
  );
}
