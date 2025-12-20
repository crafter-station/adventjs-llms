"use client";

import { useRealtimeRun, useRealtimeStream } from "@trigger.dev/react-hooks";
import type { UIMessageChunk } from "ai";
import { useState } from "react";
import { StreamViewer } from "@/components/stream-viewer";
import type { dualSolveChallengeTask } from "@/trigger/dual-solve-challenge";
import type { SolveResult } from "@/trigger/solve-challenge";

type BattleOutput = {
  success: boolean;
  modelA: SolveResult;
  modelB: SolveResult;
};

function BattleStreams({
  runId,
  accessToken,
  modelAName,
  modelBName,
  isComplete,
  isFailed,
  output,
}: {
  runId: string;
  accessToken: string;
  modelAName: string;
  modelBName: string;
  isComplete: boolean;
  isFailed: boolean;
  output: BattleOutput | undefined;
}) {
  const [activeTab, setActiveTab] = useState<"a" | "b">("a");

  const { parts: modelAChunks, error: streamAError } =
    useRealtimeStream<UIMessageChunk>(runId, "model-a", { accessToken });

  const { parts: modelBChunks, error: streamBError } =
    useRealtimeStream<UIMessageChunk>(runId, "model-b", { accessToken });

  const error = streamAError || streamBError;

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-2 py-2 sm:px-4 sm:py-4 md:px-6">
      {/* Mobile tabs */}
      <div className="mb-2 flex gap-1 lg:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("a")}
          className={`flex-1 truncate border px-2 py-1.5 text-xs font-bold uppercase transition-colors ${
            activeTab === "a"
              ? "border-brand-beige bg-brand-beige text-brand-red-dark"
              : "border-white/20 bg-surface text-brand-beige hover:bg-surface-light"
          }`}
        >
          {modelAName}
          {output?.modelA?.success && (
            <span className="ml-1 text-green-600">✓</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("b")}
          className={`flex-1 truncate border px-2 py-1.5 text-xs font-bold uppercase transition-colors ${
            activeTab === "b"
              ? "border-brand-beige bg-brand-beige text-brand-red-dark"
              : "border-white/20 bg-surface text-brand-beige hover:bg-surface-light"
          }`}
        >
          {modelBName}
          {output?.modelB?.success && (
            <span className="ml-1 text-green-600">✓</span>
          )}
        </button>
      </div>

      {/* Mobile: show only active tab */}
      <div className="min-h-0 flex-1 lg:hidden">
        {activeTab === "a" ? (
          <StreamViewer
            modelName={modelAName}
            chunks={modelAChunks ?? []}
            isComplete={isComplete}
            isFailed={isFailed}
            error={error}
            result={output?.modelA}
          />
        ) : (
          <StreamViewer
            modelName={modelBName}
            chunks={modelBChunks ?? []}
            isComplete={isComplete}
            isFailed={isFailed}
            error={error}
            result={output?.modelB}
          />
        )}
      </div>

      {/* Desktop: show both side by side */}
      <div className="hidden min-h-0 flex-1 grid-cols-2 gap-4 lg:grid">
        <StreamViewer
          modelName={modelAName}
          chunks={modelAChunks ?? []}
          isComplete={isComplete}
          isFailed={isFailed}
          error={error}
          result={output?.modelA}
        />
        <StreamViewer
          modelName={modelBName}
          chunks={modelBChunks ?? []}
          isComplete={isComplete}
          isFailed={isFailed}
          error={error}
          result={output?.modelB}
        />
      </div>
    </div>
  );
}

export function BattleRealtime({
  runId,
  accessToken,
  modelAName,
  modelBName,
}: {
  runId: string;
  accessToken: string;
  modelAName: string;
  modelBName: string;
}) {
  const { run } = useRealtimeRun<typeof dualSolveChallengeTask>(runId, {
    accessToken,
  });

  const isComplete = run?.status === "COMPLETED";
  const isFailed =
    run?.status === "FAILED" ||
    run?.status === "CRASHED" ||
    run?.status === "SYSTEM_FAILURE";

  const output = run?.output as BattleOutput | undefined;

  return (
    <BattleStreams
      runId={runId}
      accessToken={accessToken}
      modelAName={modelAName}
      modelBName={modelBName}
      isComplete={isComplete}
      isFailed={isFailed}
      output={output}
    />
  );
}
