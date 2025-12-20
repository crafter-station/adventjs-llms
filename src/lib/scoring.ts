export type Difficulty = "easy" | "medium" | "hard";

export type BattleMetrics = {
  success: boolean;
  timeToSolutionMs: number | null;
  executionCount: number | null;
  outputTokens: number | null;
  solutionLength: number | null;
  cost: number | null;
};

const DIFFICULTY_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
};

const BASE_POINTS = 100;
const MAX_SPEED_PENALTY = 30;
const MAX_TOKEN_PENALTY = 20;
const MAX_SOLUTION_LENGTH_PENALTY = 15;
const MAX_COST_PENALTY = 10;

export function calculateBattleScore(
  metrics: BattleMetrics,
  difficulty: Difficulty,
): number {
  if (!metrics.success) {
    return 0;
  }

  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficulty];
  const baseScore = BASE_POINTS * difficultyMultiplier;

  // Speed penalty: -1 point per 2 seconds, max -30
  const speedPenalty = Math.min(
    MAX_SPEED_PENALTY,
    (metrics.timeToSolutionMs ?? 0) / 2000,
  );

  // Execution penalty: -5 per extra attempt after first
  const executionPenalty = Math.max(0, ((metrics.executionCount ?? 1) - 1) * 5);

  // Token penalty: -1 point per 500 tokens, max -20
  const tokenPenalty = Math.min(
    MAX_TOKEN_PENALTY,
    (metrics.outputTokens ?? 0) / 500,
  );

  // Solution length penalty: -1 point per 200 chars, max -15
  const solutionLengthPenalty = Math.min(
    MAX_SOLUTION_LENGTH_PENALTY,
    (metrics.solutionLength ?? 0) / 200,
  );

  // Cost penalty: -1 point per $0.01, max -10
  const costPenalty = Math.min(MAX_COST_PENALTY, (metrics.cost ?? 0) * 100);

  const finalScore =
    baseScore -
    speedPenalty -
    executionPenalty -
    tokenPenalty -
    solutionLengthPenalty -
    costPenalty;

  return Math.round(finalScore * 100) / 100;
}

export function getScoreBreakdown(
  metrics: BattleMetrics,
  difficulty: Difficulty,
): {
  baseScore: number;
  speedPenalty: number;
  executionPenalty: number;
  tokenPenalty: number;
  solutionLengthPenalty: number;
  costPenalty: number;
  finalScore: number;
} {
  if (!metrics.success) {
    return {
      baseScore: 0,
      speedPenalty: 0,
      executionPenalty: 0,
      tokenPenalty: 0,
      solutionLengthPenalty: 0,
      costPenalty: 0,
      finalScore: 0,
    };
  }

  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficulty];
  const baseScore = BASE_POINTS * difficultyMultiplier;

  const speedPenalty = Math.min(
    MAX_SPEED_PENALTY,
    (metrics.timeToSolutionMs ?? 0) / 2000,
  );

  const executionPenalty = Math.max(0, ((metrics.executionCount ?? 1) - 1) * 5);

  const tokenPenalty = Math.min(
    MAX_TOKEN_PENALTY,
    (metrics.outputTokens ?? 0) / 500,
  );

  const solutionLengthPenalty = Math.min(
    MAX_SOLUTION_LENGTH_PENALTY,
    (metrics.solutionLength ?? 0) / 200,
  );

  const costPenalty = Math.min(MAX_COST_PENALTY, (metrics.cost ?? 0) * 100);

  const finalScore =
    baseScore -
    speedPenalty -
    executionPenalty -
    tokenPenalty -
    solutionLengthPenalty -
    costPenalty;

  return {
    baseScore: Math.round(baseScore * 100) / 100,
    speedPenalty: Math.round(speedPenalty * 100) / 100,
    executionPenalty: Math.round(executionPenalty * 100) / 100,
    tokenPenalty: Math.round(tokenPenalty * 100) / 100,
    solutionLengthPenalty: Math.round(solutionLengthPenalty * 100) / 100,
    costPenalty: Math.round(costPenalty * 100) / 100,
    finalScore: Math.round(finalScore * 100) / 100,
  };
}

export const MIN_BATTLES_FOR_RANKING = 5;
