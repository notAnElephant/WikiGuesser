import type { MaterializedSnapshot } from "@/src/lib/types";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";
import { getPrismaClient } from "@/src/lib/repository/prisma";
import {
  getCountryFlagSourceUrlFromClues,
  isAllowedWikimediaAssetUrl,
  parseWikimediaFlagSourceUrl,
} from "@/src/lib/offline/country-pack";

export async function getOfflineSnapshotByKey(
  snapshotKey: string,
): Promise<MaterializedSnapshot | null> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(snapshotKey)) {
    return null;
  }

  const snapshot = await getLatestSnapshot();
  return snapshot.key === snapshotKey ? snapshot : null;
}

export async function getOfflineCountryFlagSourceUrl(
  snapshotKey: string,
  qid: string,
): Promise<URL | null> {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(snapshotKey) ||
    !/^Q[1-9]\d*$/.test(qid)
  ) {
    return null;
  }

  const record = await getPrismaClient().snapshotEntity.findFirst({
    where: {
      qid,
      category: "countries",
      snapshotVersion: { is: { key: snapshotKey } },
    },
    select: { clues: true },
  });

  return getCountryFlagSourceUrlFromClues(record?.clues);
}

export async function fetchWikimediaFlag(
  sourceUrl: URL,
  fetchImplementation: typeof fetch = fetch,
): Promise<Response> {
  if (!parseWikimediaFlagSourceUrl(sourceUrl.href)) {
    throw new Error("The Wikimedia flag source URL is not allowed.");
  }

  let currentUrl = sourceUrl;

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    const response = await fetchImplementation(currentUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent":
          "WikiGuesser/1.0 (https://www.wikiguesser.me; offline flag pack)",
      },
      redirect: "manual",
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error("Wikimedia returned a redirect without a location.");
    }

    const nextUrl = new URL(location, currentUrl);
    if (!isAllowedWikimediaAssetUrl(nextUrl.href)) {
      throw new Error("Wikimedia redirected to a disallowed host.");
    }

    await response.body?.cancel();
    currentUrl = nextUrl;
  }

  throw new Error("Wikimedia returned too many redirects.");
}
