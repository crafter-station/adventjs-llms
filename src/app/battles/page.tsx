import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";

import { db } from "@/db";
import { battles, challenges } from "@/db/schema";

import { BattlesFilters } from "./battles-filters";
import { BattlesPagination } from "./battles-pagination";
import { BattlesTable } from "./battles-table";

const PAGE_SIZE = 30;

type BattleStats = {
  totalBattles: number;
  totalCost: number;
  totalExecutions: number;
  totalInputTokens: number;
  totalOutputTokens: number;
};

async function getBattleStats(): Promise<BattleStats> {
  const allBattles = await db.select().from(battles);

  let totalCost = 0;
  let totalExecutions = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const battle of allBattles) {
    totalCost += (battle.modelACost ?? 0) + (battle.modelBCost ?? 0);
    totalExecutions +=
      (battle.modelAExecutionCount ?? 0) + (battle.modelBExecutionCount ?? 0);
    totalInputTokens +=
      (battle.modelAInputTokens ?? 0) + (battle.modelBInputTokens ?? 0);
    totalOutputTokens +=
      (battle.modelAOutputTokens ?? 0) + (battle.modelBOutputTokens ?? 0);
  }

  return {
    totalBattles: allBattles.length,
    totalCost: Math.round(totalCost * 100) / 100,
    totalExecutions,
    totalInputTokens,
    totalOutputTokens,
  };
}

async function getChallengeMap(): Promise<Map<number, { difficulty: string }>> {
  const allChallenges = await db.select().from(challenges);
  return new Map(
    allChallenges.map((c) => [c.id, { difficulty: c.difficulty }]),
  );
}

type SortField =
  | "createdAt"
  | "challengeId"
  | "scoreA"
  | "scoreB"
  | "totalCost";
type SortOrder = "asc" | "desc";
type Status = "pending" | "completed" | "failed";
type Result = "a_wins" | "b_wins" | "draw_solved" | "draw_failed";

type SearchParams = Promise<{
  page?: string;
  status?: Status;
  challengeId?: string;
  model?: string;
  result?: Result;
  sortField?: SortField;
  sortOrder?: SortOrder;
}>;

async function getBattles(searchParams: SearchParams) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const status = params.status;
  const challengeId = params.challengeId;
  const model = params.model;
  const result = params.result;
  const sortField = params.sortField || "createdAt";
  const sortOrder = params.sortOrder || "desc";

  const conditions = [];

  if (status) {
    conditions.push(eq(battles.status, status));
  }

  if (challengeId) {
    const id = Number.parseInt(challengeId, 10);
    if (!Number.isNaN(id)) {
      conditions.push(eq(battles.challengeId, id));
    }
  }

  if (model) {
    conditions.push(or(eq(battles.modelA, model), eq(battles.modelB, model)));
  }

  if (result) {
    switch (result) {
      case "a_wins":
        conditions.push(
          and(
            eq(battles.modelASuccess, true),
            eq(battles.modelBSuccess, false),
          ),
        );
        break;
      case "b_wins":
        conditions.push(
          and(
            eq(battles.modelASuccess, false),
            eq(battles.modelBSuccess, true),
          ),
        );
        break;
      case "draw_solved":
        conditions.push(
          and(eq(battles.modelASuccess, true), eq(battles.modelBSuccess, true)),
        );
        break;
      case "draw_failed":
        conditions.push(
          and(
            eq(battles.modelASuccess, false),
            eq(battles.modelBSuccess, false),
          ),
        );
        break;
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const dbSortableFields = ["createdAt", "challengeId"];
  const isDbSortable = dbSortableFields.includes(sortField);

  const sortColumn = isDbSortable
    ? sortField === "createdAt"
      ? battles.createdAt
      : battles.challengeId
    : battles.createdAt;

  const orderByClause =
    sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(battles)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(battles)
      .where(whereClause)
      .then((r) => Number(r[0].count)),
  ]);

  const totalPages = Math.ceil(countResult / PAGE_SIZE);

  return {
    battles: items,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: countResult,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    sortField,
    sortOrder,
  };
}

export default async function BattlesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [
    { battles: battlesList, pagination, sortField, sortOrder },
    stats,
    challengeMap,
  ] = await Promise.all([
    getBattles(searchParams),
    getBattleStats(),
    getChallengeMap(),
  ]);

  return (
    <main className="flex-1 overflow-auto">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-wide">
            Battle History
          </h1>
          <p className="mt-2 text-sm text-muted">
            Browse all advent0 battles. Click column headers to sort.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
          <div className="border border-white/20 bg-surface p-4 pixel-shadow">
            <div className="text-2xl font-bold text-brand-beige">
              {stats.totalBattles}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted">
              Total Battles
            </div>
          </div>
          <div className="border border-white/20 bg-surface p-4 pixel-shadow">
            <div className="text-2xl font-bold text-red-400">
              ${stats.totalCost}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted">
              Total Cost
            </div>
          </div>
          <div className="border border-white/20 bg-surface p-4 pixel-shadow">
            <div className="text-2xl font-bold text-green-400">
              {stats.totalExecutions.toLocaleString()}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted">
              Executions
            </div>
          </div>
          <div className="border border-white/20 bg-surface p-4 pixel-shadow">
            <div className="text-2xl font-bold text-brand-beige">
              {stats.totalInputTokens.toLocaleString()}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted">
              Input Tokens
            </div>
          </div>
          <div className="border border-white/20 bg-surface p-4 pixel-shadow">
            <div className="text-2xl font-bold text-brand-beige">
              {stats.totalOutputTokens.toLocaleString()}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted">
              Output Tokens
            </div>
          </div>
        </div>

        <Suspense fallback={<div className="h-12" />}>
          <BattlesFilters />
        </Suspense>

        {battlesList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-muted">No battles found.</div>
            <Link
              href="/"
              className="mt-4 border border-white/20 bg-surface px-4 py-2 text-sm uppercase text-accent transition-colors hover:bg-surface-light"
            >
              Start a battle
            </Link>
          </div>
        ) : (
          <>
            <Suspense fallback={<div className="h-96" />}>
              <BattlesTable
                battles={battlesList}
                challengeMap={Object.fromEntries(challengeMap)}
                sortField={sortField}
                sortOrder={sortOrder}
              />
            </Suspense>

            <Suspense fallback={null}>
              <BattlesPagination {...pagination} />
            </Suspense>
          </>
        )}
      </div>
    </main>
  );
}
