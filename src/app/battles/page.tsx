import { desc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { battles } from "@/db/schema";
import { MODELS } from "@/lib/models";

function getModelDisplayName(modelId: string): string {
  const model = MODELS.find((m) => m.copyString === modelId);
  return model?.displayName || modelId;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BattleStatusBadge({ status }: { status: string }) {
  const styles = {
    pending: "bg-brand-yellow/20 text-brand-yellow",
    completed: "bg-green-400/20 text-green-400",
    failed: "bg-red-400/20 text-red-400",
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-bold uppercase ${styles[status as keyof typeof styles] || styles.pending}`}
    >
      {status}
    </span>
  );
}

function BattleResultBadge({
  modelASuccess,
  modelBSuccess,
}: {
  modelASuccess: boolean | null;
  modelBSuccess: boolean | null;
}) {
  if (modelASuccess === null || modelBSuccess === null) {
    return <span className="text-xs text-muted">-</span>;
  }

  if (modelASuccess && modelBSuccess) {
    return (
      <span className="text-xs font-bold uppercase text-brand-beige">
        Draw (both solved)
      </span>
    );
  }
  if (!modelASuccess && !modelBSuccess) {
    return (
      <span className="text-xs font-bold uppercase text-muted">
        Draw (both failed)
      </span>
    );
  }
  if (modelASuccess) {
    return (
      <span className="text-xs font-bold uppercase text-green-400">A wins</span>
    );
  }
  return (
    <span className="text-xs font-bold uppercase text-green-400">B wins</span>
  );
}

async function getBattles() {
  const data = await db
    .select()
    .from(battles)
    .orderBy(desc(battles.createdAt))
    .limit(50);

  return data;
}

export default async function BattlesPage() {
  const battlesList = await getBattles();

  return (
    <main className="flex-1 overflow-auto">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-wide">
            Battle History
          </h1>
          <p className="mt-2 text-sm text-muted">View all past LLM battles</p>
        </div>

        {battlesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-muted">No battles yet.</div>
            <Link
              href="/"
              className="mt-4 border border-white/20 bg-surface px-4 py-2 text-sm uppercase text-accent transition-colors hover:bg-surface-light"
            >
              Start a battle
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden border border-white/20 pixel-shadow">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-white/20 bg-surface text-left text-xs font-bold uppercase tracking-wider text-brand-beige/60">
                  <th className="w-16 px-4 py-3">#</th>
                  <th className="px-4 py-3">Models</th>
                  <th className="w-28 px-4 py-3">Status</th>
                  <th className="w-36 px-4 py-3">Result</th>
                  <th className="w-40 px-4 py-3">Date</th>
                  <th className="w-16 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {battlesList.map((battle) => (
                  <tr
                    key={battle.id}
                    className="border-b border-white/10 transition-colors hover:bg-surface"
                  >
                    <td className="px-4 py-3 font-mono text-sm font-bold text-brand-yellow">
                      {String(battle.challengeId).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted">
                            A:
                          </span>
                          <span className="text-sm font-bold">
                            {getModelDisplayName(battle.modelA)}
                          </span>
                          {battle.modelASuccess !== null && (
                            <span
                              className={`text-xs uppercase ${battle.modelASuccess ? "text-green-400" : "text-red-400"}`}
                            >
                              {battle.modelASuccess ? "solved" : "failed"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted">
                            B:
                          </span>
                          <span className="text-sm font-bold">
                            {getModelDisplayName(battle.modelB)}
                          </span>
                          {battle.modelBSuccess !== null && (
                            <span
                              className={`text-xs uppercase ${battle.modelBSuccess ? "text-green-400" : "text-red-400"}`}
                            >
                              {battle.modelBSuccess ? "solved" : "failed"}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <BattleStatusBadge status={battle.status} />
                    </td>
                    <td className="px-4 py-3">
                      <BattleResultBadge
                        modelASuccess={battle.modelASuccess}
                        modelBSuccess={battle.modelBSuccess}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {formatDate(battle.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/battles/${battle.id}`}
                        className="text-sm uppercase text-accent transition-colors hover:text-brand-beige"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
