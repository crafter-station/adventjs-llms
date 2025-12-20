import { queue } from "@trigger.dev/sdk";

export const battlesQueue = queue({
  name: "battles-queue",
  concurrencyLimit: 2,
});

export const llmQueue = queue({
  name: "llm-queue",
  concurrencyLimit: 4,
});

export const executeCodeQueue = queue({
  name: "execute-code-queue",
  concurrencyLimit: 1,
});

export const validationQueue = queue({
  name: "validation-queue",
  concurrencyLimit: 2,
});
