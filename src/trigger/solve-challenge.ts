import type { RealtimeDefinedStream } from "@trigger.dev/core/v3";
import { logger, schemaTask } from "@trigger.dev/sdk";
import type {
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  UIMessageChunk,
} from "ai";
import { streamText, tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { MODELS } from "@/lib/models";
import { executeCodeTask } from "./execute-code";
import { llmQueue } from "./queues";
import { validateSolutionTask } from "./validate-solution";

const MAX_RUN_CODE_EXECUTIONS = 10;
const MAX_ITERATIONS = 20;

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

## AVAILABLE TOOLS

You have exactly TWO tools:

1. **runCode** - Test your code (max 10 calls)
   - Include function definition + test cases
   - Use console.log() to see output
   
2. **submitSolution** - Submit your final answer (REQUIRED, call exactly once)
   - Include ONLY the function definition
   - Do NOT include test cases - official tests run automatically
   - This is the ONLY way to complete the challenge

## RULES

- Use the EXACT function signature provided (same name, same parameters)
- You MUST call submitSolution to finish - writing code in text/markdown does NOT count
- Never output your solution as text - always use the submitSolution tool

## WORKFLOW

1. Read the challenge
2. Implement using the exact function signature
3. Test with runCode (include function + your test cases)
4. Fix any issues
5. **CALL submitSolution** with only the function definition

## CRITICAL

⚠️ THE CHALLENGE IS NOT COMPLETE UNTIL YOU CALL submitSolution ⚠️

Do NOT just write code in your response. You MUST use the submitSolution tool.
If you output code as text without calling submitSolution, you FAIL.`;

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
  solutionLength?: number;
  error?: string;
};

const runCodeSchema = z.object({
  code: z
    .string()
    .describe(
      "The complete JavaScript code to execute, including function definition and test console.logs",
    ),
});

const submitSolutionSchema = z.object({
  code: z
    .string()
    .describe(
      "ONLY the function definition to submit as your solution. Do NOT include test cases - the system will run official tests.",
    ),
});

type ExecuteCodeResult =
  | { success: true; output: string }
  | { success: false; error: string };

async function solveWithStreaming(
  modelId: string,
  challengeContent: string,
  testCases: string,
  stream: RealtimeDefinedStream<UIMessageChunk>,
  options?: { target?: "self" | "parent" | "root" | string },
): Promise<SolveResult> {
  let executionCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let llmTimeMs = 0;

  const messages: CoreMessage[] = [
    { role: "user", content: buildPrompt(challengeContent) },
  ];

  const pipeOptions = options?.target ? { target: options.target } : undefined;

  let submittedSolution: string | undefined;
  let submissionValidated = false;
  let errorMessage: string | undefined;

  const tools = {
    runCode: tool({
      description:
        "Test your code before submitting. Include function + test cases with console.log(). Does NOT submit - you must call submitSolution separately.",
      inputSchema: runCodeSchema,
    }),
    submitSolution: tool({
      description:
        "REQUIRED: Submit your final solution. Pass ONLY the function definition (no tests). You MUST call this to complete the challenge - outputting code as text does not count!",
      inputSchema: submitSolutionSchema,
      execute: async (input) => {
        const submittedCode = input.code;
        const submittedFunction = extractFunction(submittedCode);
        submittedSolution = submittedFunction;
        logger.log(
          "Solution submitted, validating with official test cases...",
        );

        const validationResult = await validateSolutionTask.triggerAndWait({
          code: submittedFunction,
          testCases,
        });

        if (validationResult.ok && validationResult.output.success) {
          submissionValidated = true;
          logger.log("Solution validated successfully");
          return {
            success: true as const,
            output: validationResult.output.output,
          };
        }

        submissionValidated = false;
        const error = validationResult.ok
          ? validationResult.output.error || "Validation failed"
          : "Failed to execute validation";
        errorMessage = error;
        logger.error("Solution validation failed", { error });
        return {
          success: false as const,
          error,
        };
      },
    }),
  };

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    if (executionCount >= MAX_RUN_CODE_EXECUTIONS && !submittedSolution) {
      errorMessage = `Exceeded maximum of ${MAX_RUN_CODE_EXECUTIONS} runCode executions without submitting a solution`;
      logger.error(errorMessage);
      break;
    }

    const llmStartTime = Date.now();

    const result = streamText({
      model: modelId,
      system: SYSTEM_PROMPT,
      messages,
      tools,
    });

    const { waitUntilComplete } = stream.pipe(
      result.toUIMessageStream(),
      pipeOptions,
    );
    await waitUntilComplete();

    llmTimeMs += Date.now() - llmStartTime;

    const [staticToolCalls, usage, text] = await Promise.all([
      result.staticToolCalls,
      result.usage,
      result.text,
    ]);

    totalInputTokens += usage.inputTokens ?? 0;
    totalOutputTokens += usage.outputTokens ?? 0;

    if (!staticToolCalls || staticToolCalls.length === 0) {
      if (text) {
        messages.push({ role: "assistant", content: text });
      }
      logger.log("No tool calls, LLM finished without submitting", {
        iteration,
      });
      errorMessage = "LLM finished without calling submitSolution";
      break;
    }

    if (submittedSolution !== undefined) {
      logger.log("submitSolution was called, exiting loop");
      break;
    }

    const runCodeCalls = staticToolCalls.filter(
      (tc) => tc.toolName === "runCode",
    ) as Array<{
      type: "tool-call";
      toolName: "runCode";
      toolCallId: string;
      input: { code: string };
    }>;

    if (runCodeCalls.length === 0) {
      logger.log("No actionable tool calls", { iteration });
      continue;
    }

    const remainingExecutions = MAX_RUN_CODE_EXECUTIONS - executionCount;
    const callsToExecute = runCodeCalls.slice(0, remainingExecutions);

    if (callsToExecute.length < runCodeCalls.length) {
      logger.log("Limiting runCode calls due to execution limit", {
        requested: runCodeCalls.length,
        executing: callsToExecute.length,
        remaining: remainingExecutions,
      });
    }

    logger.log("Batch executing runCode calls", {
      count: callsToExecute.length,
      iteration,
    });

    const batchResult = await executeCodeTask.batchTriggerAndWait(
      callsToExecute.map((tc) => ({ payload: { code: tc.input.code } })),
    );

    executionCount += callsToExecute.length;

    const toolResultsForMessage: ExecuteCodeResult[] = batchResult.runs.map(
      (run) => {
        if (run.ok) {
          return run.output;
        }
        return { success: false as const, error: "Failed to execute code" };
      },
    );

    for (let i = 0; i < callsToExecute.length; i++) {
      const tc = callsToExecute[i];
      const toolResult = toolResultsForMessage[i];
      const chunk = JSON.stringify({
        type: "tool-output-available",
        toolCallId: tc.toolCallId,
        output: toolResult,
      }) as unknown as UIMessageChunk;
      await stream.append(chunk, pipeOptions);
    }

    const assistantMessage: CoreAssistantMessage = {
      role: "assistant",
      content: [
        ...(text ? [{ type: "text" as const, text }] : []),
        ...callsToExecute.map((tc) => ({
          type: "tool-call" as const,
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          input: tc.input,
        })),
      ],
    };

    const toolMessage: CoreToolMessage = {
      role: "tool",
      content: callsToExecute.map((tc, idx) => ({
        type: "tool-result" as const,
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        output: {
          type: "json" as const,
          value: toolResultsForMessage[idx],
        },
      })),
    };

    messages.push(assistantMessage, toolMessage);

    if (executionCount >= MAX_RUN_CODE_EXECUTIONS) {
      messages.push({
        role: "user",
        content: `WARNING: You have used all ${MAX_RUN_CODE_EXECUTIONS} runCode executions. You MUST call submitSolution NOW with your best solution, or you will fail!`,
      });
    }
  }

  const timeToSolutionMs = llmTimeMs;
  const cost = calculateCost(modelId, totalInputTokens, totalOutputTokens);

  const solution =
    submittedSolution && submissionValidated ? submittedSolution : undefined;

  logger.log("Solve completed", {
    success: solution !== undefined,
    submissionValidated,
    executionCount,
    timeToSolutionMs,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    cost,
  });

  return {
    success: solution !== undefined,
    executionCount,
    timeToSolutionMs,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    cost,
    solution,
    solutionLength: solution?.length,
    error: errorMessage,
  };
}

export const solveChallengeTask = schemaTask({
  id: "solve-challenge",
  queue: llmQueue,
  maxDuration: 300,
  schema: z.object({
    modelId: z.string().describe("The AI model ID in AI Gateway format"),
    challengeId: z
      .number()
      .min(1)
      .max(25)
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
      return await solveWithStreaming(
        modelId,
        challengeContent,
        challenge.testCases,
        stream,
        { target: streamTarget },
      );
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
