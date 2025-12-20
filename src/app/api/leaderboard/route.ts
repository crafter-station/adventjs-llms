import { eq } from "drizzle-orm";
import { db } from "@/db";
import { battles, challenges } from "@/db/schema";
import {
  type BattleMetrics,
  calculateBattleScore,
  type Difficulty,
  MIN_BATTLES_FOR_RANKING,
} from "@/lib/scoring";

type ModelStats = {
  model: string;
  totalBattles: number;
  avgScore: number;
  successRate: number;
  avgTimeToSolution: number;
  avgExecutionCount: number;
  avgSolutionLength: number;
  avgCost: number;
};

export async function GET() {
  const completedBattles = await db
    .select()
    .from(battles)
    .where(eq(battles.status, "completed"));

  const allChallenges = await db.select().from(challenges);
  const challengeMap = new Map(allChallenges.map((c) => [c.id, c]));

  const modelStatsMap = new Map<
    string,
    {
      totalBattles: number;
      totalScore: number;
      successCount: number;
      totalExecutions: number;
      totalTimeToSolution: number;
      totalSolutionLength: number;
      totalCost: number;
    }
  >();

  const initStats = () => ({
    totalBattles: 0,
    totalScore: 0,
    successCount: 0,
    totalExecutions: 0,
    totalTimeToSolution: 0,
    totalSolutionLength: 0,
    totalCost: 0,
  });

  for (const battle of completedBattles) {
    const challenge = challengeMap.get(battle.challengeId);
    const difficulty = (challenge?.difficulty ?? "medium") as Difficulty;

    const modelAStats = modelStatsMap.get(battle.modelA) || initStats();
    const modelBStats = modelStatsMap.get(battle.modelB) || initStats();

    modelAStats.totalBattles++;
    modelBStats.totalBattles++;

    const metricsA: BattleMetrics = {
      success: battle.modelASuccess ?? false,
      timeToSolutionMs: battle.modelATimeToSolution,
      executionCount: battle.modelAExecutionCount,
      outputTokens: battle.modelAOutputTokens,
      solutionLength: battle.modelASolutionLength,
      cost: battle.modelACost,
    };

    const metricsB: BattleMetrics = {
      success: battle.modelBSuccess ?? false,
      timeToSolutionMs: battle.modelBTimeToSolution,
      executionCount: battle.modelBExecutionCount,
      outputTokens: battle.modelBOutputTokens,
      solutionLength: battle.modelBSolutionLength,
      cost: battle.modelBCost,
    };

    modelAStats.totalScore += calculateBattleScore(metricsA, difficulty);
    modelBStats.totalScore += calculateBattleScore(metricsB, difficulty);

    if (metricsA.success) {
      modelAStats.successCount++;
      modelAStats.totalTimeToSolution += metricsA.timeToSolutionMs ?? 0;
      modelAStats.totalSolutionLength += metricsA.solutionLength ?? 0;
    }
    if (metricsB.success) {
      modelBStats.successCount++;
      modelBStats.totalTimeToSolution += metricsB.timeToSolutionMs ?? 0;
      modelBStats.totalSolutionLength += metricsB.solutionLength ?? 0;
    }

    modelAStats.totalExecutions += metricsA.executionCount ?? 0;
    modelBStats.totalExecutions += metricsB.executionCount ?? 0;

    modelAStats.totalCost += metricsA.cost ?? 0;
    modelBStats.totalCost += metricsB.cost ?? 0;

    modelStatsMap.set(battle.modelA, modelAStats);
    modelStatsMap.set(battle.modelB, modelBStats);
  }

  const leaderboard: ModelStats[] = [];

  for (const [model, stats] of modelStatsMap) {
    if (stats.totalBattles < MIN_BATTLES_FOR_RANKING) {
      continue;
    }

    leaderboard.push({
      model,
      totalBattles: stats.totalBattles,
      avgScore:
        stats.totalBattles > 0
          ? Math.round((stats.totalScore / stats.totalBattles) * 100) / 100
          : 0,
      successRate:
        stats.totalBattles > 0
          ? Math.round((stats.successCount / stats.totalBattles) * 100)
          : 0,
      avgTimeToSolution:
        stats.successCount > 0
          ? Math.round(stats.totalTimeToSolution / stats.successCount)
          : 0,
      avgExecutionCount:
        stats.totalBattles > 0
          ? Math.round((stats.totalExecutions / stats.totalBattles) * 10) / 10
          : 0,
      avgSolutionLength:
        stats.successCount > 0
          ? Math.round(stats.totalSolutionLength / stats.successCount)
          : 0,
      avgCost:
        stats.totalBattles > 0
          ? Math.round((stats.totalCost / stats.totalBattles) * 10000) / 10000
          : 0,
    });
  }

  leaderboard.sort((a, b) => {
    if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;
    if (b.totalBattles !== a.totalBattles)
      return b.totalBattles - a.totalBattles;
    return a.avgCost - b.avgCost;
  });

  return Response.json({ leaderboard });
}
