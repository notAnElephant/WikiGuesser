import { describe, expect, it, vi } from "vitest";

const { snapshotEntityFindFirst } = vi.hoisted(() => ({
  snapshotEntityFindFirst: vi.fn(),
}));

vi.mock("@/src/lib/repository/prisma", () => ({
  getPrismaClient: () => ({
    snapshotEntity: { findFirst: snapshotEntityFindFirst },
  }),
}));

import { categoryDefinitions } from "@/src/lib/content/category-definitions";
import {
  buildOfflineCountryManifest,
  buildOfflineCountryPack,
  isAllowedWikimediaAssetUrl,
  offlineCountryManifestSchema,
  offlineCountryPackSchema,
  parseWikimediaFlagSourceUrl,
} from "@/src/lib/offline/country-pack";
import {
  fetchWikimediaFlag,
  getOfflineCountryFlagSourceUrl,
} from "@/src/lib/offline/country-pack-server";
import type { MaterializedSnapshot } from "@/src/lib/types";
import { countrySourceFixture } from "@/tests/fixtures";

function buildSnapshot(): MaterializedSnapshot {
  const country = categoryDefinitions.countries.normalize(countrySourceFixture);
  if (!country) throw new Error("Country fixture did not normalize.");

  return {
    key: "snapshot-test123",
    sourceFingerprint: "fingerprint",
    createdAt: "2026-01-01T00:00:00.000Z",
    entities: [country],
  };
}

describe("offline country pack", () => {
  it("builds validated, answer-bearing entities with local flag URLs", () => {
    const pack = buildOfflineCountryPack(buildSnapshot());
    const country = pack.entities[0];

    expect(() => offlineCountryPackSchema.parse(pack)).not.toThrow();
    expect(country).toMatchObject({
      qid: "Q142",
      canonicalAnswer: "France",
      continents: ["europe"],
      latitude: 46.2276,
      longitude: 2.2137,
    });
    expect(country.acceptedAnswers.length).toBeGreaterThan(0);
    expect(
      country.clues.find((clue) => clue.key === "flag-colors")?.value,
    ).toBe("/api/offline/countries/packs/snapshot-test123/flags/Q142");
  });

  it("builds the agreed manifest contract from pack assets", () => {
    const manifest = buildOfflineCountryManifest(
      buildOfflineCountryPack(buildSnapshot()),
    );

    expect(() => offlineCountryManifestSchema.parse(manifest)).not.toThrow();
    expect(manifest).toEqual({
      schemaVersion: 1,
      snapshotKey: "snapshot-test123",
      entityCount: 1,
      assetCount: 1,
      packUrl: "/api/offline/countries/packs/snapshot-test123",
      flags: [
        {
          qid: "Q142",
          url: "/api/offline/countries/packs/snapshot-test123/flags/Q142",
        },
      ],
    });
  });

  it("fails closed when a stored flag URL is not an approved Commons URL", () => {
    const snapshot = buildSnapshot();
    const entity = snapshot.entities[0];
    snapshot.entities[0] = {
      ...entity,
      clues: entity.clues.map((clue) =>
        clue.key === "flag-colors"
          ? { ...clue, value: "https://evil.test/flag.svg" }
          : clue,
      ),
    };

    expect(() => buildOfflineCountryPack(snapshot)).toThrow(
      "Country Q142 has an invalid flag URL.",
    );
  });

  it("rejects cross-origin and mismatched download URLs", () => {
    const manifest = buildOfflineCountryManifest(
      buildOfflineCountryPack(buildSnapshot()),
    );

    expect(() =>
      offlineCountryManifestSchema.parse({
        ...manifest,
        packUrl: "//evil.test/countries.json",
      }),
    ).toThrow("same-origin pack endpoint");
    expect(() =>
      offlineCountryManifestSchema.parse({
        ...manifest,
        flags: [{ qid: "Q142", url: "/api/offline/wrong-flag" }],
      }),
    ).toThrow("same-origin endpoint");
  });
});

describe("offline flag URL safety", () => {
  it("queries only the matching snapshot country clues", async () => {
    snapshotEntityFindFirst.mockResolvedValueOnce({
      clues: [
        {
          key: "flag-colors",
          value:
            "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag%20of%20France.svg?width=640",
        },
      ],
    });

    const sourceUrl = await getOfflineCountryFlagSourceUrl(
      "snapshot-test123",
      "Q142",
    );

    expect(sourceUrl?.hostname).toBe("commons.wikimedia.org");
    expect(snapshotEntityFindFirst).toHaveBeenCalledWith({
      where: {
        qid: "Q142",
        category: "countries",
        snapshotVersion: { is: { key: "snapshot-test123" } },
      },
      select: { clues: true },
    });
  });

  it("rejects malformed lookup keys before querying Prisma", async () => {
    snapshotEntityFindFirst.mockClear();

    await expect(
      getOfflineCountryFlagSourceUrl("../snapshot", "Q142"),
    ).resolves.toBeNull();
    await expect(
      getOfflineCountryFlagSourceUrl("snapshot-test123", "not-a-qid"),
    ).resolves.toBeNull();
    expect(snapshotEntityFindFirst).not.toHaveBeenCalled();
  });

  it("only accepts the expected Commons redirect form", () => {
    expect(
      parseWikimediaFlagSourceUrl(
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag%20of%20France.svg?width=640",
      )?.hostname,
    ).toBe("commons.wikimedia.org");

    for (const value of [
      "http://commons.wikimedia.org/wiki/Special:Redirect/file/Flag.svg?width=640",
      "https://commons.wikimedia.org.evil.test/wiki/Special:Redirect/file/Flag.svg?width=640",
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/..%2Fsecret?width=640",
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag.svg?width=640&redirect=https://evil.test",
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag.svg?width=9999",
    ]) {
      expect(parseWikimediaFlagSourceUrl(value)).toBeNull();
    }
  });

  it("allows only HTTPS Commons and upload redirect targets", () => {
    expect(
      isAllowedWikimediaAssetUrl("https://upload.wikimedia.org/a.svg"),
    ).toBe(true);
    expect(isAllowedWikimediaAssetUrl("https://evil.test/a.svg")).toBe(false);
    expect(
      isAllowedWikimediaAssetUrl("http://upload.wikimedia.org/a.svg"),
    ).toBe(false);
  });

  it("follows an allowed Wikimedia redirect manually", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://upload.wikimedia.org/flag.svg" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("svg", { headers: { "content-type": "image/svg+xml" } }),
      );

    const response = await fetchWikimediaFlag(
      new URL(
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag.svg?width=640",
      ),
      fetchImplementation,
    );

    expect(response.ok).toBe(true);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(fetchImplementation.mock.calls[0]?.[1]).toMatchObject({
      redirect: "manual",
    });
  });

  it("rejects redirects away from Wikimedia", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://evil.test/flag.svg" },
      }),
    );

    await expect(
      fetchWikimediaFlag(
        new URL(
          "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag.svg?width=640",
        ),
        fetchImplementation,
      ),
    ).rejects.toThrow("disallowed host");
  });

  it("rejects unsafe initial URLs before making a request", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();

    await expect(
      fetchWikimediaFlag(
        new URL("https://evil.test/flag.svg"),
        fetchImplementation,
      ),
    ).rejects.toThrow("source URL is not allowed");
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
