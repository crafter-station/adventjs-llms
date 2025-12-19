import { auth, tasks } from "@trigger.dev/sdk";
import type { solveChallengeTask } from "@/trigger/solve-challenge";

export async function POST(request: Request) {
  const body = await request.json();
  const { modelId, challengeId } = body;

  if (!modelId || !challengeId) {
    return Response.json(
      { error: "Missing required fields: modelId, challengeId" },
      { status: 400 },
    );
  }

  const handle = await tasks.trigger<typeof solveChallengeTask>(
    "solve-challenge",
    { modelId, challengeId, streamId: "model-a" },
  );

  const publicAccessToken = await auth.createPublicToken({
    scopes: {
      read: {
        runs: [handle.id],
      },
    },
    expirationTime: "1h",
  });

  return Response.json({
    runId: handle.id,
    publicAccessToken,
  });
}
