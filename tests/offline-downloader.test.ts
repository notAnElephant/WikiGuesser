import { describe, expect, it, vi } from "vitest";

import { fetchWithRetry } from "@/src/lib/offline/downloader";

describe("offline downloader retry policy", () => {
  it("retries transient responses and returns the eventual asset", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response("flag", { status: 200 }));

    const response = await fetchWithRetry("/flag.svg", {
      fetcher,
      retries: 1,
    });

    expect(await response.text()).toBe("flag");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not retry permanent client errors", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      fetchWithRetry("/missing.svg", { fetcher, retries: 3 }),
    ).rejects.toThrow("status 404");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
