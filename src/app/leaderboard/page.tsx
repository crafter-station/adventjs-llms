import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { battles } from "@/db/schema";
import { MODELS } from "@/lib/models";
import { LeaderboardTable } from "./leaderboard-table";

export type ModelStats = {
  model: string;
  displayName: string;
  totalBattles: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgTimeToSolution: number;
  avgExecutionCount: number;
  avgOutputTokens: number;
  avgCost: number;
  totalCost: number;
};

function getModelDisplayName(modelId: string): string {
  const model = MODELS.find((m) => m.copyString === modelId);
  return model?.displayName || modelId;
}

async function getLeaderboard(): Promise<ModelStats[]> {
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
      totalTimeToSolution: number;
      totalOutputTokens: number;
      totalCost: number;
      successCount: number;
    }
  >();

  const initStats = () => ({
    totalBattles: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    totalExecutions: 0,
    totalTimeToSolution: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    successCount: 0,
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

    if (battle.modelATimeToSolution) {
      modelAStats.totalTimeToSolution += battle.modelATimeToSolution;
    }
    if (battle.modelBTimeToSolution) {
      modelBStats.totalTimeToSolution += battle.modelBTimeToSolution;
    }

    if (battle.modelAOutputTokens) {
      modelAStats.totalOutputTokens += battle.modelAOutputTokens;
    }
    if (battle.modelBOutputTokens) {
      modelBStats.totalOutputTokens += battle.modelBOutputTokens;
    }

    if (battle.modelACost) {
      modelAStats.totalCost += battle.modelACost;
    }
    if (battle.modelBCost) {
      modelBStats.totalCost += battle.modelBCost;
    }

    const aSuccess = battle.modelASuccess ?? false;
    const bSuccess = battle.modelBSuccess ?? false;

    if (aSuccess) modelAStats.successCount++;
    if (bSuccess) modelBStats.successCount++;

    if (aSuccess && bSuccess) {
      const aTime = battle.modelATimeToSolution ?? Number.POSITIVE_INFINITY;
      const bTime = battle.modelBTimeToSolution ?? Number.POSITIVE_INFINITY;

      if (aTime < bTime) {
        modelAStats.wins++;
        modelBStats.losses++;
      } else if (bTime < aTime) {
        modelBStats.wins++;
        modelAStats.losses++;
      } else {
        const aExec = battle.modelAExecutionCount ?? Number.POSITIVE_INFINITY;
        const bExec = battle.modelBExecutionCount ?? Number.POSITIVE_INFINITY;

        if (aExec < bExec) {
          modelAStats.wins++;
          modelBStats.losses++;
        } else if (bExec < aExec) {
          modelBStats.wins++;
          modelAStats.losses++;
        } else {
          modelAStats.draws++;
          modelBStats.draws++;
        }
      }
    } else if (aSuccess && !bSuccess) {
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
      displayName: getModelDisplayName(model),
      totalBattles: stats.totalBattles,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      winRate:
        stats.totalBattles > 0
          ? Math.round((stats.wins / stats.totalBattles) * 100)
          : 0,
      avgTimeToSolution:
        stats.successCount > 0
          ? Math.round(stats.totalTimeToSolution / stats.successCount)
          : 0,
      avgExecutionCount:
        stats.totalBattles > 0
          ? Math.round((stats.totalExecutions / stats.totalBattles) * 10) / 10
          : 0,
      avgOutputTokens:
        stats.totalBattles > 0
          ? Math.round(stats.totalOutputTokens / stats.totalBattles)
          : 0,
      avgCost:
        stats.totalBattles > 0
          ? Math.round((stats.totalCost / stats.totalBattles) * 10000) / 10000
          : 0,
      totalCost: Math.round(stats.totalCost * 10000) / 10000,
    });
  }

  leaderboard.sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (a.avgTimeToSolution !== b.avgTimeToSolution)
      return a.avgTimeToSolution - b.avgTimeToSolution;
    if (a.avgExecutionCount !== b.avgExecutionCount)
      return a.avgExecutionCount - b.avgExecutionCount;
    return b.wins - a.wins;
  });

  return leaderboard;
}

export type GlobalStats = {
  totalBattles: number;
  totalExecutions: number;
  totalModels: number;
  totalCost: number;
};

async function getGlobalStats(): Promise<GlobalStats> {
  const completedBattles = await db
    .select()
    .from(battles)
    .where(eq(battles.status, "completed"));

  const models = new Set<string>();
  let totalExecutions = 0;
  let totalCost = 0;

  for (const battle of completedBattles) {
    models.add(battle.modelA);
    models.add(battle.modelB);
    totalExecutions +=
      (battle.modelAExecutionCount ?? 0) + (battle.modelBExecutionCount ?? 0);
    totalCost += (battle.modelACost ?? 0) + (battle.modelBCost ?? 0);
  }

  return {
    totalBattles: completedBattles.length,
    totalExecutions,
    totalModels: models.size,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();
  const globalStats = await getGlobalStats();

  return (
    <main className="flex-1 overflow-auto">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-wide">
            Leaderboard
          </h1>
          <p className="mt-2 text-sm text-muted">
            Rankings based on{" "}
            <a
              href="https://adventjs.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              AdventJS 2025
            </a>{" "}
            battle results. Click column headers to sort.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-white/20 bg-surface p-4 pixel-shadow">
            <div className="text-2xl font-bold text-brand-yellow">
              {globalStats.totalBattles}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted">
              Battles Completed
            </div>
          </div>
          <div className="border border-white/20 bg-surface p-4 pixel-shadow">
            <div className="text-2xl font-bold text-green-400">
              {globalStats.totalExecutions}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted">
              Code Executions via{" "}
              <a
                href="https://github.com/crafter-station/exec0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                exec0
              </a>
            </div>
          </div>
          <div className="border border-white/20 bg-surface p-4 pixel-shadow">
            <div className="text-2xl font-bold text-brand-beige">
              {globalStats.totalModels}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted">
              Models Tested
            </div>
          </div>
          <div className="border border-white/20 bg-surface p-4 pixel-shadow">
            <div className="text-2xl font-bold text-red-400">
              ${globalStats.totalCost}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted">
              Total API Cost
            </div>
          </div>
        </div>

        {leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-muted">No battles completed yet.</div>
            <Link
              href="/"
              className="mt-4 border border-white/20 bg-surface px-4 py-2 text-sm uppercase text-accent transition-colors hover:bg-surface-light"
            >
              Start a battle
            </Link>
          </div>
        ) : (
          <LeaderboardTable data={leaderboard} />
        )}
      </div>
    </main>
  );
}
