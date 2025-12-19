import type { RealtimeDefinedStream } from "@trigger.dev/core/v3";
import { logger, schemaTask } from "@trigger.dev/sdk";
import type { UIMessageChunk } from "ai";
import { streamText, tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { MODELS } from "@/lib/models";
import { executeCodeTask } from "./execute-code";

function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const model = MODELS.find((m) => m.copyString === modelId);
  if (!model) return 0;

  const inputCost = Number.parseFloat(model.inputCost || "0");
  const outputCost = Number.parseFloat(model.outputCost || "0");

  return (inputTokens * inputCost + outputTokens * outputCost) / 1_000_000;
}

const SYSTEM_PROMPT = `You are an expert JavaScript developer solving AdventJS coding challenges.

CRITICAL - READ CAREFULLY:
You will be given a challenge with a REQUIRED FUNCTION SIGNATURE. You MUST use that EXACT signature.
DO NOT change the function name. DO NOT change the parameter names. Copy them EXACTLY.

Your workflow:
1. Use the EXACT function signature provided
2. Implement the function body
3. Test using runCode (include function + test console.logs from examples)
4. Iterate until all test cases pass

Structure your code with the function definition first, then test cases below it.`;

function extractFunctionSignature(challengeContent: string): string | null {
  const signatureMatch = challengeContent.match(
    /<!-- FUNCTION_SIGNATURE\s*([\s\S]*?)-->/,
  );
  if (signatureMatch) {
    return signatureMatch[1].trim();
  }
  return null;
}

function buildPrompt(challengeContent: string): string {
  const signature = extractFunctionSignature(challengeContent);
  let prompt = `Solve this AdventJS challenge:\n\n${challengeContent}`;

  if (signature) {
    prompt += `\n\n⚠️ REQUIRED FUNCTION TEMPLATE - YOU MUST START WITH THIS EXACT CODE:\n\`\`\`javascript\n${signature}\n\`\`\`\n\nCopy this function EXACTLY. Only replace the comment "// Code here" with your implementation. DO NOT change the function name or parameter names!`;
  }

  return prompt;
}

function extractFunction(code: string): string {
  const functionMatch = code.match(
    /^(function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\})/m,
  );
  if (functionMatch) {
    return functionMatch[1].trim();
  }

  const arrowMatch = code.match(
    /^(const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\};?)/m,
  );
  if (arrowMatch) {
    return arrowMatch[1].trim();
  }

  const lines = code.split("\n");
  const functionStart = lines.findIndex(
    (line) => line.match(/^function\s/) || line.match(/^const\s+\w+\s*=/),
  );
  if (functionStart === -1) return code.trim();

  let braceCount = 0;
  let functionEnd = functionStart;
  for (let i = functionStart; i < lines.length; i++) {
    braceCount += (lines[i].match(/\{/g) || []).length;
    braceCount -= (lines[i].match(/\}/g) || []).length;
    if (braceCount === 0 && i > functionStart) {
      functionEnd = i;
      break;
    }
  }

  return lines
    .slice(functionStart, functionEnd + 1)
    .join("\n")
    .trim();
}

export type SolveResult = {
  success: boolean;
  executionCount: number;
  timeToSolutionMs: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  solution?: string;
  error?: string;
};

async function solveWithStreaming(
  modelId: string,
  challengeContent: string,
  stream: RealtimeDefinedStream<UIMessageChunk>,
  options?: { target?: "self" | "parent" | "root" | string },
): Promise<SolveResult> {
  const startTime = Date.now();
  let executionCount = 0;
  let lastSuccessfulCode: string | undefined;
  let timeToSolutionMs = 0;

  const result = streamText({
    model: modelId,
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(challengeContent),
    tools: {
      runCode: tool({
        description:
          "Execute JavaScript code to test your solution. Include the function and test cases.",
        inputSchema: z.object({
          code: z
            .string()
            .describe(
              "The complete JavaScript code to execute, including function definition and test console.logs",
            ),
        }),
        execute: async (input) => {
          executionCount++;
          logger.log("Running code attempt", { attempt: executionCount });

          const taskResult = await executeCodeTask.triggerAndWait({
            code: input.code,
          });

          if (!taskResult.ok) {
            return {
              success: false as const,
              error: "Failed to execute code task",
            };
          }

          if (taskResult.output.success) {
            lastSuccessfulCode = input.code;
            if (timeToSolutionMs === 0) {
              timeToSolutionMs = Date.now() - startTime;
            }
          }

          return taskResult.output;
        },
      }),
    },
  });

  const pipeOptions = options?.target ? { target: options.target } : undefined;
  const { waitUntilComplete } = stream.pipe(
    result.toUIMessageStream(),
    pipeOptions,
  );

  await waitUntilComplete();

  const usage = await result.usage;
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const cost = calculateCost(modelId, inputTokens, outputTokens);

  const solution = lastSuccessfulCode
    ? extractFunction(lastSuccessfulCode)
    : undefined;

  if (!solution) {
    timeToSolutionMs = Date.now() - startTime;
  }

  logger.log("Solve completed", {
    success: solution !== undefined,
    executionCount,
    timeToSolutionMs,
    inputTokens,
    outputTokens,
    cost,
  });

  return {
    success: solution !== undefined,
    executionCount,
    timeToSolutionMs,
    inputTokens,
    outputTokens,
    cost,
    solution,
  };
}

export const solveChallengeTask = schemaTask({
  id: "solve-challenge",
  maxDuration: 300,
  schema: z.object({
    modelId: z.string().describe("The AI model ID in AI Gateway format"),
    challengeId: z
      .number()
      .min(1)
      .max(16)
      .describe("The challenge number (1-16)"),
    streamId: z
      .enum(["model-a", "model-b"])
      .describe("Which stream to pipe output to"),
    streamTarget: z
      .enum(["self", "parent", "root"])
      .optional()
      .default("self")
      .describe("Where to stream output (self, parent, or root run)"),
  }),
  run: async (payload) => {
    const { modelId, challengeId, streamId, streamTarget } = payload;
    const { modelAStream, modelBStream } = await import("@/app/streams");
    const stream = streamId === "model-a" ? modelAStream : modelBStream;

    logger.log("Starting challenge solver", {
      modelId,
      challengeId,
      streamId,
      streamTarget,
    });

    const challenge = await db.query.challenges.findFirst({
      where: eq(challenges.id, challengeId),
    });

    if (!challenge) {
      logger.error("Challenge not found in database", { challengeId });
      return {
        success: false,
        executionCount: 0,
        timeToSolutionMs: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        error: `Challenge ${challengeId} not found`,
      };
    }

    const challengeContent = `${challenge.description}\n\n<!-- FUNCTION_SIGNATURE\n${challenge.functionSignature}\n-->`;

    try {
      return await solveWithStreaming(modelId, challengeContent, stream, {
        target: streamTarget,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Agent failed", { error: errorMessage });
      return {
        success: false,
        executionCount: 0,
        timeToSolutionMs: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        error: errorMessage,
      };
    }
  },
});
