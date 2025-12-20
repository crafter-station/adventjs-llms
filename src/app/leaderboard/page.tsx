import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { battles, challenges } from "@/db/schema";
import { MODELS } from "@/lib/models";
import {
  type BattleMetrics,
  calculateBattleScore,
  type Difficulty,
  MIN_BATTLES_FOR_RANKING,
} from "@/lib/scoring";
import { LeaderboardTable } from "./leaderboard-table";

export type ModelStats = {
  model: string;
  displayName: string;
  totalBattles: number;
  avgScore: number;
  successRate: number;
  avgTimeToSolution: number;
  avgExecutionCount: number;
  avgSolutionLength: number;
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
      displayName: getModelDisplayName(model),
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
      totalCost: Math.round(stats.totalCost * 10000) / 10000,
    });
  }

  leaderboard.sort((a, b) => {
    if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;
    if (b.totalBattles !== a.totalBattles)
      return b.totalBattles - a.totalBattles;
    return a.avgCost - b.avgCost;
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
            battle performance. Score (
            <a
              href="https://github.com/crafter-station/advent0/blob/main/src/lib/scoring.ts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              see algorithm
            </a>
            ) combines speed, efficiency, cost, and code conciseness. Minimum{" "}
            {MIN_BATTLES_FOR_RANKING} battles required.
          </p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-muted">
              No models have completed {MIN_BATTLES_FOR_RANKING}+ battles yet.
            </div>
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
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-2xl font-bold text-brand-beige">
                            {leaderboard[1].avgScore}
                          </div>
                          <div className="text-xs uppercase text-muted">
                            Avg Score
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
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-3xl font-bold text-brand-yellow">
                            {leaderboard[0].avgScore}
                          </div>
                          <div className="text-xs uppercase text-muted">
                            Avg Score
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
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-2xl font-bold text-red-400">
                            {leaderboard[2].avgScore}
                          </div>
                          <div className="text-xs uppercase text-muted">
                            Avg Score
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
