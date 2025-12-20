"use client";

import { useState } from "react";
import type { ModelStats } from "./page";

type SortKey = keyof ModelStats;
type SortDirection = "asc" | "desc";

const sortConfig: Record<
  SortKey,
  {
    label: string;
    defaultDir: SortDirection;
    format: (v: ModelStats) => string;
  }
> = {
  model: { label: "Model", defaultDir: "asc", format: (v) => v.displayName },
  displayName: {
    label: "Model",
    defaultDir: "asc",
    format: (v) => v.displayName,
  },
  avgScore: {
    label: "Score",
    defaultDir: "desc",
    format: (v) => v.avgScore.toFixed(2),
  },
  successRate: {
    label: "Success",
    defaultDir: "desc",
    format: (v) => `${v.successRate}%`,
  },
  totalBattles: {
    label: "Battles",
    defaultDir: "desc",
    format: (v) => String(v.totalBattles),
  },
  avgTimeToSolution: {
    label: "Avg Time",
    defaultDir: "asc",
    format: (v) =>
      v.avgTimeToSolution > 0
        ? `${(v.avgTimeToSolution / 1000).toFixed(1)}s`
        : "-",
  },
  avgExecutionCount: {
    label: "Avg Execs",
    defaultDir: "asc",
    format: (v) => String(v.avgExecutionCount),
  },
  avgSolutionLength: {
    label: "Avg Chars",
    defaultDir: "asc",
    format: (v) =>
      v.avgSolutionLength > 0 ? String(v.avgSolutionLength) : "-",
  },
  avgCost: {
    label: "Avg Cost",
    defaultDir: "asc",
    format: (v) => `$${v.avgCost.toFixed(4)}`,
  },
  totalCost: {
    label: "Total Cost",
    defaultDir: "asc",
    format: (v) => `$${v.totalCost.toFixed(2)}`,
  },
};

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
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
  return "text-red-400";
}

export function LeaderboardTable({ data }: { data: ModelStats[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("avgScore");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(sortConfig[key].defaultDir);
    }
  };

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    const aNum = Number(aVal);
    const bNum = Number(bVal);
    return sortDir === "asc" ? aNum - bNum : bNum - aNum;
  });

  const columns: {
    key: SortKey;
    align: "left" | "right" | "center";
    width?: string;
  }[] = [
    { key: "displayName", align: "left" },
    { key: "avgScore", align: "right", width: "w-20" },
    { key: "avgTimeToSolution", align: "right", width: "w-24" },
    { key: "avgExecutionCount", align: "right", width: "w-20" },
    { key: "avgSolutionLength", align: "right", width: "w-24" },
    { key: "avgCost", align: "right", width: "w-24" },
    { key: "totalBattles", align: "right", width: "w-20" },
  ];

  return (
    <>
      {/* Mobile card view */}
      <div className="space-y-3 md:hidden">
        {sorted.map((stats, index) => (
          <div
            key={stats.model}
            className="border border-white/20 bg-surface p-4"
          >
            <div className="mb-3 flex items-center gap-3">
              <span
                className={`flex h-8 w-8 items-center justify-center font-mono text-sm font-bold ${
                  index === 0
                    ? "bg-brand-yellow text-brand-red-dark"
                    : index === 1
                      ? "bg-brand-beige text-brand-red-dark"
                      : index === 2
                        ? "bg-red-400 text-white"
                        : "bg-surface-light text-muted"
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{stats.displayName}</div>
                <div className="truncate font-mono text-xs text-muted">
                  {stats.model}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-xs uppercase text-muted">Score</span>
                <div
                  className={`font-mono font-bold ${getScoreColor(stats.avgScore)}`}
                >
                  {stats.avgScore.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-xs uppercase text-muted">Avg Time</span>
                <div className="font-mono">
                  {stats.avgTimeToSolution > 0
                    ? `${(stats.avgTimeToSolution / 1000).toFixed(1)}s`
                    : "-"}
                </div>
              </div>
              <div>
                <span className="text-xs uppercase text-muted">Battles</span>
                <div className="font-mono">{stats.totalBattles}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden overflow-x-auto border border-white/20 pixel-shadow md:block">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-white/20 bg-surface text-left text-xs font-bold uppercase tracking-wider text-brand-beige/60">
              <th className="w-12 px-4 py-3 text-center">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`cursor-pointer px-4 py-3 transition-colors hover:text-brand-beige ${col.width || ""} ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}
                  onClick={() => handleSort(col.key)}
                >
                  {sortConfig[col.key].label}
                  <SortIcon active={sortKey === col.key} direction={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((stats, index) => (
              <tr
                key={stats.model}
                className="border-b border-white/10 transition-colors hover:bg-surface"
              >
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center font-mono text-sm font-bold ${
                      index === 0
                        ? "text-brand-yellow"
                        : index === 1
                          ? "text-brand-beige"
                          : index === 2
                            ? "text-red-400"
                            : "text-muted"
                    }`}
                  >
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-bold">{stats.displayName}</div>
                  <div className="truncate font-mono text-xs text-muted">
                    {stats.model}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-mono text-sm font-bold ${getScoreColor(stats.avgScore)}`}
                  >
                    {stats.avgScore.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm">
                  {stats.avgTimeToSolution > 0 ? (
                    <span
                      className={
                        stats.avgTimeToSolution < 30000
                          ? "text-green-400"
                          : stats.avgTimeToSolution < 60000
                            ? "text-brand-yellow"
                            : "text-red-400"
                      }
                    >
                      {(stats.avgTimeToSolution / 1000).toFixed(1)}s
                    </span>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm text-muted">
                  {stats.avgExecutionCount}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm text-muted">
                  {stats.avgSolutionLength > 0 ? stats.avgSolutionLength : "-"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm text-muted">
                  ${stats.avgCost.toFixed(4)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm text-muted">
                  {stats.totalBattles}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
