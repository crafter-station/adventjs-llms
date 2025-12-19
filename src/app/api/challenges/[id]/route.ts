import { eq } from "drizzle-orm";
import { db } from "@/db";
import { challenges } from "@/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const challengeId = Number.parseInt(id, 10);

  if (Number.isNaN(challengeId)) {
    return Response.json({ error: "Invalid challenge ID" }, { status: 400 });
  }

  const challenge = await db.query.challenges.findFirst({
    where: eq(challenges.id, challengeId),
  });

  if (!challenge) {
    return Response.json({ error: "Challenge not found" }, { status: 404 });
  }

  return Response.json(challenge);
}
