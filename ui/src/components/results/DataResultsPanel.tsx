"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Sparkles } from "lucide-react";

import { CollapsiblePanel } from "@/components/ui/CollapsiblePanel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useSimulation } from "@/context/SimulationContext";
import { generateFindings } from "@/lib/insights";
import { fetchSummary } from "@/lib/api";
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

export function DataResultsPanel() {
  const { result, scenario } = useSimulation();
  const [chartView, setChartView] = useState<ChartView>("distribution");
  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const findings = useMemo(
    () => generateFindings(result, scenario),
    [result, scenario],
  );

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSummary("");
    setSummaryLoading(true);

    fetchSummary(
      {
        unsafe_probability: result.averageProbability,
        predicted_enterococcus_cfu: 0,
        bav_threshold: 104,
        unsafe_count: result.unsafeCount,
        caution_count: result.cautionCount,
        total_count: result.predictions.length,
        month: scenario.month,
        rain_7day: result.features.rain7day,
        rain_24hr: result.features.rain24hr,
        most_unsafe_beach: result.mostUnsafe[0]?.beach.name ?? "unknown",
        safest_beach: result.mostSafe[0]?.beach.name ?? "unknown",
      },
      controller.signal,
    )
      .then((text) => { setSummary(text); setSummaryLoading(false); })
      .catch((err) => {
        if (err.name !== "AbortError") setSummaryLoading(false);
      });

    return () => controller.abort();
  }, [result, scenario.month]);

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
        <div className="rounded-2xl bg-sage-50 p-3 ring-1 ring-sage-200">
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-sage-600" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-sage-600">
              AI summary
            </span>
          </div>
          {summaryLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-sage-400 border-t-transparent" />
              <span className="text-xs text-ocean-500">Generating summary…</span>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-ocean-700">{summary}</p>
          )}
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
