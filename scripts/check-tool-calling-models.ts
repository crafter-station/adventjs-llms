import { writeFileSync } from "node:fs";
import { MODELS } from "../src/lib/models";

const toolCallingModels = MODELS.filter((model) => {
  if (!model.tags) return false;
  return model.tags.includes("tool-use") || model.tags.includes("tool-calling");
}).map(({ metrics, ...rest }) => rest);

const output = {
  generatedAt: new Date().toISOString(),
  totalModels: toolCallingModels.length,
  models: toolCallingModels,
};

writeFileSync(
  "tool-calling-models.json",
  JSON.stringify(output, null, 2),
  "utf-8",
);

console.log(
  `Found ${toolCallingModels.length} models with tool calling support`,
);
console.log("Output written to tool-calling-models.json");
