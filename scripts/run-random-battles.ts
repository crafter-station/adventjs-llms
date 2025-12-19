import { db } from "../src/db";
import { challenges } from "../src/db/schema";
import { MODELS } from "../src/lib/models";

const TOTAL_BATTLES = 1000;
const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const TOOL_USE_MODELS = MODELS.filter(
  (m) => m.type === "chat" && m.tags?.includes("tool-use"),
);

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTwoRandomModels(): [string, string] {
  const modelA = getRandomElement(TOOL_USE_MODELS);
  let modelB = getRandomElement(TOOL_USE_MODELS);
  while (modelB.copyString === modelA.copyString) {
    modelB = getRandomElement(TOOL_USE_MODELS);
  }
  return [modelA.copyString, modelB.copyString];
}

async function runRandomBattles() {
  console.log(
    `Found ${TOOL_USE_MODELS.length} models with tool-use capability`,
  );
  console.log("Models:", TOOL_USE_MODELS.map((m) => m.displayName).join(", "));

  const allChallenges = await db
    .select({ id: challenges.id, title: challenges.title })
    .from(challenges);

  console.log(`Found ${allChallenges.length} challenges`);
  console.log(`Starting ${TOTAL_BATTLES} random battles...`);
  console.log(`API URL: ${API_URL}`);
  console.log("---");

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < TOTAL_BATTLES; i++) {
    const [modelA, modelB] = getTwoRandomModels();
    const challenge = getRandomElement(allChallenges);

    try {
      const response = await fetch(`${API_URL}/api/battle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelA,
          modelB,
          challengeId: challenge.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        successCount++;
        if ((i + 1) % 50 === 0 || i === 0) {
          console.log(
            `[${i + 1}/${TOTAL_BATTLES}] Battle triggered: ${modelA} vs ${modelB} on challenge ${challenge.id} (${challenge.title})`,
          );
          console.log(`  Battle ID: ${data.battleId}`);
        }
      } else {
        failCount++;
        const error = await response.text();
        console.error(
          `[${i + 1}/${TOTAL_BATTLES}] Failed to trigger battle: ${response.status} - ${error}`,
        );
      }
    } catch (error) {
      failCount++;
      console.error(
        `[${i + 1}/${TOTAL_BATTLES}] Error triggering battle:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log("---");
  console.log(`Completed! Success: ${successCount}, Failed: ${failCount}`);
  process.exit(0);
}

runRandomBattles().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
