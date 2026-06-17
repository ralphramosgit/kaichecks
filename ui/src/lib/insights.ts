import { REGION_LABELS } from "@/lib/constants";
import type { RainfallScenario, Region, SimulationResult } from "@/lib/types";
import { MONTHS } from "@/lib/constants";
import { formatPercent } from "@/lib/utils";

/**
 * Placeholder shown wherever a plain-language summary will go once a GPT API
 * key is connected. Until then we surface only real model numbers, never
 * generated prose dressed up as analysis.
 */
export const AI_SUMMARY_PLACEHOLDER =
  "Connect a GPT API key to generate a plain-language summary. The figures shown are live model output.";

/** A short, human-readable storm descriptor for the active scenario. */
function scenarioPhrase(
  scenario: RainfallScenario,
  result: SimulationResult,
): string {
  const total = result.features.rain7day;
  const month = MONTHS[scenario.month - 1];
  if (total <= 1) return `a dry week in ${month}`;
  if (total < 20) return `light showers in ${month}`;
  if (total < 60) return `a moderately wet stretch in ${month}`;
  if (total < 120) return `heavy rainfall in ${month}`;
  return `an intense storm system in ${month}`;
}

export interface Finding {
  id: string;
  title: string;
  detail: string;
  tone: "safe" | "caution" | "unsafe" | "neutral";
}

/** Generate the bullet findings shown in the results panel. */
export function generateFindings(
  result: SimulationResult,
  scenario: RainfallScenario,
): Finding[] {
  const findings: Finding[] = [];
  const total = result.predictions.length;
  const phrase = scenarioPhrase(scenario, result);

  findings.push({
    id: "overview",
    title: `${result.unsafeCount} of ${total} beaches flagged unsafe`,
    detail: `Across ${phrase}, the model flags ${result.unsafeCount} unsafe and ${result.cautionCount} caution locations island-wide.`,
    tone: result.unsafeCount > total * 0.3 ? "unsafe" : "neutral",
  });

  const worst = result.mostUnsafe[0];
  if (worst) {
    findings.push({
      id: "worst",
      title: `${worst.beach.name} shows the highest risk`,
      detail: `Predicted ${formatPercent(
        worst.unsafeProbability,
      )} chance of exceeding the swimming standard under the current rainfall.`,
      tone: "unsafe",
    });
  }

  // Which region is most affected by the scenario.
  const regionTotals = new Map<Region, { sum: number; count: number }>();
  for (const prediction of result.predictions) {
    const entry = regionTotals.get(prediction.beach.region) ?? {
      sum: 0,
      count: 0,
    };
    entry.sum += prediction.unsafeProbability;
    entry.count += 1;
    regionTotals.set(prediction.beach.region, entry);
  }
  let topRegion: Region | null = null;
  let topAvg = -1;
  for (const [region, { sum, count }] of regionTotals) {
    const avg = sum / count;
    if (avg > topAvg) {
      topAvg = avg;
      topRegion = region;
    }
  }
  if (topRegion) {
    findings.push({
      id: "region",
      title: `${REGION_LABELS[topRegion]} is most affected`,
      detail: `This coast carries the highest average exceedance probability at ${formatPercent(
        topAvg,
      )} under the current rainfall.`,
      tone: topAvg >= 0.5 ? "unsafe" : topAvg >= 0.25 ? "caution" : "neutral",
    });
  }

  const safest = result.mostSafe[0];
  if (safest) {
    findings.push({
      id: "safest",
      title: `${safest.beach.name} remains the safest bet`,
      detail: `Lowest predicted risk at ${formatPercent(
        safest.unsafeProbability,
      )} exceedance probability.`,
      tone: "safe",
    });
  }

  return findings;
}
