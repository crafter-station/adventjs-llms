import { runs } from "@trigger.dev/sdk";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { battles } from "@/db/schema";

const DRY_RUN = !process.argv.includes("--execute");

async function cleanupFailedBattles() {
  console.log(DRY_RUN ? "DRY RUN MODE" : "EXECUTE MODE");
  console.log("Finding failed execute-code runs...\n");

  const rootRunIds = new Set<string>();
  let failedRunCount = 0;

  for await (const run of runs.list({
    taskIdentifier: "execute-code",
    status: ["FAILED", "CRASHED", "SYSTEM_FAILURE", "TIMED_OUT"],
  })) {
    failedRunCount++;
    console.log(`Found failed run: ${run.id} (status: ${run.status})`);

    const details = await runs.retrieve(run.id);
    const rootId = details.relatedRuns?.root?.id;

    if (rootId) {
      rootRunIds.add(rootId);
      console.log(`  -> Root run: ${rootId}`);
    } else {
      console.log(`  -> No root run found (this IS a root run)`);
      rootRunIds.add(run.id);
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Failed execute-code runs: ${failedRunCount}`);
  console.log(`  Unique root runs affected: ${rootRunIds.size}`);

  if (rootRunIds.size === 0) {
    console.log("\nNo battles to clean up!");
    return;
  }

  const rootRunIdArray = [...rootRunIds];
  console.log(`\nRoot run IDs to clean up:`);
  for (const id of rootRunIdArray) {
    console.log(`  - ${id}`);
  }

  const battlesToDelete = await db
    .select({
      id: battles.id,
      triggerRunId: battles.triggerRunId,
      modelA: battles.modelA,
      modelB: battles.modelB,
      challengeId: battles.challengeId,
    })
    .from(battles)
    .where(inArray(battles.triggerRunId, rootRunIdArray));

  console.log(`\nBattles to delete: ${battlesToDelete.length}`);
  for (const battle of battlesToDelete) {
    console.log(
      `  - ${battle.id} (${battle.modelA} vs ${battle.modelB}, challenge ${battle.challengeId})`,
    );
  }

  if (DRY_RUN) {
    console.log("\nDRY RUN - No changes made. Run with --execute to delete.");
    return;
  }

  if (battlesToDelete.length > 0) {
    await db
      .delete(battles)
      .where(inArray(battles.triggerRunId, rootRunIdArray));

    console.log(`\nDeleted ${battlesToDelete.length} battles.`);
  }
}

cleanupFailedBattles().catch(console.error);
