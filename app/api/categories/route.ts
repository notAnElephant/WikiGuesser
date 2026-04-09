import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { listCategorySummaries } from "@/src/lib/repository/snapshot-repository";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const categories = await listCategorySummaries();
  return NextResponse.json({ categories });
}
