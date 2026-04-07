import { NextResponse } from "next/server";

import { listCategorySummaries } from "@/src/lib/repository/snapshot-repository";

export async function GET() {
  const categories = await listCategorySummaries();
  return NextResponse.json({ categories });
}
