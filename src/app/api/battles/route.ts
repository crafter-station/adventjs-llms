import { and, asc, desc, eq, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { battles } from "@/db/schema";

const PAGE_SIZE = 30;

type SortField = "createdAt" | "challengeId" | "status";
type SortOrder = "asc" | "desc";
type Status = "pending" | "completed" | "failed";
type Result = "a_wins" | "b_wins" | "draw_solved" | "draw_failed";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") || "1", 10),
  );
  const offset = (page - 1) * PAGE_SIZE;

  const status = searchParams.get("status") as Status | null;
  const challengeId = searchParams.get("challengeId");
  const model = searchParams.get("model");
  const result = searchParams.get("result") as Result | null;
  const sortField = (searchParams.get("sortField") as SortField) || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") as SortOrder) || "desc";

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

  return Response.json({
    battles: items,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: countResult,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}
