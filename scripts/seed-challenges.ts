import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "../src/db";
import { challenges } from "../src/db/schema";

function extractFunctionSignature(content: string): string {
  const match = content.match(/<!-- FUNCTION_SIGNATURE\s*([\s\S]*?)-->/);
  return match ? match[1].trim() : "";
}

function extractTitle(content: string): string {
  const match = content.match(/# Challenge \\?#\d+: (.+?) chevron-down/);
  if (match) {
    return match[1].trim();
  }
  const fallback = content.match(/# Challenge \\?#(\d+)/);
  return fallback ? `Challenge ${fallback[1]}` : "Unknown Challenge";
}

function extractDifficulty(content: string): "easy" | "medium" | "hard" {
  const upper = content.toUpperCase();
  if (upper.includes("HARD")) return "hard";
  if (upper.includes("MEDIUM")) return "medium";
  return "easy";
}

function extractDescription(content: string): string {
  const withoutSignature = content.replace(
    /<!-- FUNCTION_SIGNATURE[\s\S]*?-->/,
    "",
  );
  const withoutNav = withoutSignature
    .replace(/\[<\]\([^)]+\)/g, "")
    .replace(/\[>\]\([^)]+\)/g, "")
    .replace(/chevron-down/g, "")
    .replace(/InstructionsResults/g, "");
  return withoutNav.trim();
}

async function seedChallenges() {
  const challengesDir = join(process.cwd(), "challenges");
  const files = await readdir(challengesDir);
  const mdFiles = files
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => {
      const numA = Number.parseInt(a.match(/\d+/)?.[0] || "0", 10);
      const numB = Number.parseInt(b.match(/\d+/)?.[0] || "0", 10);
      return numA - numB;
    });

  console.log(`Found ${mdFiles.length} challenge files`);

  for (const file of mdFiles) {
    const id = Number.parseInt(file.match(/\d+/)?.[0] || "0", 10);
    if (id === 0) continue;

    const content = await readFile(join(challengesDir, file), "utf-8");
    const title = extractTitle(content);
    const difficulty = extractDifficulty(content);
    const description = extractDescription(content);
    const functionSignature = extractFunctionSignature(content);

    console.log(`Seeding challenge ${id}: ${title} (${difficulty})`);

    await db
      .insert(challenges)
      .values({
        id,
        title,
        difficulty,
        description,
        functionSignature,
      })
      .onConflictDoUpdate({
        target: challenges.id,
        set: {
          title,
          difficulty,
          description,
          functionSignature,
        },
      });
  }

  console.log("Done seeding challenges!");
  process.exit(0);
}

seedChallenges().catch((err) => {
  console.error("Failed to seed challenges:", err);
  process.exit(1);
});
