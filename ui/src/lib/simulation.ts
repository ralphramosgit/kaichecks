import { SAFETY_THRESHOLDS } from "@/lib/constants";
import type {
  Beach,
  BeachPrediction,
  RainfallFeatures,
  RainfallScenario,
  SafetyLevel,
  SimulationResult,
} from "@/lib/types";
import { clamp, round } from "@/lib/utils";

/**
 * Build the seven engineered antecedent-rainfall features from a daily series.
 * Mirrors the feature engineering used to train the backend model: cumulative
 * windows, the rolling three-day maximum, and a dry-spell counter.
 */
export function buildFeatures(
  rainfall7day: number[],
  month: number,
): RainfallFeatures {
  const days = rainfall7day.slice(-7);
  const newest = days[days.length - 1] ?? 0;

  const sumLast = (n: number) =>
    days.slice(days.length - n).reduce((total, mm) => total + mm, 0);

  const rain24hr = newest;
  const rain48hr = sumLast(2);
  const rain72hr = sumLast(3);
  const rain7day = sumLast(7);

  let maxRain3day = 0;
  for (let i = 0; i <= days.length - 3; i += 1) {
    maxRain3day = Math.max(maxRain3day, days[i] + days[i + 1] + days[i + 2]);
  }

  // Count trailing days (newest backward) with no measurable rain.
  let daysSinceRain = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i] > 0) break;
    daysSinceRain += 1;
  }

  return {
    rain24hr: round(rain24hr, 1),
    rain48hr: round(rain48hr, 1),
    rain72hr: round(rain72hr, 1),
    rain7day: round(rain7day, 1),
    daysSinceRain,
    maxRain3day: round(maxRain3day, 1),
    month,
  };
}

/** Map a predicted unsafe probability to a discrete safety verdict. */
export function safetyFromProbability(probability: number): SafetyLevel {
  if (probability >= SAFETY_THRESHOLDS.unsafe) return "unsafe";
  if (probability >= SAFETY_THRESHOLDS.caution) return "caution";
  return "safe";
}

/**
 * Strength of the island-average prior when smoothing a beach's historical
 * exceedance rate, expressed in equivalent samples. A beach needs roughly this
 * many of its own samples before its raw rate outweighs the island average.
 * This stops a beach with a handful of clean samples from reading a hard 0%
 * (or one unlucky sample from reading alarmingly high).
 */
export const EXCEEDANCE_PRIOR_STRENGTH = 30;

/** Below this sample count a beach's history is flagged as limited data. */
export const MIN_RELIABLE_SAMPLES = 30;

/**
 * Shrink a beach's raw historical exceedance rate toward the island average
 * using Laplace / empirical-Bayes smoothing. Well-sampled beaches barely move;
 * sparse beaches regress toward the island norm instead of claiming a confident
 * 0% or spiking on a single sample.
 */
export function smoothedExceedance(
  beach: Beach,
  islandMeanExceedance: number,
): number {
  const exceedances = beach.samples * beach.exceedanceRate;
  return (
    (exceedances + EXCEEDANCE_PRIOR_STRENGTH * islandMeanExceedance) /
    (beach.samples + EXCEEDANCE_PRIOR_STRENGTH)
  );
}

/**
 * Scale the island-wide model probability to one beach using that beach's real
 * historical exceedance rate as a relative-risk multiplier on the odds. The
 * only inputs are the model output and the historical data, so there is no
 * fabricated math and no runtime randomness.
 */
export function scaleProbabilityToBeach(
  islandProbability: number,
  beachExceedance: number,
  meanExceedance: number,
): number {
  const p = clamp(islandProbability, 0, 1);
  if (p <= 0 || p >= 1 || meanExceedance <= 0) return p;

  // Relative risk from history: how this beach compares to the island average.
  // Applied to the odds so the scaled probability always stays within (0, 1).
  const relativeRisk = beachExceedance / meanExceedance;
  const odds = (p / (1 - p)) * relativeRisk;
  return odds / (1 + odds);
}

/** Produce a prediction record for one beach from the island model signal. */
export function predictBeach(
  beach: Beach,
  islandProbability: number,
  meanExceedance: number,
): BeachPrediction {
  const smoothed = smoothedExceedance(beach, meanExceedance);
  const probability = scaleProbabilityToBeach(
    islandProbability,
    smoothed,
    meanExceedance,
  );
  return {
    beach,
    unsafeProbability: probability,
    safetyLevel: safetyFromProbability(probability),
    delta: probability - beach.exceedanceRate,
    limitedData: beach.samples < MIN_RELIABLE_SAMPLES,
  };
}

/**
 * Run the full island simulation for a scenario and return ranked predictions
 * plus aggregate safety counts for the dashboard panels.
 *
 * `islandProbability` is the unsafe probability returned by the backend model
 * for this scenario. It is scaled to each beach using that beach's real
 * historical exceedance rate; nothing here is mocked or randomized.
 */
export function runSimulation(
  scenario: RainfallScenario,
  beaches: Beach[],
  islandProbability: number,
): SimulationResult {
  const features = buildFeatures(scenario.rainfall7day, scenario.month);
  const meanExceedance =
    beaches.reduce((sum, beach) => sum + beach.exceedanceRate, 0) /
    beaches.length;

  const predictions = beaches.map((beach) =>
    predictBeach(beach, islandProbability, meanExceedance),
  );

  const byProbabilityDesc = [...predictions].sort(
    (a, b) => b.unsafeProbability - a.unsafeProbability,
  );

  const counts = predictions.reduce(
    (acc, prediction) => {
      acc[prediction.safetyLevel] += 1;
      return acc;
    },
    { safe: 0, caution: 0, unsafe: 0 } as Record<SafetyLevel, number>,
  );

  const averageProbability =
    predictions.reduce((total, p) => total + p.unsafeProbability, 0) /
    predictions.length;

  return {
    predictions,
    unsafeCount: counts.unsafe,
    cautionCount: counts.caution,
    safeCount: counts.safe,
    averageProbability,
    features,
    mostUnsafe: byProbabilityDesc.slice(0, 10),
    mostSafe: [...byProbabilityDesc].reverse().slice(0, 10),
  };
}
