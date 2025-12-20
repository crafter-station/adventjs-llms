"use client";

import { useRealtimeRun, useRealtimeStream } from "@trigger.dev/react-hooks";
import type { UIMessageChunk } from "ai";
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
  const { parts: modelAChunks, error: streamAError } =
    useRealtimeStream<UIMessageChunk>(runId, "model-a", { accessToken });

  const { parts: modelBChunks, error: streamBError } =
    useRealtimeStream<UIMessageChunk>(runId, "model-b", { accessToken });

  const error = streamAError || streamBError;

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 py-4 md:px-6">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
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
