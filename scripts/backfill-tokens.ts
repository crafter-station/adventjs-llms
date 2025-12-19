import { auth } from "@trigger.dev/sdk";
import { eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { battles } from "@/db/schema";

async function backfillTokens() {
  const battlesWithoutToken = await db
    .select()
    .from(battles)
    .where(isNull(battles.triggerPublicToken));

  console.log(`Found ${battlesWithoutToken.length} battles without tokens`);

  for (const battle of battlesWithoutToken) {
    const publicAccessToken = await auth.createPublicToken({
      scopes: {
        read: {
          runs: [battle.triggerRunId],
        },
      },
      expirationTime: "30d",
    });

    await db
      .update(battles)
      .set({ triggerPublicToken: publicAccessToken })
      .where(eq(battles.id, battle.id));

    console.log(`Updated battle ${battle.id}`);
  }

  console.log("Done!");
}

backfillTokens();
