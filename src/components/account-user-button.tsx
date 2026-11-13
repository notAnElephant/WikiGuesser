"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { ChartNoAxesCombined, Shield } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { syncLeaderboardUsername } from "@/src/lib/auth/sync-leaderboard-username";

interface AccountUserButtonProps {
  adminDailyAnswersPage?: ReactNode;
  isAdmin: boolean;
}

export function AccountUserButton({
  adminDailyAnswersPage,
  isAdmin,
}: AccountUserButtonProps) {
  const { user } = useUser();
  const username = user?.username;
  const userId = user?.id;

  useEffect(() => {
    if (username && userId) {
      void syncLeaderboardUsername(username).catch((error) =>
        console.error("Could not sync the leaderboard username", error),
      );
    }
  }, [username, userId]);

  const adminIcon = <Shield aria-hidden="true" size="0.75rem" />;
  const statsIcon = (
    <ChartNoAxesCombined aria-hidden="true" size="0.75rem" />
  );

  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link
          label="My stats"
          labelIcon={statsIcon}
          href="/stats"
        />
        {isAdmin ? (
          <UserButton.Action
            label="Daily answers"
            labelIcon={adminIcon}
            open="daily-answers"
          />
        ) : null}
      </UserButton.MenuItems>
      {isAdmin ? (
        <UserButton.UserProfilePage
          label="Daily answers"
          labelIcon={adminIcon}
          url="daily-answers"
        >
          {adminDailyAnswersPage}
        </UserButton.UserProfilePage>
      ) : null}
    </UserButton>
  );
}
