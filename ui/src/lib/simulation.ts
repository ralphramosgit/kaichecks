import { BEACHES } from "@/lib/beaches";
import { BAV_THRESHOLD, SAFETY_THRESHOLDS } from "@/lib/constants";
import type {
  Beach,
  BeachPrediction,
  RainfallFeatures,
  RainfallScenario,
  SafetyLevel,
  SimulationResult,
} from "@/lib/types";
import { clamp, round, seededUnit } from "@/lib/utils";

/** Standard logistic function. */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

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

/**
 * Collapse the rainfall features into a single 0..1 "pressure" scalar that
 * weights the most recent rainfall most heavily, since enterococcus loads from
 * runoff wash out within a few days.
 */
export function rainfallPressure(features: RainfallFeatures): number {
  const { rain24hr, rain48hr, rain72hr, rain7day, daysSinceRain } = features;
  const priorDay = Math.max(0, rain48hr - rain24hr);
  const thirdDay = Math.max(0, rain72hr - rain48hr);
  const older = Math.max(0, rain7day - rain72hr);

  const weighted =
    1.0 * rain24hr + 0.8 * priorDay + 0.6 * thirdDay + 0.3 * older;
  const damped = weighted * Math.max(0, 1 - 0.06 * daysSinceRain);

  return clamp(sigmoid((damped - 38) / 16), 0, 1);
}

/** Returns true when the month falls in Oahu's wetter season. */
function isWetSeason(month: number): boolean {
  return month >= 11 || month <= 4;
}

/** Map a predicted unsafe probability to a discrete safety verdict. */
export function safetyFromProbability(probability: number): SafetyLevel {
  if (probability >= SAFETY_THRESHOLDS.unsafe) return "unsafe";
  if (probability >= SAFETY_THRESHOLDS.caution) return "caution";
  return "safe";
}

/**
 * How strongly a given beach reacts to rainfall. Higher historical exceedance
 * (often stream and canal mouths) reacts more; a small deterministic per-beach
 * factor adds believable variation without runtime randomness.
 */
function beachSensitivity(beach: Beach): number {
  const base = 0.35 + 1.2 * beach.exceedanceRate;
  const variation = 0.4 * seededUnit(`${beach.locationId}-sens`);
  return clamp(base + variation, 0.3, 1.35);
}

/** Convert an unsafe probability into an estimated enterococcus count. */
export function probabilityToEnterococcus(probability: number): number {
  return round(BAV_THRESHOLD * Math.exp(5 * (probability - 0.5)));
}

/**
 * Predict the unsafe probability for one beach under a rainfall pressure and
 * month. Exposed so the forecast can reuse the same response curve.
 */
export function predictProbability(
  beach: Beach,
  pressure: number,
  month: number,
): number {
  const baseline = beach.exceedanceRate;
  const sensitivity = beachSensitivity(beach);
  const seasonal = isWetSeason(month) ? 1.08 : 1;
  const jitter = (seededUnit(`${beach.locationId}-jit`) - 0.5) * 0.05;

  const lift = (1 - baseline) * sensitivity * clamp(pressure * seasonal, 0, 1);
  return clamp(baseline + lift + jitter, 0.005, 0.985);
}

/** Produce a full prediction record for one beach. */
export function predictBeach(
  beach: Beach,
  pressure: number,
  month: number,
): BeachPrediction {
  const probability = predictProbability(beach, pressure, month);
  return {
    beach,
    unsafeProbability: probability,
    safetyLevel: safetyFromProbability(probability),
    predictedEnterococcus: probabilityToEnterococcus(probability),
    delta: probability - beach.exceedanceRate,
  };
}

/**
 * Run the full island simulation for a scenario and return ranked predictions
 * plus aggregate safety counts for the dashboard panels.
 *
 * When `modelSignal` is provided (the unsafe probability from the backend
 * model), it drives the island-wide pressure used to distribute per-beach
 * predictions. When omitted, the local rainfall-pressure heuristic is used so
 * the app still works offline.
 */
export function runSimulation(
  scenario: RainfallScenario,
  beaches: Beach[] = BEACHES,
  modelSignal: number | null = null,
): SimulationResult {
  const features = buildFeatures(scenario.rainfall7day, scenario.month);
  const pressure = modelSignal ?? rainfallPressure(features);

  const predictions = beaches.map((beach) =>
    predictBeach(beach, pressure, scenario.month),
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
