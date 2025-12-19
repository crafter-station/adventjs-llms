import { auth, tasks } from "@trigger.dev/sdk";
import type { simpleStreamTestTask } from "@/trigger/simple-stream-test";

export async function POST(request: Request) {
  const body = await request.json();
  const { prompt } = body;

  const handle = await tasks.trigger<typeof simpleStreamTestTask>(
    "simple-stream-test",
    { prompt: prompt || "Write a short poem about coding." },
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
