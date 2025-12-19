import { openai } from "@ai-sdk/openai";
import { logger, schemaTask } from "@trigger.dev/sdk";
import { streamText } from "ai";
import { z } from "zod";
import { modelAStream } from "@/app/streams";

export const simpleStreamTestTask = schemaTask({
  id: "simple-stream-test",
  maxDuration: 60,
  schema: z.object({
    prompt: z.string().default("Write a short poem about coding."),
  }),
  run: async (payload) => {
    logger.log("Starting simple stream test", { prompt: payload.prompt });

    const result = streamText({
      model: openai("gpt-4o-mini"),
      prompt: payload.prompt,
    });

    const { waitUntilComplete } = modelAStream.pipe(result.toUIMessageStream());

    await waitUntilComplete();

    logger.log("Stream completed");

    return { success: true };
  },
});
