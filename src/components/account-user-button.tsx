"use client";

import { LeaderboardProfilePage } from "@/src/components/leaderboard-profile-page";
import { UserButton } from "@clerk/nextjs";
import { Shield, Trophy } from "lucide-react";
import type { ReactNode } from "react";

interface AccountUserButtonProps {
  adminDailyAnswersPage?: ReactNode;
  isAdmin: boolean;
}

export function AccountUserButton({
  adminDailyAnswersPage,
  isAdmin,
}: AccountUserButtonProps) {
  const icon = <Trophy aria-hidden="true" className="size-4" />;
  const adminIcon = <Shield aria-hidden="true" className="size-4" />;

  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action
          label="Leaderboard name"
          labelIcon={icon}
          open="leaderboard-name"
        />
        {isAdmin ? (
          <UserButton.Action
            label="Daily answers"
            labelIcon={adminIcon}
            open="daily-answers"
          />
        ) : null}
      </UserButton.MenuItems>
      <UserButton.UserProfilePage
        label="Leaderboard name"
        labelIcon={icon}
        url="leaderboard-name"
      >
        <LeaderboardProfilePage />
      </UserButton.UserProfilePage>
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
