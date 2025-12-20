import { logger, schemaTask } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { battles } from "@/db/schema";
import { battlesQueue } from "./queues";
import { type SolveResult, solveChallengeTask } from "./solve-challenge";

const defaultResult: SolveResult = {
  success: false,
  executionCount: 0,
  timeToSolutionMs: 0,
  inputTokens: 0,
  outputTokens: 0,
  cost: 0,
  error: "Task failed",
};

export const dualSolveChallengeTask = schemaTask({
  id: "dual-solve-challenge",
  queue: battlesQueue,
  maxDuration: 300,
  schema: z.object({
    modelA: z.string().describe("The first AI model ID"),
    modelB: z.string().describe("The second AI model ID"),
    challengeId: z
      .number()
      .min(1)
      .max(25)
      .describe("The challenge number (1-16)"),
  }),
  run: async (payload, { ctx }) => {
    const { modelA, modelB, challengeId } = payload;

    logger.log("Starting dual challenge solver", {
      modelA,
      modelB,
      challengeId,
    });

    let output: {
      success: boolean;
      modelA: SolveResult;
      modelB: SolveResult;
    };

    try {
      const results = await solveChallengeTask.batchTriggerAndWait([
        {
          payload: {
            modelId: modelA,
            challengeId,
            streamId: "model-a" as const,
            streamTarget: "root",
          },
        },
        {
          payload: {
            modelId: modelB,
            challengeId,
            streamId: "model-b" as const,
            streamTarget: "root",
          },
        },
      ]);

      const [resultA, resultB] = results.runs;

      logger.log("Both models completed", {
        modelASuccess: resultA.ok ? resultA.output.success : false,
        modelBSuccess: resultB.ok ? resultB.output.success : false,
      });

      output = {
        success: true,
        modelA: resultA.ok ? resultA.output : defaultResult,
        modelB: resultB.ok ? resultB.output : defaultResult,
      };

      await db
        .update(battles)
        .set({
          status: "completed",
          modelASuccess: output.modelA.success,
          modelBSuccess: output.modelB.success,
          modelAExecutionCount: output.modelA.executionCount,
          modelBExecutionCount: output.modelB.executionCount,
          modelATimeToSolution: output.modelA.timeToSolutionMs,
          modelBTimeToSolution: output.modelB.timeToSolutionMs,
          modelAInputTokens: output.modelA.inputTokens,
          modelAOutputTokens: output.modelA.outputTokens,
          modelBInputTokens: output.modelB.inputTokens,
          modelBOutputTokens: output.modelB.outputTokens,
          modelACost: output.modelA.cost,
          modelBCost: output.modelB.cost,
          modelASolution: output.modelA.solution,
          modelBSolution: output.modelB.solution,
          modelASolutionLength: output.modelA.solutionLength,
          modelBSolutionLength: output.modelB.solutionLength,
          modelAError: output.modelA.error,
          modelBError: output.modelB.error,
          completedAt: new Date(),
        })
        .where(eq(battles.triggerRunId, ctx.run.id));

      logger.log("Battle updated in database", { runId: ctx.run.id });

      const revalidationUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`
        : "http://localhost:3000/api/revalidate";

      try {
        await fetch(revalidationUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.REVALIDATION_SECRET}`,
          },
          body: JSON.stringify({ paths: ["/battles", "/leaderboard"] }),
        });
        logger.log("Revalidation triggered for /battles and /leaderboard");
      } catch (revalidateError) {
        logger.warn("Failed to trigger revalidation", {
          error:
            revalidateError instanceof Error
              ? revalidateError.message
              : String(revalidateError),
        });
      }
    } catch (error) {
      logger.error("Failed to complete battle", {
        error: error instanceof Error ? error.message : String(error),
      });

      await db
        .update(battles)
        .set({
          status: "failed",
          completedAt: new Date(),
        })
        .where(eq(battles.triggerRunId, ctx.run.id));

      throw error;
    }

    return output;
  },
});
