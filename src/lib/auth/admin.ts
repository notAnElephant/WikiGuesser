import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

const adminEmails = new Set(["raiszoliver@gmail.com"]);

function getAdminUserIds() {
  return new Set(
    (process.env.ADMIN_CLERK_USER_IDS ?? "")
      .split(",")
      .map((userId) => userId.trim())
      .filter(Boolean),
  );
}

export const isAdminUser = cache(async (userId: string | null) => {
  if (!userId) return false;
  if (getAdminUserIds().has(userId)) return true;

  const user = await currentUser();
  if (!user || user.id !== userId) return false;

  if (user.publicMetadata.role === "admin") return true;

  return user.emailAddresses.some(
    (email) =>
      adminEmails.has(email.emailAddress.toLowerCase()) &&
      email.verification?.status === "verified",
  );
});
