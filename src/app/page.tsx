import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { BattleArena } from "@/components/battle-arena";
import { db } from "@/db";
import { battles, challenges } from "@/db/schema";
import { MODELS } from "@/lib/models";
import {
  type BattleMetrics,
  calculateBattleScore,
  type Difficulty,
  MIN_BATTLES_FOR_RANKING,
} from "@/lib/scoring";

async function getChallenges() {
  const allChallenges = await db
    .select({
      id: challenges.id,
      title: challenges.title,
      difficulty: challenges.difficulty,
    })
    .from(challenges)
    .orderBy(challenges.id);

  return allChallenges;
}

function getModelDisplayName(modelId: string): string {
  const model = MODELS.find((m) => m.copyString === modelId);
  return model?.displayName || modelId;
}

async function getGlobalStats() {
  const completedBattles = await db
    .select()
    .from(battles)
    .where(eq(battles.status, "completed"));

  const models = new Set<string>();
  let totalExecutions = 0;

  for (const battle of completedBattles) {
    models.add(battle.modelA);
    models.add(battle.modelB);
    totalExecutions +=
      (battle.modelAExecutionCount ?? 0) + (battle.modelBExecutionCount ?? 0);
  }

  return {
    totalBattles: completedBattles.length,
    totalExecutions,
    totalModels: models.size,
  };
}

async function getTopModels() {
  const completedBattles = await db
    .select()
    .from(battles)
    .where(eq(battles.status, "completed"));

  const allChallenges = await db.select().from(challenges);
  const challengeMap = new Map(allChallenges.map((c) => [c.id, c]));

  const modelStats = new Map<
    string,
    {
      totalScore: number;
      totalBattles: number;
      totalTime: number;
      successCount: number;
    }
  >();

  for (const battle of completedBattles) {
    const challenge = challengeMap.get(battle.challengeId);
    const difficulty = (challenge?.difficulty ?? "medium") as Difficulty;

    const aStats = modelStats.get(battle.modelA) || {
      totalScore: 0,
      totalBattles: 0,
      totalTime: 0,
      successCount: 0,
    };
    const bStats = modelStats.get(battle.modelB) || {
      totalScore: 0,
      totalBattles: 0,
      totalTime: 0,
      successCount: 0,
    };

    aStats.totalBattles++;
    bStats.totalBattles++;

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

    aStats.totalScore += calculateBattleScore(metricsA, difficulty);
    bStats.totalScore += calculateBattleScore(metricsB, difficulty);

    if (metricsA.success) {
      aStats.successCount++;
      aStats.totalTime += metricsA.timeToSolutionMs ?? 0;
    }
    if (metricsB.success) {
      bStats.successCount++;
      bStats.totalTime += metricsB.timeToSolutionMs ?? 0;
    }

    modelStats.set(battle.modelA, aStats);
    modelStats.set(battle.modelB, bStats);
  }

  return Array.from(modelStats.entries())
    .filter(([, stats]) => stats.totalBattles >= MIN_BATTLES_FOR_RANKING)
    .map(([model, stats]) => ({
      model,
      displayName: getModelDisplayName(model),
      avgScore:
        stats.totalBattles > 0
          ? Math.round((stats.totalScore / stats.totalBattles) * 100) / 100
          : 0,
      avgTime:
        stats.successCount > 0
          ? Math.round(stats.totalTime / stats.successCount)
          : 0,
      battles: stats.totalBattles,
    }))
    .sort((a, b) => {
      if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
      return a.avgTime - b.avgTime;
    })
    .slice(0, 5);
}

export default async function Home() {
  const [challengesList, stats, topModels] = await Promise.all([
    getChallenges(),
    getGlobalStats(),
    getTopModels(),
  ]);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-auto">
      <section className="mesh-gradient relative border-b border-white/20">
        {/* AdventJS branding and stickers - right side */}
        <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-1/3 items-center justify-center lg:flex">
          <div className="relative flex flex-col items-center">
            {/* AdventJS Logo - prominent */}
            <a
              href="https://adventjs.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto relative z-10 transition-transform hover:scale-105"
            >
              <Image
                src="/adventjs/logo.webp"
                alt="AdventJS"
                width={280}
                height={280}
                className="drop-shadow-2xl"
              />
            </a>
            {/* Stickers around the logo - positioned in a circle */}
            <Image
              src="/adventjs/1-christmas-tree.webp"
              alt=""
              width={80}
              height={80}
              className="absolute -right-12 -top-8 rotate-12"
            />
            <Image
              src="/adventjs/5-bell-with-bow.webp"
              alt=""
              width={65}
              height={65}
              className="absolute -bottom-16 -left-4 -rotate-12"
            />
            <Image
              src="/adventjs/3-gift-icon.webp"
              alt=""
              width={70}
              height={70}
              className="absolute -bottom-12 -right-8 rotate-6"
            />
            <Image
              src="/adventjs/10-snowflake-image.webp"
              alt=""
              width={55}
              height={55}
              className="absolute -left-16 top-8 -rotate-6"
            />
            <Image
              src="/adventjs/13-santa-image.webp"
              alt=""
              width={60}
              height={60}
              className="absolute -right-20 top-1/3 rotate-6"
            />
            <Image
              src="/adventjs/15-pixel-art-deer.webp"
              alt=""
              width={55}
              height={55}
              className="absolute -left-20 top-1/2 -rotate-6"
            />
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-16">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <a
              href="https://crafterstation.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 border border-white/20 bg-brand-red px-4 transition-colors hover:bg-brand-red-dark"
            >
              <span className="text-xs uppercase tracking-widest text-brand-beige">
                Built by{" "}
                <span className="font-bold text-brand-yellow">
                  Crafter Station
                </span>
              </span>
            </a>
            <a
              href="https://github.com/crafter-station/exec0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-3 border border-white/20 bg-brand-red px-4 transition-colors hover:bg-brand-red-dark"
            >
              <span className="flex h-6 w-6 items-center justify-center bg-brand-beige text-xs font-bold text-brand-red-dark">
                e0
              </span>
              <span className="text-xs uppercase tracking-widest text-brand-beige">
                Powered by{" "}
                <span className="font-bold text-brand-yellow">exec0</span>
              </span>
            </a>
          </div>

          <h1 className="mb-4 text-3xl font-bold uppercase tracking-wider text-brand-beige md:text-5xl lg:text-6xl">
            <span className="text-brand-yellow">advent0</span>
            <br />
            LLM Battle Arena
          </h1>

          <p className="mb-8 max-w-xl text-sm uppercase tracking-wider text-brand-beige/80">
            Real-time AI coding battles. No static benchmarks—watch models
            think, iterate, and debug live on AdventJS challenges.
          </p>

          {stats.totalBattles > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
              <div className="border border-white/20 bg-brand-red-dark/50 px-6 py-4 pixel-shadow">
                <div className="text-3xl font-bold text-brand-beige">
                  {stats.totalBattles}
                </div>
                <div className="text-xs uppercase tracking-wider text-brand-beige/60">
                  Battles
                </div>
              </div>
              <div className="border border-white/20 bg-brand-red-dark/50 px-6 py-4 pixel-shadow">
                <div className="text-3xl font-bold text-brand-beige">
                  {stats.totalExecutions}
                </div>
                <div className="text-xs uppercase tracking-wider text-brand-beige/60">
                  Code Executions
                </div>
              </div>
              <div className="border border-white/20 bg-brand-red-dark/50 px-6 py-4 pixel-shadow">
                <div className="text-3xl font-bold text-brand-beige">
                  {stats.totalModels}
                </div>
                <div className="text-xs uppercase tracking-wider text-brand-beige/60">
                  Models Ranked
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {topModels.length > 0 && (
        <section className="border-b border-white/20 bg-brand-red-dark">
          <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-brand-beige/60">
                Top Performers
              </h2>
              <Link
                href="/leaderboard"
                className="text-sm uppercase tracking-wider text-accent hover:underline"
              >
                View Full Ranking ↗
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
              {topModels.map((model, i) => (
                <div
                  key={model.model}
                  className="flex items-center gap-3 border border-white/20 bg-brand-red p-4 pixel-shadow"
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center text-sm font-bold ${
                      i === 0
                        ? "bg-brand-yellow text-brand-red-dark"
                        : i === 1
                          ? "bg-zinc-400 text-brand-red-dark"
                          : i === 2
                            ? "bg-orange-500 text-white"
                            : "bg-brand-red-dark text-brand-beige/60"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold uppercase text-brand-beige">
                      {model.displayName}
                    </div>
                    <div className="flex items-center gap-2 text-xs uppercase text-brand-beige/60">
                      <span className="text-green-400">{model.avgScore}</span>
                      {model.avgTime > 0 && (
                        <span>{(model.avgTime / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <BattleArena challenges={challengesList} />

      <section className="border-t border-white/20 bg-brand-red">
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-12">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-xl font-bold uppercase tracking-wider text-brand-beige">
                About advent0
              </h2>
              <p className="text-sm uppercase leading-relaxed tracking-wider text-brand-beige/70">
                advent0 pits AI models against each other on{" "}
                <a
                  href="https://adventjs.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-yellow hover:underline"
                >
                  AdventJS 2025
                </a>{" "}
                coding challenges. Models are given the same challenge and must
                write JavaScript code to solve it. We measure who solves it
                first, with the fewest iterations, using the least tokens.
              </p>
              <p className="mt-4 text-sm uppercase leading-relaxed tracking-wider text-brand-beige/70">
                Unlike static benchmarks, battles happen in real-time with
                actual code execution. You can watch the models think, iterate,
                and debug their solutions live.
              </p>
              <a
                href="https://crafterstation.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm uppercase tracking-wider text-brand-yellow hover:underline"
              >
                A Crafter Station project
                <span>↗</span>
              </a>
            </div>
            <div className="border border-white/20 bg-brand-beige p-6 pixel-shadow">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center bg-brand-red-dark">
                  <span className="text-lg font-bold text-brand-beige">e0</span>
                </div>
                <div>
                  <h3 className="font-bold uppercase text-brand-red-dark">
                    Code Execution by exec0
                  </h3>
                  <p className="text-xs uppercase text-brand-red-dark/70">
                    Secure JavaScript sandbox
                  </p>
                </div>
              </div>
              <p className="text-sm uppercase leading-relaxed tracking-wider text-brand-red-dark/80">
                Every code execution in this arena is powered by{" "}
                <a
                  href="https://github.com/crafter-station/exec0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-brand-red-dark hover:underline"
                >
                  exec0
                </a>
                , a blazing-fast JavaScript sandbox. Models can safely run and
                test their code in isolated environments with sub-100ms latency.
              </p>
              <a
                href="https://github.com/crafter-station/exec0"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 border-2 border-brand-red-dark bg-brand-red-dark px-4 py-2 text-sm font-bold uppercase tracking-wider text-brand-beige transition-colors hover:bg-transparent hover:text-brand-red-dark"
              >
                View on GitHub
                <span>↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
