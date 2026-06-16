"use client";

import { useMemo, useState } from "react";
import { BarChart3, Sparkles } from "lucide-react";

import { CollapsiblePanel } from "@/components/ui/CollapsiblePanel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useSimulation } from "@/context/SimulationContext";
import { generateFindings, summarizeIsland } from "@/lib/insights";
import { formatPercent } from "@/lib/utils";

import { StatGrid } from "./StatGrid";
import { SafetyDistributionChart } from "./SafetyDistributionChart";
import { RegionRiskChart } from "./RegionRiskChart";
import { KeyFindings } from "./KeyFindings";

type ChartView = "distribution" | "region";

const CHART_OPTIONS = [
  { value: "distribution" as const, label: "Distribution" },
  { value: "region" as const, label: "By coast" },
];

/**
 * Results panel. Collapses to a one-liner; expands to a generated island
 * summary, headline stats, a switchable chart (safety distribution or per-coast
 * risk), and the key findings.
 */
export function DataResultsPanel() {
  const { result, scenario } = useSimulation();
  const [chartView, setChartView] = useState<ChartView>("distribution");

  const summary = useMemo(
    () => summarizeIsland(result, scenario),
    [result, scenario],
  );
  const findings = useMemo(
    () => generateFindings(result, scenario),
    [result, scenario],
  );

  return (
    <CollapsiblePanel
      className="w-[380px] max-w-[calc(100vw-2rem)]"
      delay={0.35}
      icon={<BarChart3 className="h-5 w-5" />}
      title="Data and findings"
      subtitle="Island-wide results for this scenario"
      badge={
        <span className="rounded-full bg-ocean-50 px-2.5 py-1 text-[11px] font-semibold text-ocean-600 ring-1 ring-ocean-100">
          {formatPercent(result.averageProbability)} avg risk
        </span>
      }
    >
      <div className="scroll-island max-h-[46vh] space-y-4 overflow-y-auto px-5 py-4">
        {/* Generated summary banner. */}
        <div className="rounded-2xl bg-sage-50 p-3 ring-1 ring-sage-200">
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-sage-600" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-sage-600">
              AI summary
            </span>
          </div>
          <p className="text-xs leading-relaxed text-ocean-700">{summary}</p>
        </div>

        <StatGrid result={result} />

        <div>
          <div className="mb-3 flex justify-center">
            <SegmentedControl
              options={CHART_OPTIONS}
              value={chartView}
              onChange={setChartView}
              layoutId="results-chart-tab"
              size="sm"
            />
          </div>
          {chartView === "distribution" ? (
            <SafetyDistributionChart result={result} />
          ) : (
            <RegionRiskChart result={result} />
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ocean-500">
            Key findings
          </h3>
          <KeyFindings findings={findings} />
        </div>
      </div>
    </CollapsiblePanel>
  );
}
