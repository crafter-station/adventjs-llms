import { auth, tasks } from "@trigger.dev/sdk";
import { db } from "@/db";
import { battles } from "@/db/schema";
import type { dualSolveChallengeTask } from "@/trigger/dual-solve-challenge";

export async function POST(request: Request) {
  const body = await request.json();
  const { modelA, modelB, challengeId } = body;

  if (!modelA || !modelB || !challengeId) {
    return Response.json(
      { error: "Missing required fields: modelA, modelB, challengeId" },
      { status: 400 },
    );
  }

  const handle = await tasks.trigger<typeof dualSolveChallengeTask>(
    "dual-solve-challenge",
    { modelA, modelB, challengeId },
  );

  const publicAccessToken = await auth.createPublicToken({
    scopes: {
      read: {
        runs: [handle.id],
      },
    },
    expirationTime: "30d",
  });

  const [battle] = await db
    .insert(battles)
    .values({
      triggerRunId: handle.id,
      triggerPublicToken: publicAccessToken,
      modelA,
      modelB,
      challengeId,
      status: "pending",
    })
    .returning();

  return Response.json({
    battleId: battle.id,
    runId: handle.id,
    publicAccessToken,
  });
}
