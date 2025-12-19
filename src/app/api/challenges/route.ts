import { db } from "@/db";
import { challenges } from "@/db/schema";

export async function GET() {
  const allChallenges = await db
    .select({
      id: challenges.id,
      title: challenges.title,
      difficulty: challenges.difficulty,
    })
    .from(challenges)
    .orderBy(challenges.id);

  return Response.json(allChallenges);
}
