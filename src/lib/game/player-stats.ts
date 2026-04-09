export interface CategoryModeStatsSnapshot {
  roundsPlayed: number;
  roundsWon: number;
  totalScore: number;
  bestScore: number;
  currentStreak: number;
  bestStreak: number;
}

export interface CompletedRoundStatsInput {
  score: number;
  isCorrect: boolean;
  completedAt: Date;
}

export function buildNextCategoryModeStats(
  current: CategoryModeStatsSnapshot | null,
  completedRound: CompletedRoundStatsInput,
): CategoryModeStatsSnapshot & { lastPlayedAt: Date } {
  const roundsPlayed = (current?.roundsPlayed ?? 0) + 1;
  const roundsWon =
    (current?.roundsWon ?? 0) + (completedRound.isCorrect ? 1 : 0);
  const totalScore = (current?.totalScore ?? 0) + completedRound.score;
  const bestScore = Math.max(current?.bestScore ?? 0, completedRound.score);
  const currentStreak = completedRound.isCorrect
    ? (current?.currentStreak ?? 0) + 1
    : 0;
  const bestStreak = Math.max(current?.bestStreak ?? 0, currentStreak);

  return {
    roundsPlayed,
    roundsWon,
    totalScore,
    bestScore,
    currentStreak,
    bestStreak,
    lastPlayedAt: completedRound.completedAt,
  };
}
