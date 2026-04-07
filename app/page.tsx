import { PracticeShell } from "@/src/components/practice-shell";
import { listCategorySummaries } from "@/src/lib/repository/snapshot-repository";

export default async function HomePage() {
  const categories = await listCategorySummaries();

  return (
    <main className="mx-auto min-h-screen w-full px-2 pb-2 pt-20 sm:px-3 sm:pb-3 sm:pt-24">
      <PracticeShell categories={categories} />
    </main>
  );
}
