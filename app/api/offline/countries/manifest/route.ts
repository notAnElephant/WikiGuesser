import { NextResponse } from "next/server";

import {
  buildOfflineCountryManifest,
  buildOfflineCountryPack,
} from "@/src/lib/offline/country-pack";
import { getLatestSnapshot } from "@/src/lib/repository/snapshot-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getLatestSnapshot();
    const manifest = buildOfflineCountryManifest(
      buildOfflineCountryPack(snapshot),
    );

    return NextResponse.json(manifest, {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[offline-pack] failed to build country manifest", error);
    return NextResponse.json(
      { error: "The offline country pack is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
