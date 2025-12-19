import { desc } from "drizzle-orm";
import { db } from "@/db";
import { battles } from "@/db/schema";

const PAGE_SIZE = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") || "1", 10),
  );
  const offset = (page - 1) * PAGE_SIZE;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(battles)
      .orderBy(desc(battles.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.$count(battles),
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
