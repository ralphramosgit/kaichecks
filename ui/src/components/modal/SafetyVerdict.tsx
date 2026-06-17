"use client";

import { Info } from "lucide-react";

import { ProbabilityBar } from "@/components/ui/ProbabilityBar";
import { SafetyBadge } from "@/components/ui/SafetyBadge";
import { SAFETY_META } from "@/lib/constants";
import type { BeachPrediction } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

/** Prominent safety verdict block for the beach modal header. */
export function SafetyVerdict({ prediction }: { prediction: BeachPrediction }) {
  const { unsafeProbability, safetyLevel, limitedData } = prediction;
  const meta = SAFETY_META[safetyLevel];

  return (
    <div
      className="rounded-2xl p-4 ring-1"
      style={{
        backgroundColor: `${meta.hex}14`,
        borderColor: `${meta.hex}55`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ocean-500">
            Predicted verdict
          </span>
          <div className="mt-1.5">
            <SafetyBadge level={safetyLevel} />
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-3xl font-bold leading-none"
            style={{ color: meta.hex }}
          >
            {formatPercent(unsafeProbability)}
          </div>
          <span className="text-[11px] text-ocean-500">unsafe probability</span>
        </div>
      </div>

      <div className="mt-3">
        <ProbabilityBar probability={unsafeProbability} level={safetyLevel} />
      </div>

      {limitedData ? (
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-ocean-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-caution-500" />
          This beach has few historical samples, so its rate is pulled toward
          the island average and should be read as low confidence.
        </p>
      ) : null}
    </div>
  );
}
