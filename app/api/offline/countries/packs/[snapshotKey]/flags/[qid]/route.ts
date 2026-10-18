import { NextResponse } from "next/server";

import {
  fetchWikimediaFlag,
  getOfflineCountryFlagSourceUrl,
} from "@/src/lib/offline/country-pack-server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ snapshotKey: string; qid: string }> },
) {
  const { snapshotKey, qid } = await context.params;

  if (!/^Q[1-9]\d*$/.test(qid)) {
    return notFound();
  }

  try {
    const sourceUrl = await getOfflineCountryFlagSourceUrl(snapshotKey, qid);

    if (!sourceUrl) {
      return notFound();
    }

    const upstream = await fetchWikimediaFlag(sourceUrl);
    const contentType = upstream.headers.get("content-type");

    if (!upstream.ok || !contentType?.toLowerCase().startsWith("image/")) {
      await upstream.body?.cancel();
      return NextResponse.json(
        { error: "The country flag is temporarily unavailable." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const headers = new Headers({
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    });
    const etag = upstream.headers.get("etag");

    if (etag) headers.set("ETag", etag);

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error("[offline-pack] failed to proxy country flag", {
      snapshotKey,
      qid,
      error,
    });
    return NextResponse.json(
      { error: "The country flag is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function notFound() {
  return NextResponse.json(
    { error: "Country flag not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}
