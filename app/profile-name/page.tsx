import { currentUser } from "@clerk/nextjs/server";
import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/VStack";
import { Text } from "@astryxdesign/core/Text";
import { PageHeading } from "@/src/components/page-heading";
import { redirect } from "next/navigation";

import { ProfileNameForm } from "@/app/profile-name/profile-name-form";
import { deriveDisplayName } from "@/src/lib/auth/user-profile";

export default async function ProfileNamePage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <section className="grid min-h-full place-items-center px-4 py-10">
      <Card className="w-full max-w-md p-6 sm:p-8" elevation="low" padding={0}>
        <VStack gap={4}>
          <Text color="secondary" type="supporting">
            One last step
          </Text>
          <PageHeading
            title="Choose your leaderboard name"
            description="We filled this in from your profile. You can change it below."
          />
          <ProfileNameForm defaultName={deriveDisplayName(user)} />
        </VStack>
      </Card>
    </section>
  );
}
