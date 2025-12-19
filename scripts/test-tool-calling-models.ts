import { writeFileSync } from "node:fs";
import { generateText, tool } from "ai";
import { z } from "zod";
import { MODELS } from "../src/lib/models";

const TIMEOUT_MS = 60_000;
const CONCURRENCY = 1;

const SPECIFIC_MODELS = [
  "GPT-5 pro",
  "Grok 2",
  "Nvidia Nemotron Nano 12B V2 VL",
  "LongCat Flash Thinking",
  "Mistral Nemo",
  "Llama 3.1 8B",
];

const toolCallingModels = MODELS.filter((model) => {
  return SPECIFIC_MODELS.includes(model.displayName);
});

type TestResult = {
  modelId: string;
  displayName: string;
  success: boolean;
  toolCalled: boolean;
  error?: string;
  durationMs: number;
};

async function testModel(
  model: (typeof toolCallingModels)[0],
): Promise<TestResult> {
  const startTime = Date.now();
  const modelId = model.copyString;

  try {
    const result = await Promise.race([
      generateText({
        model: modelId,
        prompt: "What is 2+2? Use the calculator tool to compute this.",
        tools: {
          calculator: tool({
            description: "A simple calculator that adds two numbers",
            inputSchema: z.object({
              a: z.number().describe("First number"),
              b: z.number().describe("Second number"),
            }),
            execute: async (input) => ({
              result: input.a + input.b,
            }),
          }),
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS),
      ),
    ]);

    const toolCalled = result.toolCalls && result.toolCalls.length > 0;

    return {
      modelId,
      displayName: model.displayName,
      success: true,
      toolCalled: !!toolCalled,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      modelId,
      displayName: model.displayName,
      success: false,
      toolCalled: false,
      error: errorMessage,
      durationMs: Date.now() - startTime,
    };
  }
}

async function runBatch(
  models: typeof toolCallingModels,
  batchSize: number,
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (let i = 0; i < models.length; i += batchSize) {
    const batch = models.slice(i, i + batchSize);
    console.log(
      `\nTesting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(models.length / batchSize)}...`,
    );

    const batchResults = await Promise.all(batch.map(testModel));

    for (const result of batchResults) {
      const status = result.success
        ? result.toolCalled
          ? "PASS (tool called)"
          : "WARN (no tool call)"
        : "FAIL";
      const icon = result.success ? (result.toolCalled ? "✓" : "⚠") : "✗";
      console.log(
        `  ${icon} ${result.displayName}: ${status}${result.error ? ` - ${result.error.slice(0, 80)}` : ""}`,
      );
      results.push(result);
    }
  }

  return results;
}

async function main() {
  console.log(
    `Found ${toolCallingModels.length} models with tool-use/tool-calling tags\n`,
  );
  console.log("Starting tool calling tests...");

  const results = await runBatch(toolCallingModels, CONCURRENCY);

  const passed = results.filter((r) => r.success && r.toolCalled);
  const warned = results.filter((r) => r.success && !r.toolCalled);
  const failed = results.filter((r) => !r.success);

  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total models tested: ${results.length}`);
  console.log(`Passed (tool called): ${passed.length}`);
  console.log(`Warning (no tool call): ${warned.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nFailed models:");
    for (const r of failed) {
      console.log(`  - ${r.displayName}: ${r.error?.slice(0, 100)}`);
    }
  }

  if (warned.length > 0) {
    console.log("\nWarning models (success but no tool call):");
    for (const r of warned) {
      console.log(`  - ${r.displayName}`);
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: passed.length,
      warned: warned.length,
      failed: failed.length,
    },
    results,
  };

  writeFileSync(
    "tool-calling-test-results.json",
    JSON.stringify(output, null, 2),
    "utf-8",
  );

  console.log("\nResults written to tool-calling-test-results.json");
}

main().catch(console.error);
