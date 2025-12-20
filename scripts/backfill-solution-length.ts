import { eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { battles } from "@/db/schema";

async function backfillSolutionLength() {
  const battlesToUpdate = await db
    .select()
    .from(battles)
    .where(
      or(
        isNull(battles.modelASolutionLength),
        isNull(battles.modelBSolutionLength),
      ),
    );

  console.log(`Found ${battlesToUpdate.length} battles to update`);

  let updated = 0;

  for (const battle of battlesToUpdate) {
    const modelASolutionLength = battle.modelASolution?.length ?? null;
    const modelBSolutionLength = battle.modelBSolution?.length ?? null;

    const needsUpdate =
      (battle.modelASolutionLength === null && modelASolutionLength !== null) ||
      (battle.modelBSolutionLength === null && modelBSolutionLength !== null);

    if (needsUpdate) {
      await db
        .update(battles)
        .set({
          modelASolutionLength:
            battle.modelASolutionLength ?? modelASolutionLength,
          modelBSolutionLength:
            battle.modelBSolutionLength ?? modelBSolutionLength,
        })
        .where(eq(battles.id, battle.id));

      updated++;
      console.log(
        `Updated battle ${battle.id}: A=${modelASolutionLength}, B=${modelBSolutionLength}`,
      );
    }
  }

  console.log(`Done! Updated ${updated} battles.`);
}

backfillSolutionLength();
