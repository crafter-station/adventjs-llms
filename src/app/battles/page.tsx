import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";

import { db } from "@/db";
import { battles } from "@/db/schema";

import { BattlesFilters } from "./battles-filters";
import { BattlesPagination } from "./battles-pagination";
import { BattlesTable } from "./battles-table";

const PAGE_SIZE = 30;

type SortField = "createdAt" | "challengeId" | "status";
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

  const sortColumn = {
    createdAt: battles.createdAt,
    challengeId: battles.challengeId,
    status: battles.status,
  }[sortField];

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
  const {
    battles: battlesList,
    pagination,
    sortField,
    sortOrder,
  } = await getBattles(searchParams);

  return (
    <main className="flex-1 overflow-auto">
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-wide">
            Battle History
          </h1>
          <p className="mt-2 text-sm text-muted">
            View all past LLM battles. Click column headers to sort.
          </p>
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
