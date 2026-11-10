import sharp from "sharp";

import { getOptionalActorId } from "@/src/lib/auth/actor";
import { getRevealedChallengeFlagSource } from "@/src/lib/game/challenge-service";
import { fetchWikimediaFlag } from "@/src/lib/offline/country-pack-server";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const actorId = await getOptionalActorId();
    const { code } = await params;
    const source = actorId
      ? await getRevealedChallengeFlagSource(code, actorId)
      : null;
    if (!source) return new Response(null, { status: 404, headers });

    const upstream = await fetchWikimediaFlag(source, (url, options) =>
      fetch(url, { ...options, signal: AbortSignal.timeout(5_000) }),
    );
    if (!upstream.ok) {
      await upstream.body?.cancel();
      return new Response(null, { status: 502, headers });
    }

    const image = await sharp(await upstream.arrayBuffer(), {
      limitInputPixels: 4_000_000,
    })
      .resize({ width: 96, height: 64, fit: "inside" })
      .blur(5)
      .png()
      .toBuffer();
    return new Response(new Uint8Array(image), {
      headers: { ...headers, "Content-Type": "image/png" },
    });
  } catch {
    return new Response(null, { status: 502, headers });
  }
}
