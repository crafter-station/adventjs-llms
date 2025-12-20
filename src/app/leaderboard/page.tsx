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

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  return (
    <main className="flex-1 overflow-auto">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
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
          <>
            {leaderboard.length >= 3 && (
              <div className="mb-8">
                <div className="grid gap-4 md:grid-cols-3">
                  {/* 2nd Place */}
                  <div className="order-1 flex flex-col md:order-1">
                    <div className="flex-1 border-2 border-brand-beige/40 bg-surface p-6 pixel-shadow transition-transform hover:scale-[1.02]">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-4xl font-bold text-brand-beige">
                          2
                        </span>
                        <span className="text-xs uppercase tracking-wider text-brand-beige">
                          Silver
                        </span>
                      </div>
                      <div className="mb-2 text-xl font-bold">
                        {leaderboard[1].displayName}
                      </div>
                      <div className="mb-4 truncate font-mono text-xs text-muted">
                        {leaderboard[1].model}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-2xl font-bold text-brand-beige">
                            {leaderboard[1].winRate}%
                          </div>
                          <div className="text-xs uppercase text-muted">
                            Win Rate
                          </div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">
                            <span className="text-green-400">
                              {leaderboard[1].wins}
                            </span>
                            <span className="text-muted">/</span>
                            <span className="text-red-400">
                              {leaderboard[1].losses}
                            </span>
                            <span className="text-muted">/</span>
                            <span>{leaderboard[1].draws}</span>
                          </div>
                          <div className="text-xs uppercase text-muted">
                            W/L/D
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-lg font-bold">
                            {leaderboard[1].avgTimeToSolution > 0
                              ? `${(leaderboard[1].avgTimeToSolution / 1000).toFixed(1)}s`
                              : "-"}
                          </div>
                          <div className="text-xs uppercase text-muted">
                            Avg Time
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-lg font-bold">
                            {leaderboard[1].totalBattles}
                          </div>
                          <div className="text-xs uppercase text-muted">
                            Battles
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1st Place */}
                  <div className="order-first flex flex-col md:order-2">
                    <div className="flex-1 border-2 border-brand-yellow bg-surface p-6 glow-gold transition-transform hover:scale-[1.02]">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-5xl font-bold text-brand-yellow">
                          1
                        </span>
                        <span className="text-xs uppercase tracking-wider text-brand-yellow">
                          Champion
                        </span>
                      </div>
                      <div className="mb-2 text-2xl font-bold">
                        {leaderboard[0].displayName}
                      </div>
                      <div className="mb-4 truncate font-mono text-xs text-muted">
                        {leaderboard[0].model}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-3xl font-bold text-brand-yellow">
                            {leaderboard[0].winRate}%
                          </div>
                          <div className="text-xs uppercase text-muted">
                            Win Rate
                          </div>
                        </div>
                        <div>
                          <div className="text-xl font-bold">
                            <span className="text-green-400">
                              {leaderboard[0].wins}
                            </span>
                            <span className="text-muted">/</span>
                            <span className="text-red-400">
                              {leaderboard[0].losses}
                            </span>
                            <span className="text-muted">/</span>
                            <span>{leaderboard[0].draws}</span>
                          </div>
                          <div className="text-xs uppercase text-muted">
                            W/L/D
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-xl font-bold">
                            {leaderboard[0].avgTimeToSolution > 0
                              ? `${(leaderboard[0].avgTimeToSolution / 1000).toFixed(1)}s`
                              : "-"}
                          </div>
                          <div className="text-xs uppercase text-muted">
                            Avg Time
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-xl font-bold">
                            {leaderboard[0].totalBattles}
                          </div>
                          <div className="text-xs uppercase text-muted">
                            Battles
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="order-3 flex flex-col">
                    <div className="flex-1 border-2 border-red-400/40 bg-surface p-6 pixel-shadow transition-transform hover:scale-[1.02]">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-4xl font-bold text-red-400">
                          3
                        </span>
                        <span className="text-xs uppercase tracking-wider text-red-400">
                          Bronze
                        </span>
                      </div>
                      <div className="mb-2 text-xl font-bold">
                        {leaderboard[2].displayName}
                      </div>
                      <div className="mb-4 truncate font-mono text-xs text-muted">
                        {leaderboard[2].model}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-2xl font-bold text-red-400">
                            {leaderboard[2].winRate}%
                          </div>
                          <div className="text-xs uppercase text-muted">
                            Win Rate
                          </div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">
                            <span className="text-green-400">
                              {leaderboard[2].wins}
                            </span>
                            <span className="text-muted">/</span>
                            <span className="text-red-400">
                              {leaderboard[2].losses}
                            </span>
                            <span className="text-muted">/</span>
                            <span>{leaderboard[2].draws}</span>
                          </div>
                          <div className="text-xs uppercase text-muted">
                            W/L/D
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-lg font-bold">
                            {leaderboard[2].avgTimeToSolution > 0
                              ? `${(leaderboard[2].avgTimeToSolution / 1000).toFixed(1)}s`
                              : "-"}
                          </div>
                          <div className="text-xs uppercase text-muted">
                            Avg Time
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-lg font-bold">
                            {leaderboard[2].totalBattles}
                          </div>
                          <div className="text-xs uppercase text-muted">
                            Battles
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <LeaderboardTable data={leaderboard} />
          </>
        )}
      </div>
    </main>
  );
}
