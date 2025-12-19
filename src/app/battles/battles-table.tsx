"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import type { Battle } from "@/db/schema";
import { MODELS } from "@/lib/models";

type SortField = "createdAt" | "challengeId" | "status";
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

const SORT_DEFAULTS: Record<SortField, SortOrder> = {
  createdAt: "desc",
  challengeId: "asc",
  status: "asc",
};

type BattlesTableProps = {
  battles: Battle[];
  sortField: SortField;
  sortOrder: SortOrder;
};

export function BattlesTable({
  battles,
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
    { key: "challengeId", label: "#", width: "w-16" },
    { key: null, label: "Models", width: "" },
    { key: "status", label: "Status", width: "w-28" },
    { key: null, label: "Result", width: "w-36" },
    { key: "createdAt", label: "Date", width: "w-40" },
    { key: null, label: "", width: "w-16" },
  ];

  return (
    <div className="overflow-hidden border border-white/20 pixel-shadow">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-white/20 bg-surface text-left text-xs font-bold uppercase tracking-wider text-brand-beige/60">
            {columns.map((col) => (
              <th
                key={col.label || "actions"}
                className={`px-4 py-3 ${col.width} ${
                  col.key
                    ? "cursor-pointer transition-colors hover:text-brand-beige"
                    : ""
                }`}
                onClick={
                  col.key ? () => handleSort(col.key as SortField) : undefined
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
          {battles.map((battle) => (
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
                    <span className="text-xs font-bold text-muted">A:</span>
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
                    <span className="text-xs font-bold text-muted">B:</span>
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
  );
}
