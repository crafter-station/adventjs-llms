"use client";

import { MODELS } from "@/lib/models";

const TOOL_USE_MODELS = MODELS.filter(
  (model) => model.tags?.includes("tool-use") && model.type === "chat",
).sort((a, b) => a.displayName.localeCompare(b.displayName));

function getPricingTier(
  inputCost: string | undefined,
  outputCost: string | undefined,
): "free" | "cheap" | "moderate" | "expensive" | "premium" {
  const input = Number.parseFloat(inputCost || "0");
  const output = Number.parseFloat(outputCost || "0");
  const avgCost = (input + output) / 2;

  if (avgCost === 0) return "free";
  if (avgCost < 0.5) return "cheap";
  if (avgCost < 3) return "moderate";
  if (avgCost < 10) return "expensive";
  return "premium";
}

function PricingIcon({ tier }: { tier: ReturnType<typeof getPricingTier> }) {
  const icons = {
    free: { symbol: "$", color: "text-green-400", label: "Free" },
    cheap: {
      symbol: "$",
      color: "text-green-400",
      label: "Budget-friendly",
    },
    moderate: { symbol: "$$", color: "text-brand-yellow", label: "Moderate" },
    expensive: {
      symbol: "$$$",
      color: "text-red-400",
      label: "Expensive",
    },
    premium: { symbol: "$$$$", color: "text-red-500", label: "Premium" },
  };

  const { symbol, color, label } = icons[tier];
  return (
    <span className={`font-mono text-xs ${color}`} title={label}>
      {symbol}
    </span>
  );
}

function SpeedIcon({
  tokensPerSecond,
}: {
  tokensPerSecond: number | null | undefined;
}) {
  if (!tokensPerSecond) return null;

  let icon: string;
  let color: string;
  let label: string;

  if (tokensPerSecond > 100) {
    icon = ">>>";
    color = "text-green-400";
    label = `Very fast (${Math.round(tokensPerSecond)} tok/s)`;
  } else if (tokensPerSecond > 50) {
    icon = ">>";
    color = "text-brand-yellow";
    label = `Fast (${Math.round(tokensPerSecond)} tok/s)`;
  } else {
    icon = ">";
    color = "text-muted";
    label = `Slower (${Math.round(tokensPerSecond)} tok/s)`;
  }

  return (
    <span className={`font-mono text-xs ${color}`} title={label}>
      {icon}
    </span>
  );
}

function getOrganizationLabel(org: string): string {
  const labels: Record<string, string> = {
    openai: "OAI",
    anthropic: "ANT",
    google: "GGL",
    meta: "META",
    mistral: "MST",
    xai: "XAI",
    deepseek: "DS",
    alibaba: "ALI",
    amazon: "AWS",
    moonshotai: "MOON",
    cohere: "COH",
    perplexity: "PPLX",
    minimax: "MMX",
    zai: "ZAI",
    meituan: "MT",
    vercel: "VCL",
  };
  return labels[org.toLowerCase()] || org.slice(0, 3).toUpperCase();
}

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  id: string;
}

export function ModelSelector({
  value,
  onChange,
  disabled,
  label,
  id,
}: ModelSelectorProps) {
  const selectedModel = TOOL_USE_MODELS.find((m) => m.copyString === value);

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-xs font-bold uppercase tracking-wider text-brand-beige/60"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none border border-white/20 bg-brand-red py-2 pr-8 pl-3 text-sm uppercase text-brand-beige focus:border-brand-beige focus:outline-none"
          disabled={disabled}
        >
          {TOOL_USE_MODELS.map((model) => {
            const tier = getPricingTier(model.inputCost, model.outputCost);
            const speed = model.metrics?.throughput?.averageTokensPerSecond;
            const speedLabel = speed ? ` ${Math.round(speed)}t/s` : "";
            const tierSymbols = {
              free: "FREE",
              cheap: "$",
              moderate: "$$",
              expensive: "$$$",
              premium: "$$$$",
            };

            return (
              <option key={model.slug} value={model.copyString}>
                [{getOrganizationLabel(model.creatorOrganization)}]{" "}
                {model.displayName} ({tierSymbols[tier]}
                {speedLabel})
              </option>
            );
          })}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <svg
            className="h-4 w-4 text-brand-beige/60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {selectedModel && (
        <div className="flex items-center gap-2 text-xs text-brand-beige/60">
          <PricingIcon
            tier={getPricingTier(
              selectedModel.inputCost,
              selectedModel.outputCost,
            )}
          />
          <span>
            ${selectedModel.inputCost || "0"} in / $
            {selectedModel.outputCost || "0"} out
          </span>
          <SpeedIcon
            tokensPerSecond={
              selectedModel.metrics?.throughput?.averageTokensPerSecond
            }
          />
          {selectedModel.contextSize > 0 && (
            <span>{Math.round(selectedModel.contextSize / 1000)}K ctx</span>
          )}
        </div>
      )}
    </div>
  );
}

export { TOOL_USE_MODELS };
