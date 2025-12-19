"use client";

import { useEffect, useRef, useState } from "react";

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

const tierSymbols = {
  free: "FREE",
  cheap: "$",
  moderate: "$$",
  expensive: "$$$",
  premium: "$$$$",
};

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
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedModel = TOOL_USE_MODELS.find((m) => m.copyString === value);

  const filteredModels = TOOL_USE_MODELS.filter((model) => {
    const searchLower = search.toLowerCase();
    return (
      model.displayName.toLowerCase().includes(searchLower) ||
      model.creatorOrganization.toLowerCase().includes(searchLower) ||
      model.copyString.toLowerCase().includes(searchLower) ||
      getOrganizationLabel(model.creatorOrganization)
        .toLowerCase()
        .includes(searchLower)
    );
  });

  const prevSearchRef = useRef(search);
  if (prevSearchRef.current !== search) {
    prevSearchRef.current = search;
    if (highlightedIndex !== 0) {
      setHighlightedIndex(0);
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlighted = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlighted) {
        highlighted.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => (i < filteredModels.length - 1 ? i + 1 : i));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => (i > 0 ? i - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredModels[highlightedIndex]) {
          onChange(filteredModels[highlightedIndex].copyString);
          setIsOpen(false);
          setSearch("");
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearch("");
        break;
    }
  }

  function handleSelect(modelCopyString: string) {
    onChange(modelCopyString);
    setIsOpen(false);
    setSearch("");
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-xs font-bold uppercase tracking-wider text-brand-beige/60"
      >
        {label}
      </label>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          id={id}
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="flex h-10 w-full items-center justify-between border border-white/20 bg-brand-red px-3 py-2 text-left text-sm uppercase text-brand-beige transition-colors hover:border-brand-beige/40 focus:border-brand-beige focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="truncate">
            {selectedModel ? (
              <>
                <span className="text-brand-beige/60">
                  [{getOrganizationLabel(selectedModel.creatorOrganization)}]
                </span>{" "}
                {selectedModel.displayName}
              </>
            ) : (
              "Select a model..."
            )}
          </span>
          <svg
            className={`ml-2 h-4 w-4 shrink-0 text-brand-beige/60 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full border border-white/20 bg-brand-red shadow-lg shadow-black/50">
            <div className="border-b border-white/10 p-2">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search models..."
                className="w-full bg-transparent px-2 py-1 text-sm text-brand-beige placeholder:text-brand-beige/40 focus:outline-none"
                autoComplete="off"
              />
            </div>
            <div ref={listRef} className="max-h-64 overflow-y-auto">
              {filteredModels.length === 0 ? (
                <div className="px-3 py-2 text-sm text-brand-beige/60">
                  No models found
                </div>
              ) : (
                filteredModels.map((model, index) => {
                  const tier = getPricingTier(
                    model.inputCost,
                    model.outputCost,
                  );
                  const speed =
                    model.metrics?.throughput?.averageTokensPerSecond;
                  const isSelected = model.copyString === value;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <button
                      type="button"
                      key={model.slug}
                      onClick={() => handleSelect(model.copyString)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                        isHighlighted
                          ? "bg-brand-beige/10"
                          : "hover:bg-brand-beige/5"
                      } ${isSelected ? "bg-brand-beige/20" : ""}`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="shrink-0 font-mono text-xs text-brand-beige/50">
                          [{getOrganizationLabel(model.creatorOrganization)}]
                        </span>
                        <span className="truncate uppercase text-brand-beige">
                          {model.displayName}
                        </span>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-2">
                        <span
                          className={`font-mono text-xs ${
                            tier === "free" || tier === "cheap"
                              ? "text-green-400"
                              : tier === "moderate"
                                ? "text-brand-yellow"
                                : "text-red-400"
                          }`}
                        >
                          {tierSymbols[tier]}
                        </span>
                        {speed && (
                          <span
                            className={`font-mono text-xs ${
                              speed > 100
                                ? "text-green-400"
                                : speed > 50
                                  ? "text-brand-yellow"
                                  : "text-brand-beige/40"
                            }`}
                          >
                            {Math.round(speed)}t/s
                          </span>
                        )}
                        {isSelected && (
                          <svg
                            className="h-4 w-4 text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-label="Selected"
                          >
                            <title>Selected</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-white/10 px-3 py-1.5 text-xs text-brand-beige/40">
              {filteredModels.length} model{filteredModels.length !== 1 && "s"}{" "}
              • ↑↓ navigate • Enter select • Esc close
            </div>
          </div>
        )}
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
