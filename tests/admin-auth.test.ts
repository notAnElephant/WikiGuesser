import { currentUser } from "@clerk/nextjs/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isAdminUser } from "@/src/lib/auth/admin";

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

const mockCurrentUser = vi.mocked(currentUser);

function clerkUser({
  id = "user_owner",
  email = "raiszoliver@gmail.com",
  verified = true,
  role,
}: {
  id?: string;
  email?: string;
  verified?: boolean;
  role?: string;
}) {
  return {
    id,
    publicMetadata: { role },
    emailAddresses: [
      {
        emailAddress: email,
        verification: { status: verified ? "verified" : "unverified" },
      },
    ],
  } as unknown as Awaited<ReturnType<typeof currentUser>>;
}

describe("admin authorization", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_CLERK_USER_IDS", "");
    mockCurrentUser.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("grants access to the owner's verified email", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser({ email: "RaiszOliver@gmail.com" }));
    expect(await isAdminUser("user_owner")).toBe(true);
  });

  it("rejects an unverified email and a mismatched Clerk user", async () => {
    mockCurrentUser.mockResolvedValue(clerkUser({ verified: false }));
    expect(await isAdminUser("user_owner")).toBe(false);

    mockCurrentUser.mockResolvedValue(clerkUser({ id: "user_someone_else" }));
    expect(await isAdminUser("user_owner")).toBe(false);
  });

  it("grants access to a Clerk dashboard admin role", async () => {
    mockCurrentUser.mockResolvedValue(
      clerkUser({ email: "another@example.com", role: "admin" }),
    );
    expect(await isAdminUser("user_owner")).toBe(true);
  });

  it("preserves the existing user ID allowlist", async () => {
    vi.stubEnv("ADMIN_CLERK_USER_IDS", "user_owner");
    expect(await isAdminUser("user_owner")).toBe(true);
    expect(mockCurrentUser).not.toHaveBeenCalled();
  });

  it("rejects signed-out users", async () => {
    expect(await isAdminUser(null)).toBe(false);
    expect(mockCurrentUser).not.toHaveBeenCalled();
  });
});
