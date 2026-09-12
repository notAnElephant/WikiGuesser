import { NextResponse } from "next/server";

import { buildOfflineCountryPack } from "@/src/lib/offline/country-pack";
import { getOfflineSnapshotByKey } from "@/src/lib/offline/country-pack-server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ snapshotKey: string }> },
) {
  try {
    const { snapshotKey } = await context.params;
    const snapshot = await getOfflineSnapshotByKey(snapshotKey);

    if (!snapshot) {
      return NextResponse.json(
        { error: "Offline country pack not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(buildOfflineCountryPack(snapshot), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[offline-pack] failed to build country pack", error);
    return NextResponse.json(
      { error: "The offline country pack is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
