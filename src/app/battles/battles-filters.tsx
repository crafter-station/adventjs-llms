"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { MODELS } from "@/lib/models";

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const RESULTS = [
  { value: "", label: "All Results" },
  { value: "a_wins", label: "A Wins" },
  { value: "b_wins", label: "B Wins" },
  { value: "draw_solved", label: "Draw (both solved)" },
  { value: "draw_failed", label: "Draw (both failed)" },
];

const CHALLENGES = [
  { value: "", label: "All Challenges" },
  ...Array.from({ length: 18 }, (_, i) => ({
    value: String(i + 1),
    label: `Challenge ${String(i + 1).padStart(2, "0")}`,
  })),
];

const modelOptions = [
  { value: "", label: "All Models" },
  ...MODELS.filter((m) => m.type === "chat").map((m) => ({
    value: m.copyString,
    label: m.displayName,
  })),
];

export function BattlesFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") || "";
  const challengeId = searchParams.get("challengeId") || "";
  const model = searchParams.get("model") || "";
  const result = searchParams.get("result") || "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      params.delete("page");

      router.push(`/battles?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleStatusChange = (value: string) => {
    updateParams({ status: value });
  };

  const handleChallengeChange = (value: string) => {
    updateParams({ challengeId: value });
  };

  const handleModelChange = (value: string) => {
    updateParams({ model: value });
  };

  const handleResultChange = (value: string) => {
    updateParams({ result: value });
  };

  const clearFilters = () => {
    router.push("/battles");
  };

  const hasFilters = status || challengeId || model || result;

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-3">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="w-full border border-white/20 bg-surface px-3 py-2 text-sm text-brand-beige focus:border-accent focus:outline-none sm:w-auto"
        >
          {STATUSES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={challengeId}
          onChange={(e) => handleChallengeChange(e.target.value)}
          className="w-full border border-white/20 bg-surface px-3 py-2 text-sm text-brand-beige focus:border-accent focus:outline-none sm:w-auto"
        >
          {CHALLENGES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={model}
          onChange={(e) => handleModelChange(e.target.value)}
          className="w-full border border-white/20 bg-surface px-3 py-2 text-sm text-brand-beige focus:border-accent focus:outline-none sm:w-auto sm:max-w-[200px]"
        >
          {modelOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={result}
          onChange={(e) => handleResultChange(e.target.value)}
          className="w-full border border-white/20 bg-surface px-3 py-2 text-sm text-brand-beige focus:border-accent focus:outline-none sm:w-auto"
        >
          {RESULTS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="text-sm text-muted transition-colors hover:text-brand-beige sm:ml-auto"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
