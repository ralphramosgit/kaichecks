"use client";

import { motion } from "framer-motion";
import { Info, TrendingDown, TrendingUp } from "lucide-react";

import { ProbabilityBar } from "@/components/ui/ProbabilityBar";
import { SafetyDot } from "@/components/ui/SafetyBadge";
import { REGION_LABELS } from "@/lib/constants";
import type { BeachPrediction } from "@/lib/types";
import { cn, formatPercent } from "@/lib/utils";

interface BeachListItemProps {
  prediction: BeachPrediction;
  rank: number;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}

/** A single ranked beach row with safety, probability bar, and trend. */
export function BeachListItem({
  prediction,
  rank,
  isHovered,
  onSelect,
  onHover,
}: BeachListItemProps) {
  const { beach, unsafeProbability, safetyLevel, delta, limitedData } =
    prediction;
  const rising = delta >= 0;

  return (
    <motion.li
      layout
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
    >
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors",
          isHovered ? "bg-ocean-50" : "hover:bg-ocean-50/60",
        )}
      >
        <span className="w-5 shrink-0 text-center text-xs font-bold text-ocean-400">
          {rank}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <SafetyDot level={safetyLevel} />
            <span className="truncate text-sm font-semibold text-ocean-800">
              {beach.name}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <ProbabilityBar
              probability={unsafeProbability}
              level={safetyLevel}
              showThreshold={false}
              className="h-1.5"
            />
            <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums text-ocean-700">
              {formatPercent(unsafeProbability)}
            </span>
          </div>
          <span className="mt-0.5 block text-[11px] text-ocean-500/70">
            {REGION_LABELS[beach.region]}
            {limitedData ? (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-caution-500">
                <Info className="h-3 w-3" />
                limited data
              </span>
            ) : null}
          </span>
        </div>

        <span
          className={cn(
            "flex shrink-0 items-center gap-0.5 text-[11px] font-semibold",
            rising ? "text-coral-500" : "text-sage-600",
          )}
        >
          {rising ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {formatPercent(Math.abs(delta))}
        </span>
      </button>
    </motion.li>
  );
}
