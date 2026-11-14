import { auth } from "@clerk/nextjs/server";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FeedbackInbox from "@/app/admin/feedback/page";
import { isAdminUser } from "@/src/lib/auth/admin";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/src/lib/auth/admin", () => ({ isAdminUser: vi.fn() }));
vi.mock("@/src/lib/repository/prisma", () => ({
  getPrismaClient: () => ({ feedback: { findMany } }),
}));

describe("feedback inbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: "user_signed_in",
    } as Awaited<ReturnType<typeof auth>>);
  });

  it("rejects a non-admin before reading private feedback", async () => {
    vi.mocked(isAdminUser).mockResolvedValue(false);

    await expect(
      FeedbackInbox({ searchParams: Promise.resolve({}) }),
    ).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
    expect(isAdminUser).toHaveBeenCalledWith("user_signed_in");
    expect(findMany).not.toHaveBeenCalled();
  });

  it("applies both filters and renders written feedback and context as text", async () => {
    vi.mocked(isAdminUser).mockResolvedValue(true);
    findMany.mockResolvedValue([
      {
        id: "test-feedback",
        kind: "BUG",
        message: "<strong>Page is stuck</strong>",
        path: "/play/classic",
        context: { source: "clue", clueLabel: "Capital" },
        createdAt: new Date("2026-11-14T12:00:00Z"),
      },
    ]);

    const page = await FeedbackInbox({
      searchParams: Promise.resolve({ kind: "BUG", source: "clue", page: "2" }),
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { kind: "BUG", context: { path: ["source"], equals: "clue" } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: 25,
        take: 26,
      }),
    );
    const markup = renderToStaticMarkup(page);
    expect(markup).toContain("&lt;strong&gt;Page is stuck&lt;/strong&gt;");
    expect(markup).toContain("Capital");
    expect(markup).toContain(
      "/admin/feedback?page=1&amp;kind=BUG&amp;source=clue",
    );
  });
});
