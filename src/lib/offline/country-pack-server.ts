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
  fetchImplementation: typeof fetch = (input, init) =>
    globalThis.fetch(input, init),
): Promise<Response> {
  if (!parseWikimediaFlagSourceUrl(sourceUrl.href)) {
    throw new Error("The Wikimedia flag source URL is not allowed.");
  }

  const response = await fetchImplementation(sourceUrl, {
    cache: "no-store",
    headers: {
      Accept: "image/avif,image/webp,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent":
        "WikiGuesser/1.0 (https://www.wikiguesser.me; offline flag pack)",
    },
    redirect: "follow",
  });

  if (!isAllowedWikimediaAssetUrl(response.url)) {
    await response.body?.cancel();
    throw new Error("Wikimedia redirected to a disallowed host.");
  }

  return response;
}
