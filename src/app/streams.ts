import { type InferStreamType, streams } from "@trigger.dev/sdk";
import type { UIMessageChunk } from "ai";

export const modelAStream = streams.define<UIMessageChunk>({
  id: "model-a",
});

export const modelBStream = streams.define<UIMessageChunk>({
  id: "model-b",
});

export type ModelStreamPart = InferStreamType<typeof modelAStream>;
