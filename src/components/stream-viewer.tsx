"use client";

import type { UIMessageChunk } from "ai";
import { useState } from "react";

interface ModelResult {
  success: boolean;
  executionCount: number;
  timeToSolutionMs: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  solution?: string;
  error?: string;
}

interface StreamViewerProps {
  modelName: string;
  chunks: UIMessageChunk[];
  isComplete: boolean;
  isFailed: boolean;
  error?: Error | null;
  result?: ModelResult;
}

interface ToolCall {
  id: string;
  name: string;
  input?: unknown;
  inputText?: string;
  output?: unknown;
  error?: string;
  status: "streaming" | "pending" | "executing" | "complete" | "error";
}

interface StreamElement {
  type: "text" | "tool" | "unknown";
  id: string;
  content: string;
  toolCall?: ToolCall;
  rawChunk?: unknown;
}

const IGNORED_CHUNK_TYPES = new Set([
  "start",
  "start-step",
  "finish-step",
  "finish",
  "text-start",
  "text-end",
  "reasoning-end",
]);

function processChunks(chunks: UIMessageChunk[]): {
  mainElements: StreamElement[];
  reasoningText: string;
  toolCalls: Map<string, ToolCall>;
} {
  const mainElements: StreamElement[] = [];
  const toolCalls = new Map<string, ToolCall>();
  const reasoningBlocks = new Map<string, string>();
  let currentText = "";
  let currentTextStartIndex = -1;

  const flushText = () => {
    if (currentText && currentTextStartIndex >= 0) {
      const existingIndex = mainElements.findIndex(
        (el) => el.type === "text" && el.id === `text-${currentTextStartIndex}`,
      );
      if (existingIndex >= 0) {
        mainElements[existingIndex].content = currentText;
      } else {
        mainElements.push({
          type: "text",
          id: `text-${currentTextStartIndex}`,
          content: currentText,
        });
      }
      currentText = "";
      currentTextStartIndex = -1;
    }
  };

  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i];

    // Manual stream.append() calls stringify chunks for transport,
    // so we need to parse them back into objects
    if (typeof chunk === "string") {
      try {
        chunk = JSON.parse(chunk) as UIMessageChunk;
      } catch {
        // Not valid JSON, will be handled as unknown chunk
      }
    }

    if (IGNORED_CHUNK_TYPES.has(chunk.type)) {
      continue;
    }

    switch (chunk.type) {
      case "text-delta":
        if (currentTextStartIndex < 0) {
          currentTextStartIndex = i;
        }
        currentText += chunk.delta;
        break;

      case "reasoning-start":
        reasoningBlocks.set(chunk.id, "");
        break;

      case "reasoning-delta": {
        const existing = reasoningBlocks.get(chunk.id) ?? "";
        reasoningBlocks.set(chunk.id, existing + chunk.delta);
        break;
      }

      case "tool-input-start":
        flushText();
        toolCalls.set(chunk.toolCallId, {
          id: chunk.toolCallId,
          name: chunk.toolName,
          status: "streaming",
        });
        mainElements.push({
          type: "tool",
          id: chunk.toolCallId,
          content: "",
          toolCall: toolCalls.get(chunk.toolCallId),
        });
        break;

      case "tool-input-delta": {
        const existing = toolCalls.get(chunk.toolCallId);
        if (existing) {
          existing.inputText =
            (existing.inputText || "") + chunk.inputTextDelta;
        }
        break;
      }

      case "tool-input-available": {
        flushText();
        const existing = toolCalls.get(chunk.toolCallId);
        if (existing) {
          existing.input = chunk.input;
          existing.status = "executing";
        } else {
          const newTool: ToolCall = {
            id: chunk.toolCallId,
            name: chunk.toolName,
            input: chunk.input,
            status: "executing",
          };
          toolCalls.set(chunk.toolCallId, newTool);
          mainElements.push({
            type: "tool",
            id: chunk.toolCallId,
            content: "",
            toolCall: newTool,
          });
        }
        break;
      }

      case "tool-output-available": {
        const existing = toolCalls.get(chunk.toolCallId);
        if (existing) {
          existing.output = chunk.output;
          existing.status = "complete";
        } else {
          const newTool: ToolCall = {
            id: chunk.toolCallId,
            name: "runCode",
            output: chunk.output,
            status: "complete",
          };
          toolCalls.set(chunk.toolCallId, newTool);
          mainElements.push({
            type: "tool",
            id: chunk.toolCallId,
            content: "",
            toolCall: newTool,
          });
        }
        break;
      }

      case "tool-output-error": {
        const existing = toolCalls.get(chunk.toolCallId);
        if (existing) {
          existing.error = chunk.errorText;
          existing.status = "error";
        } else {
          const newTool: ToolCall = {
            id: chunk.toolCallId,
            name: "runCode",
            error: chunk.errorText,
            status: "error",
          };
          toolCalls.set(chunk.toolCallId, newTool);
          mainElements.push({
            type: "tool",
            id: chunk.toolCallId,
            content: "",
            toolCall: newTool,
          });
        }
        break;
      }

      case "tool-input-error": {
        const existing = toolCalls.get(chunk.toolCallId);
        if (existing) {
          existing.error = chunk.errorText;
          existing.status = "error";
        }
        break;
      }

      default: {
        flushText();
        mainElements.push({
          type: "unknown",
          id: `unknown-${i}`,
          content: JSON.stringify(chunk, null, 2),
          rawChunk: chunk,
        });
        break;
      }
    }
  }

  flushText();

  const reasoningText = Array.from(reasoningBlocks.values()).join("\n\n");

  return { mainElements, reasoningText, toolCalls };
}

function ToolCallDisplay({ toolCall }: { toolCall: ToolCall }) {
  const inputCode =
    toolCall.input &&
    typeof toolCall.input === "object" &&
    "code" in toolCall.input
      ? String((toolCall.input as { code: string }).code)
      : toolCall.inputText || null;

  const output = toolCall.output as
    | { success: boolean; output?: string; error?: string }
    | undefined;

  return (
    <div className="my-3 overflow-hidden border border-white/20 bg-background">
      <div className="flex items-center gap-2 border-b border-white/20 px-3 py-2">
        <span className="font-bold uppercase">{toolCall.name}</span>
        {toolCall.status === "streaming" && (
          <span className="flex items-center gap-1 text-xs text-brand-beige">
            <span className="h-1.5 w-1.5 animate-pulse bg-brand-beige" />
            Building...
          </span>
        )}
        {toolCall.status === "executing" && (
          <span className="flex items-center gap-1 text-xs text-brand-yellow">
            <span className="h-1.5 w-1.5 animate-pulse bg-brand-yellow" />
            Executing...
          </span>
        )}
        {toolCall.status === "complete" && (
          <span className="text-xs font-bold uppercase text-green-400">
            Complete
          </span>
        )}
        {toolCall.status === "error" && (
          <span className="text-xs font-bold uppercase text-red-400">
            Error
          </span>
        )}
      </div>
      {inputCode && (
        <div className="border-b border-white/20 p-3">
          <div className="mb-1 text-xs font-bold uppercase text-muted">
            Code:
          </div>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap bg-surface p-2 font-mono text-xs">
            {inputCode}
          </pre>
        </div>
      )}
      {output && (
        <div className="p-3">
          <div className="mb-1 text-xs font-bold uppercase text-muted">
            Result:
          </div>
          {output.success ? (
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap bg-green-400/20 p-2 font-mono text-xs text-green-400">
              {output.output || "Success (no output)"}
            </pre>
          ) : (
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap bg-red-400/20 p-2 font-mono text-xs text-red-400">
              {output.error || "Error"}
            </pre>
          )}
        </div>
      )}
      {toolCall.error && !output && (
        <div className="p-3">
          <div className="mb-1 text-xs font-bold uppercase text-muted">
            Error:
          </div>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap bg-red-400/20 p-2 font-mono text-xs text-red-400">
            {toolCall.error}
          </pre>
        </div>
      )}
    </div>
  );
}

function SolutionDisplay({ solution }: { solution: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(solution);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden border border-green-400/50 bg-green-400/10">
      <div className="flex items-center justify-between border-b border-green-400/50 px-3 py-2">
        <span className="text-sm font-bold uppercase text-green-400">
          Final Solution
        </span>
        <button
          type="button"
          onClick={copyToClipboard}
          className="px-2 py-1 text-xs font-bold uppercase text-green-400 transition-colors hover:bg-green-400/20"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="max-h-64 overflow-auto p-3 font-mono text-sm text-brand-beige">
        {solution}
      </pre>
    </div>
  );
}

function UnknownChunkDisplay({ content }: { content: string }) {
  return (
    <div className="my-3 overflow-hidden border border-orange-400/30 bg-orange-400/5">
      <div className="flex items-center gap-2 border-b border-orange-400/30 px-3 py-2">
        <span className="text-xs font-bold uppercase text-orange-400">
          Unknown Delta
        </span>
      </div>
      <div className="p-3">
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-xs text-orange-300">
          {content}
        </pre>
      </div>
    </div>
  );
}

export function StreamViewer({
  modelName,
  chunks,
  isComplete,
  isFailed,
  error,
  result,
}: StreamViewerProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const { mainElements, reasoningText, toolCalls } = processChunks(chunks);
  const toolCallsArray = Array.from(toolCalls.values());

  const renderMainContent = () => {
    return mainElements.map((element: StreamElement) => {
      switch (element.type) {
        case "text":
          return (
            <span key={element.id} className="whitespace-pre-wrap">
              {element.content}
            </span>
          );
        case "tool":
          return element.toolCall ? (
            <ToolCallDisplay key={element.id} toolCall={element.toolCall} />
          ) : null;
        case "unknown":
          return (
            <UnknownChunkDisplay key={element.id} content={element.content} />
          );
        default:
          return null;
      }
    });
  };

  const statusBadge = () => {
    if (isFailed) {
      return (
        <span className="bg-red-400/20 px-2 py-0.5 text-xs font-bold uppercase text-red-400">
          Failed
        </span>
      );
    }
    if (isComplete && result?.success) {
      return (
        <span className="bg-green-400/20 px-2 py-0.5 text-xs font-bold uppercase text-green-400">
          Success
        </span>
      );
    }
    if (isComplete && !result?.success) {
      return (
        <span className="bg-brand-yellow/20 px-2 py-0.5 text-xs font-bold uppercase text-brand-yellow">
          No Solution
        </span>
      );
    }
    if (chunks.length > 0) {
      return (
        <span className="flex items-center gap-1 bg-brand-beige/20 px-2 py-0.5 text-xs font-bold uppercase text-brand-beige">
          <span className="h-1.5 w-1.5 animate-pulse bg-brand-beige" />
          Running
        </span>
      );
    }
    return (
      <span className="bg-surface px-2 py-0.5 text-xs font-bold uppercase text-muted">
        Waiting
      </span>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden border border-white/20 bg-surface pixel-shadow">
      <div className="flex shrink-0 items-center justify-between border-b border-white/20 bg-surface px-3 py-2 sm:px-4 sm:py-3">
        <h3 className="truncate text-sm font-bold uppercase sm:text-base">
          {modelName}
        </h3>
        {statusBadge()}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2 sm:p-4">
        {error ? (
          <div className="text-red-400">Error: {error.message}</div>
        ) : chunks.length === 0 ? (
          <div className="flex items-center gap-2 text-muted">
            <div className="h-2 w-2 animate-pulse bg-muted" />
            Waiting for response...
          </div>
        ) : (
          <div className="space-y-4">
            {result?.solution && <SolutionDisplay solution={result.solution} />}

            {reasoningText && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="mb-2 flex items-center gap-2 text-sm uppercase text-muted transition-colors hover:text-brand-beige"
                >
                  <span
                    className={`transform font-mono transition-transform ${showReasoning ? "rotate-90" : ""}`}
                  >
                    &gt;
                  </span>
                  {showReasoning ? "Hide" : "Show"} Reasoning
                </button>

                {showReasoning && (
                  <div className="border border-purple-400/30 bg-purple-400/5 p-4">
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-purple-300">
                      {reasoningText}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="border border-white/20 bg-background p-4">
              <div className="mb-2 text-xs font-bold uppercase text-muted">
                Solving Process
                {toolCallsArray.length > 0 && (
                  <span className="ml-2 font-normal">
                    ({toolCallsArray.length} tool call
                    {toolCallsArray.length !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
              <div className="font-mono text-sm text-muted">
                {renderMainContent()}
              </div>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="shrink-0 border-t border-white/20 bg-surface px-2 py-2 sm:px-4 sm:py-3">
          <div className="grid grid-cols-2 gap-1 text-center text-[10px] sm:grid-cols-4 sm:gap-2 sm:text-xs">
            <div>
              <div className="font-mono text-sm font-bold text-brand-beige">
                {result.timeToSolutionMs > 0
                  ? `${(result.timeToSolutionMs / 1000).toFixed(1)}s`
                  : "-"}
              </div>
              <div className="uppercase text-muted">Time</div>
            </div>
            <div>
              <div className="font-mono text-sm font-bold text-brand-beige">
                {result.executionCount}
              </div>
              <div className="uppercase text-muted">Execs</div>
            </div>
            <div>
              <div className="font-mono text-sm font-bold text-brand-beige">
                {result.outputTokens.toLocaleString()}
              </div>
              <div className="uppercase text-muted">Tokens</div>
            </div>
            <div>
              <div className="font-mono text-sm font-bold text-brand-beige">
                ${result.cost.toFixed(4)}
              </div>
              <div className="uppercase text-muted">Cost</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
