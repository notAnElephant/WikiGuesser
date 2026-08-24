"use client";

import { UserButton } from "@clerk/nextjs";
import { Trophy } from "lucide-react";

import { LeaderboardProfilePage } from "@/src/components/leaderboard-profile-page";

export function AccountUserButton() {
  const icon = <Trophy aria-hidden="true" className="size-4" />;

  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action
          label="Leaderboard name"
          labelIcon={icon}
          open="leaderboard-name"
        />
      </UserButton.MenuItems>
      <UserButton.UserProfilePage
        label="Leaderboard name"
        labelIcon={icon}
        url="leaderboard-name"
      >
        <LeaderboardProfilePage />
      </UserButton.UserProfilePage>
    </UserButton>
  );
}
