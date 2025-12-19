import { eq } from "drizzle-orm";
import { db } from "@/db";
import { battles } from "@/db/schema";

type ModelStats = {
  model: string;
  totalBattles: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgExecutionCount: number;
};

export async function GET() {
  const completedBattles = await db
    .select()
    .from(battles)
    .where(eq(battles.status, "completed"));

  const modelStatsMap = new Map<
    string,
    {
      totalBattles: number;
      wins: number;
      losses: number;
      draws: number;
      totalExecutions: number;
    }
  >();

  const initStats = () => ({
    totalBattles: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    totalExecutions: 0,
  });

  for (const battle of completedBattles) {
    const modelAStats = modelStatsMap.get(battle.modelA) || initStats();
    const modelBStats = modelStatsMap.get(battle.modelB) || initStats();

    modelAStats.totalBattles++;
    modelBStats.totalBattles++;

    if (battle.modelAExecutionCount) {
      modelAStats.totalExecutions += battle.modelAExecutionCount;
    }
    if (battle.modelBExecutionCount) {
      modelBStats.totalExecutions += battle.modelBExecutionCount;
    }

    const aSuccess = battle.modelASuccess ?? false;
    const bSuccess = battle.modelBSuccess ?? false;

    if (aSuccess && !bSuccess) {
      modelAStats.wins++;
      modelBStats.losses++;
    } else if (!aSuccess && bSuccess) {
      modelAStats.losses++;
      modelBStats.wins++;
    } else {
      modelAStats.draws++;
      modelBStats.draws++;
    }

    modelStatsMap.set(battle.modelA, modelAStats);
    modelStatsMap.set(battle.modelB, modelBStats);
  }

  const leaderboard: ModelStats[] = [];

  for (const [model, stats] of modelStatsMap) {
    leaderboard.push({
      model,
      totalBattles: stats.totalBattles,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winRate:
        stats.totalBattles > 0
          ? Math.round((stats.wins / stats.totalBattles) * 100)
          : 0,
      avgExecutionCount:
        stats.totalBattles > 0
          ? Math.round((stats.totalExecutions / stats.totalBattles) * 10) / 10
          : 0,
    });
  }

  leaderboard.sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.totalBattles - a.totalBattles;
  });

  return Response.json({ leaderboard });
}
