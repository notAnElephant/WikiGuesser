import { getDailyAdminSolutions } from "@/src/lib/repository/daily-repository";

const modeLabels = {
  classic: "Classic Daily",
  "blurred-lines": "Choose Clues Daily",
} as const;

export async function AdminDailyAnswersProfilePage() {
  const solutions = await getDailyAdminSolutions();

  return (
    <div className="w-full max-w-xl p-1 text-[#1f1b17] dark:text-[#f5f7fb]">
      <h1 className="m-0 text-2xl font-bold tracking-[-0.025em]">
        Today&apos;s daily answers
      </h1>
      <p className="mb-6 mt-2 text-sm leading-6 text-[#6b6259] dark:text-[#9aa9bb]">
        Visible only to your admin account.
      </p>
      <dl className="grid gap-3">
        {solutions.map((solution) => (
          <div
            className="rounded-xl border border-black/10 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/6"
            key={`${solution.category}-${solution.mode}`}
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b6259] dark:text-[#9aa9bb]">
              {modeLabels[solution.mode]}
            </dt>
            <dd className="m-0 mt-1 text-lg font-semibold">
              {solution.canonicalAnswer}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
