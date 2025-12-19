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

function processChunks(chunks: UIMessageChunk[]): {
  textParts: string[];
  toolCalls: Map<string, ToolCall>;
} {
  const textParts: string[] = [];
  const toolCalls = new Map<string, ToolCall>();
  let currentText = "";

  for (const chunk of chunks) {
    switch (chunk.type) {
      case "text-delta":
        currentText += chunk.delta;
        break;

      case "tool-input-start":
        if (currentText) {
          textParts.push(currentText);
          currentText = "";
        }
        toolCalls.set(chunk.toolCallId, {
          id: chunk.toolCallId,
          name: chunk.toolName,
          status: "streaming",
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
        if (currentText) {
          textParts.push(currentText);
          currentText = "";
        }
        const existing = toolCalls.get(chunk.toolCallId);
        if (existing) {
          existing.input = chunk.input;
          existing.status = "executing";
        } else {
          toolCalls.set(chunk.toolCallId, {
            id: chunk.toolCallId,
            name: chunk.toolName,
            input: chunk.input,
            status: "executing",
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
          toolCalls.set(chunk.toolCallId, {
            id: chunk.toolCallId,
            name: "runCode",
            output: chunk.output,
            status: "complete",
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
          toolCalls.set(chunk.toolCallId, {
            id: chunk.toolCallId,
            name: "runCode",
            error: chunk.errorText,
            status: "error",
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
    }
  }

  if (currentText) {
    textParts.push(currentText);
  }

  return { textParts, toolCalls };
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

export function StreamViewer({
  modelName,
  chunks,
  isComplete,
  isFailed,
  error,
  result,
}: StreamViewerProps) {
  const [showReasoning, setShowReasoning] = useState(true);
  const { textParts, toolCalls } = processChunks(chunks);
  const toolCallsArray = Array.from(toolCalls.values());

  const renderReasoning = () => {
    const elements: React.ReactNode[] = [];
    let toolIndex = 0;

    for (let i = 0; i < textParts.length; i++) {
      elements.push(
        <span key={`text-${i}`} className="whitespace-pre-wrap">
          {textParts[i]}
        </span>,
      );

      if (toolIndex < toolCallsArray.length) {
        elements.push(
          <ToolCallDisplay
            key={`tool-${toolCallsArray[toolIndex].id}`}
            toolCall={toolCallsArray[toolIndex]}
          />,
        );
        toolIndex++;
      }
    }

    while (toolIndex < toolCallsArray.length) {
      elements.push(
        <ToolCallDisplay
          key={`tool-${toolCallsArray[toolIndex].id}`}
          toolCall={toolCallsArray[toolIndex]}
        />,
      );
      toolIndex++;
    }

    return elements;
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
      <div className="flex shrink-0 items-center justify-between border-b border-white/20 bg-surface px-4 py-3">
        <h3 className="font-bold uppercase">{modelName}</h3>
        {statusBadge()}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
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
                {toolCallsArray.length > 0 && (
                  <span className="text-xs">
                    ({toolCallsArray.length} tool call
                    {toolCallsArray.length !== 1 ? "s" : ""})
                  </span>
                )}
              </button>

              {showReasoning && (
                <div className="border border-white/20 bg-background p-4">
                  <div className="font-mono text-sm text-muted">
                    {renderReasoning()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="shrink-0 border-t border-white/20 bg-surface px-4 py-3">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
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
