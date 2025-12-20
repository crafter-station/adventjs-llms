"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import type { Battle } from "@/db/schema";
import { MODELS } from "@/lib/models";
import {
  type BattleMetrics,
  calculateBattleScore,
  type Difficulty,
} from "@/lib/scoring";

type SortField =
  | "createdAt"
  | "challengeId"
  | "scoreA"
  | "scoreB"
  | "totalCost";
type SortOrder = "asc" | "desc";

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

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortOrder;
}) {
  if (!active) {
    return (
      <svg
        className="ml-1 inline h-3 w-3 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M7 10l5-5 5 5M7 14l5 5 5-5" />
      </svg>
    );
  }
  return direction === "asc" ? (
    <svg
      className="ml-1 inline h-3 w-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M7 14l5-5 5 5" />
    </svg>
  ) : (
    <svg
      className="ml-1 inline h-3 w-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M7 10l5 5 5-5" />
    </svg>
  );
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-400";
  if (score >= 70) return "text-brand-yellow";
  if (score >= 50) return "text-brand-beige";
  if (score > 0) return "text-red-400";
  return "text-muted";
}

function calculateScore(
  battle: Battle,
  model: "A" | "B",
  difficulty: Difficulty,
): number {
  const metrics: BattleMetrics = {
    success:
      model === "A"
        ? (battle.modelASuccess ?? false)
        : (battle.modelBSuccess ?? false),
    timeToSolutionMs:
      model === "A" ? battle.modelATimeToSolution : battle.modelBTimeToSolution,
    executionCount:
      model === "A" ? battle.modelAExecutionCount : battle.modelBExecutionCount,
    outputTokens:
      model === "A" ? battle.modelAOutputTokens : battle.modelBOutputTokens,
    solutionLength:
      model === "A" ? battle.modelASolutionLength : battle.modelBSolutionLength,
    cost: model === "A" ? battle.modelACost : battle.modelBCost,
  };
  return calculateBattleScore(metrics, difficulty);
}

const SORT_DEFAULTS: Record<SortField, SortOrder> = {
  createdAt: "desc",
  challengeId: "asc",
  scoreA: "desc",
  scoreB: "desc",
  totalCost: "asc",
};

type BattlesTableProps = {
  battles: Battle[];
  challengeMap: Record<number, { difficulty: string }>;
  sortField: SortField;
  sortOrder: SortOrder;
};

export function BattlesTable({
  battles,
  challengeMap,
  sortField,
  sortOrder,
}: BattlesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = useCallback(
    (field: SortField) => {
      const params = new URLSearchParams(searchParams.toString());

      if (sortField === field) {
        params.set("sortOrder", sortOrder === "asc" ? "desc" : "asc");
      } else {
        params.set("sortField", field);
        params.set("sortOrder", SORT_DEFAULTS[field]);
      }

      params.delete("page");

      router.push(`/battles?${params.toString()}`);
    },
    [router, searchParams, sortField, sortOrder],
  );

  const columns: {
    key: SortField | null;
    label: string;
    width: string;
    align?: "left" | "right" | "center";
  }[] = [
    { key: "challengeId", label: "Challenge", width: "w-28" },
    { key: null, label: "Models", width: "" },
    { key: "scoreA", label: "Score A", width: "w-24", align: "right" },
    { key: "scoreB", label: "Score B", width: "w-24", align: "right" },
    { key: "totalCost", label: "Total Cost", width: "w-32", align: "right" },
    { key: "createdAt", label: "Date", width: "w-40" },
    { key: null, label: "", width: "w-16" },
  ];

  const battlesWithScores = battles.map((battle) => {
    const difficulty = (challengeMap[battle.challengeId]?.difficulty ??
      "medium") as Difficulty;
    const scoreA =
      battle.status === "completed"
        ? calculateScore(battle, "A", difficulty)
        : null;
    const scoreB =
      battle.status === "completed"
        ? calculateScore(battle, "B", difficulty)
        : null;
    const totalCost = (battle.modelACost ?? 0) + (battle.modelBCost ?? 0);
    return { battle, scoreA, scoreB, totalCost, difficulty };
  });

  const sortedBattles = [...battlesWithScores].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "scoreA":
        comparison = (a.scoreA ?? -1) - (b.scoreA ?? -1);
        break;
      case "scoreB":
        comparison = (a.scoreB ?? -1) - (b.scoreB ?? -1);
        break;
      case "totalCost":
        comparison = a.totalCost - b.totalCost;
        break;
      case "challengeId":
        comparison = a.battle.challengeId - b.battle.challengeId;
        break;
      case "createdAt":
        comparison =
          a.battle.createdAt.getTime() - b.battle.createdAt.getTime();
        break;
      default:
        comparison = 0;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return (
    <>
      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {sortedBattles.map(({ battle, scoreA, scoreB, totalCost }) => (
          <Link
            key={battle.id}
            href={`/battles/${battle.id}`}
            className="block border border-white/20 bg-surface p-4 transition-colors hover:bg-surface-light"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-brand-yellow">
                #{String(battle.challengeId).padStart(2, "0")}
              </span>
              <span className="text-xs text-muted">
                {formatDate(battle.createdAt)}
              </span>
            </div>
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-xs font-bold text-muted">A:</span>
                  <span className="truncate text-sm font-bold">
                    {getModelDisplayName(battle.modelA)}
                  </span>
                </div>
                {scoreA !== null && (
                  <span
                    className={`font-mono text-sm font-bold ${getScoreColor(scoreA)}`}
                  >
                    {scoreA.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-xs font-bold text-muted">B:</span>
                  <span className="truncate text-sm font-bold">
                    {getModelDisplayName(battle.modelB)}
                  </span>
                </div>
                {scoreB !== null && (
                  <span
                    className={`font-mono text-sm font-bold ${getScoreColor(scoreB)}`}
                  >
                    {scoreB.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Cost: ${totalCost.toFixed(4)}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden overflow-hidden border border-white/20 pixel-shadow md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/20 bg-surface text-left text-xs font-bold uppercase tracking-wider text-brand-beige/60">
                {columns.map((col) => (
                  <th
                    key={col.label || "actions"}
                    className={`px-4 py-3 ${col.width} ${
                      col.key
                        ? "cursor-pointer transition-colors hover:text-brand-beige"
                        : ""
                    } ${col.align === "right" ? "text-right" : ""}`}
                    onClick={
                      col.key
                        ? () => handleSort(col.key as SortField)
                        : undefined
                    }
                  >
                    {col.label}
                    {col.key && (
                      <SortIcon
                        active={sortField === col.key}
                        direction={sortOrder}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedBattles.map(({ battle, scoreA, scoreB, totalCost }) => (
                <tr
                  key={battle.id}
                  className="border-b border-white/10 transition-colors hover:bg-surface"
                >
                  <td className="px-4 py-3 font-mono text-sm font-bold text-brand-yellow">
                    #{String(battle.challengeId).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted">A:</span>
                        <span className="text-sm font-bold">
                          {getModelDisplayName(battle.modelA)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted">B:</span>
                        <span className="text-sm font-bold">
                          {getModelDisplayName(battle.modelB)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {scoreA !== null ? (
                      <span
                        className={`font-mono text-sm font-bold ${getScoreColor(scoreA)}`}
                      >
                        {scoreA.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {scoreB !== null ? (
                      <span
                        className={`font-mono text-sm font-bold ${getScoreColor(scoreB)}`}
                      >
                        {scoreB.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-muted">
                    {totalCost > 0 ? `$${totalCost.toFixed(4)}` : "-"}
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
      </div>
    </>
  );
}
