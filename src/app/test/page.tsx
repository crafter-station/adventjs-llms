"use client";

import { useRealtimeStream } from "@trigger.dev/react-hooks";
import type { UIMessageChunk } from "ai";
import { useState } from "react";

const MODELS = [
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "anthropic/claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
];

function extractTextFromChunks(chunks: UIMessageChunk[]): string {
  return chunks
    .filter((chunk) => chunk.type === "text-delta")
    .map((chunk) => (chunk as { type: "text-delta"; delta: string }).delta)
    .join("");
}

function StreamDisplay({
  runId,
  accessToken,
}: {
  runId: string;
  accessToken: string;
}) {
  const { parts, error } = useRealtimeStream<UIMessageChunk>(runId, "model-a", {
    accessToken,
    timeoutInSeconds: 300,
  });

  const text = parts ? extractTextFromChunks(parts) : "";

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 text-sm text-zinc-500">Run ID: {runId}</div>
      <div className="mb-2 text-sm text-zinc-500">
        Raw parts: {parts?.length ?? 0}
      </div>
      {error ? (
        <div className="text-red-500">Error: {error.message}</div>
      ) : !parts || parts.length === 0 ? (
        <div className="flex items-center gap-2 text-zinc-500">
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
          Waiting for stream data...
        </div>
      ) : (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-sm text-zinc-800 dark:text-zinc-200">
          {text || JSON.stringify(parts, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function TestPage() {
  const [testType, setTestType] = useState<"simple" | "challenge">("simple");
  const [prompt, setPrompt] = useState("Write a short poem about coding.");
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [challengeId, setChallengeId] = useState(1);
  const [runId, setRunId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTest = async () => {
    setIsLoading(true);
    setError(null);
    setRunId(null);
    setAccessToken(null);

    try {
      const endpoint = testType === "simple" ? "/api/test/simple" : "/api/test";
      const body =
        testType === "simple" ? { prompt } : { modelId, challengeId };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start test");
      }

      const data = await response.json();
      setRunId(data.runId);
      setAccessToken(data.publicAccessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-zinc-950">
      <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Stream Test Page
      </h1>

      <div className="mb-6 flex gap-4">
        <button
          type="button"
          onClick={() => setTestType("simple")}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            testType === "simple"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          Simple Test (No Tools)
        </button>
        <button
          type="button"
          onClick={() => setTestType("challenge")}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            testType === "challenge"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          Challenge Test (With Tools)
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-4">
        {testType === "simple" ? (
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder="Enter a prompt..."
            disabled={isLoading}
          />
        ) : (
          <div className="flex gap-4">
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={isLoading}
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>

            <select
              value={challengeId}
              onChange={(e) => setChallengeId(Number(e.target.value))}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              disabled={isLoading}
            >
              {Array.from({ length: 16 }, (_, i) => (
                <option key={`challenge-${i + 1}`} value={i + 1}>
                  Challenge {i + 1}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={startTest}
          disabled={isLoading}
          className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isLoading ? "Starting..." : "Start Test"}
        </button>
      </div>

      {error && <div className="mb-4 text-red-500">{error}</div>}

      {runId && accessToken && (
        <StreamDisplay runId={runId} accessToken={accessToken} />
      )}
    </div>
  );
}
