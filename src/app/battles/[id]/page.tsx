import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { battles, challenges } from "@/db/schema";
import { MODELS } from "@/lib/models";
import { BattleRealtime } from "./battle-realtime";

function getModelDisplayName(modelId: string): string {
  const model = MODELS.find((m) => m.copyString === modelId);
  return model?.displayName || modelId;
}

function StatusBadge({
  status,
}: {
  status: "pending" | "completed" | "failed";
}) {
  const styles = {
    completed: "bg-green-400/20 text-green-400",
    failed: "bg-red-400/20 text-red-400",
    pending: "bg-brand-yellow/20 text-brand-yellow",
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-bold uppercase ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default async function BattleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [battle] = await db
    .select()
    .from(battles)
    .where(eq(battles.id, id))
    .limit(1);

  if (!battle) {
    notFound();
  }

  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, battle.challengeId))
    .limit(1);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/20 bg-surface">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-2 sm:px-6 sm:py-4">
          <h1 className="text-sm font-bold uppercase tracking-wide sm:text-xl">
            {getModelDisplayName(battle.modelA)} vs{" "}
            {getModelDisplayName(battle.modelB)}
          </h1>
          <StatusBadge
            status={battle.status as "pending" | "completed" | "failed"}
          />
        </div>
      </div>

      {challenge && (
        <div className="shrink-0 border-b border-white/20">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-left transition-colors sm:py-3 [&::-webkit-details-marker]:hidden">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <span className="font-mono text-xs font-bold text-brand-yellow sm:text-sm">
                    #{String(challenge.id).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-bold sm:text-base">
                    {challenge.title}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold uppercase sm:text-xs ${
                      challenge.difficulty === "easy"
                        ? "difficulty-easy"
                        : challenge.difficulty === "medium"
                          ? "difficulty-medium"
                          : "difficulty-hard"
                    }`}
                  >
                    {challenge.difficulty}
                  </span>
                  <a
                    href={`https://adventjs.dev/challenges/2025/${challenge.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] uppercase text-accent hover:underline sm:text-xs"
                  >
                    View on AdventJS
                  </a>
                </div>
                <span className="font-mono text-muted group-open:hidden">
                  +
                </span>
                <span className="font-mono text-muted hidden group-open:inline">
                  -
                </span>
              </summary>
              <div className="mb-4 border border-white/20 bg-surface p-4">
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-sm text-muted">
                  {challenge.description}
                </pre>
              </div>
            </details>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1">
        <BattleRealtime
          runId={battle.triggerRunId}
          accessToken={battle.triggerPublicToken}
          modelAName={getModelDisplayName(battle.modelA)}
          modelBName={getModelDisplayName(battle.modelB)}
        />
      </div>
    </div>
  );
}
