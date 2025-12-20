"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ModelSelector, TOOL_USE_MODELS } from "@/components/model-selector";

type Challenge = {
  id: number;
  title: string;
  difficulty: "easy" | "medium" | "hard";
};

function DifficultyBadge({
  difficulty,
}: {
  difficulty: "easy" | "medium" | "hard";
}) {
  const styles = {
    easy: "difficulty-easy",
    medium: "difficulty-medium",
    hard: "difficulty-hard",
  };
  return (
    <span
      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${styles[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}

interface BattleArenaProps {
  challenges: Challenge[];
}

export function BattleArena({ challenges }: BattleArenaProps) {
  const router = useRouter();
  const [modelA, setModelA] = useState("anthropic/claude-opus-4.5");
  const [modelB, setModelB] = useState("openai/gpt-5.1-thinking");
  const [challengeId, setChallengeId] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startBattle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelA, modelB, challengeId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start battle");
      }

      const data = await response.json();
      router.push(`/battles/${data.battleId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsLoading(false);
    }
  };

  const isSameModel = modelA === modelB;

  const selectRandomModels = () => {
    const shuffled = [...TOOL_USE_MODELS].sort(() => Math.random() - 0.5);
    setModelA(shuffled[0].copyString);
    setModelB(shuffled[1].copyString);
  };

  const selectRandomChallenge = () => {
    const randomIndex = Math.floor(Math.random() * challenges.length);
    setChallengeId(challenges[randomIndex].id);
  };

  return (
    <div className="flex-1 bg-brand-red-dark">
      <section className="border-b border-white/20">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
          <h2 className="mb-6 text-sm font-bold uppercase tracking-widest text-brand-beige/60">
            Configure Battle
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3">
            <ModelSelector
              id="model-a"
              label="Model A"
              value={modelA}
              onChange={setModelA}
              disabled={isLoading}
            />

            <ModelSelector
              id="model-b"
              label="Model B"
              value={modelB}
              onChange={setModelB}
              disabled={isLoading}
            />

            <div className="col-span-2 flex flex-col gap-2 md:col-span-1">
              <label
                htmlFor="challenge"
                className="text-xs font-bold uppercase tracking-wider text-brand-beige/60"
              >
                Challenge
              </label>
              <select
                id="challenge"
                value={challengeId}
                onChange={(e) => setChallengeId(Number(e.target.value))}
                className="h-10 border border-white/20 bg-brand-red px-3 text-sm uppercase text-brand-beige focus:border-brand-beige focus:outline-none"
                disabled={isLoading}
              >
                {challenges.map((challenge) => (
                  <option key={challenge.id} value={challenge.id}>
                    #{challenge.id} - {challenge.title} (
                    {challenge.difficulty.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={startBattle}
              disabled={isLoading || isSameModel}
              className="border-2 border-black bg-brand-beige px-6 py-3 text-sm font-bold uppercase tracking-widest text-brand-red-dark transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5"
            >
              {isLoading ? "Starting..." : "Start Battle"}
            </button>
            <button
              type="button"
              onClick={selectRandomModels}
              disabled={isLoading}
              className="border border-white/20 bg-brand-red px-4 py-3 text-sm uppercase tracking-wider text-brand-beige transition-colors hover:bg-brand-red-light disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5"
            >
              Random Models
            </button>
            <button
              type="button"
              onClick={selectRandomChallenge}
              disabled={isLoading}
              className="border border-white/20 bg-brand-red px-4 py-3 text-sm uppercase tracking-wider text-brand-beige transition-colors hover:bg-brand-red-light disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5"
            >
              Random Challenge
            </button>
          </div>

          {isSameModel && (
            <div className="mt-4 text-sm uppercase text-brand-yellow">
              Select different models to start a battle
            </div>
          )}
          {error && (
            <div className="mt-4 text-sm uppercase text-red-400">{error}</div>
          )}
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-brand-beige/60">
              Available Challenges
            </h2>
            <a
              href="https://adventjs.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm uppercase tracking-wider text-accent hover:underline"
            >
              View on AdventJS ↗
            </a>
          </div>

          <div className="max-h-[400px] overflow-y-auto border border-white/20 sm:max-h-none">
            {challenges.map((challenge, i) => (
              <button
                key={challenge.id}
                type="button"
                onClick={() => setChallengeId(challenge.id)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-brand-red ${
                  i !== 0 ? "border-t border-white/20" : ""
                } ${challengeId === challenge.id ? "bg-brand-red" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 text-sm font-bold text-brand-beige/60">
                    {String(challenge.id).padStart(2, "0")}
                  </span>
                  <span className="text-sm uppercase tracking-wider text-brand-beige">
                    {challenge.title}
                  </span>
                </div>
                <DifficultyBadge difficulty={challenge.difficulty} />
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
