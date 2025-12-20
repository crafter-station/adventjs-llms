import { logger, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { executeCodeTask } from "./execute-code";
import { validationQueue } from "./queues";

export const validateSolutionTask = schemaTask({
  id: "validate-solution",
  queue: validationQueue,
  maxDuration: 90,
  schema: z.object({
    code: z.string().min(1).describe("The function code to validate"),
    testCases: z
      .string()
      .min(1)
      .describe("The test cases to run against the function"),
  }),
  run: async (payload) => {
    const { code, testCases } = payload;
    const validationCode = `${code}\n\n${testCases}`;

    logger.log("Validating solution", {
      codeLength: code.length,
      testCasesLength: testCases.length,
    });

    const result = await executeCodeTask.triggerAndWait({
      code: validationCode,
    });

    if (!result.ok) {
      logger.error("Validation task failed to execute");
      return {
        success: false as const,
        error: "Failed to execute validation",
      };
    }

    if (result.output.success) {
      logger.log("Solution validated successfully", {
        output: result.output.output,
      });
      return {
        success: true as const,
        output: result.output.output,
      };
    }

    logger.error("Solution validation failed", { error: result.output.error });
    return {
      success: false as const,
      error: result.output.error,
    };
  },
});
