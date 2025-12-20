import { logger, retry, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import { executeCodeQueue } from "./queues";

export const executeCodeTask = schemaTask({
  id: "execute-code",
  queue: executeCodeQueue,
  maxDuration: 90,
  schema: z.object({
    code: z.string().min(1).describe("The JavaScript code to execute"),
  }),
  run: async (payload) => {
    logger.log("Executing code via exec0 API", {
      codeLength: payload.code.length,
    });

    try {
      const response = await retry.fetch(
        "https://api.uprizing.me/api/v1/run/javascript",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code: payload.code }),
          timeoutInMs: 15_000,
          retry: {
            timeout: {
              maxAttempts: 3,
              factor: 1.5,
              minTimeoutInMs: 1_000,
              maxTimeoutInMs: 10_000,
              randomize: true,
            },
            byStatus: {
              "500-599": {
                strategy: "backoff",
                maxAttempts: 3,
                factor: 1.5,
                minTimeoutInMs: 1_000,
                maxTimeoutInMs: 10_000,
                randomize: true,
              },
            },
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        logger.error("Code execution failed", { error: data.error });
        return {
          success: false as const,
          error: data.error || "Unknown execution error",
        };
      }

      const output = data.output?.text || JSON.stringify(data.output) || "";
      logger.log("Code execution succeeded", { output });

      return {
        success: true as const,
        output,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Failed to call exec0 API", { error: errorMessage });
      return {
        success: false as const,
        error: errorMessage,
      };
    }
  },
});
