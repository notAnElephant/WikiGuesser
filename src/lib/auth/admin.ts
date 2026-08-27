function getAdminUserIds() {
  return new Set(
    (process.env.ADMIN_CLERK_USER_IDS ?? "")
      .split(",")
      .map((userId) => userId.trim())
      .filter(Boolean),
  );
}

export function isAdminUser(userId: string | null) {
  return Boolean(userId && getAdminUserIds().has(userId));
}
