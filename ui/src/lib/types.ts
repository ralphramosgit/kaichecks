/** Shared domain types for the Kaichecks frontend. */

/** A monitored Oahu beach location with historical context. */
export interface Beach {
  locationId: string;
  name: string;
  /** Coastal region grouping used for filtering and color coding. */
  region: Region;
  latitude: number;
  longitude: number;
  /** Number of historical water samples behind this location. */
  samples: number;
  /** Historical share of samples that exceeded the BAV (0..1). */
  exceedanceRate: number;
  nearestStationId: string | null;
}

/** Coastal region groupings around Oahu. */
export type Region = "north-shore" | "windward" | "south-shore" | "leeward";

/** Discrete water-safety verdict derived from predicted probability. */
export type SafetyLevel = "safe" | "caution" | "unsafe";

/** Engineered antecedent-rainfall features the model consumes. */
export interface RainfallFeatures {
  rain24hr: number;
  rain48hr: number;
  rain72hr: number;
  rain7day: number;
  daysSinceRain: number;
  maxRain3day: number;
  month: number;
}

/** A rainfall scenario the user configures in the control panel. */
export interface RainfallScenario {
  /** Seven daily totals in millimeters, oldest first and newest last. */
  rainfall7day: number[];
  /** Calendar month, 1 to 12. */
  month: number;
  /** Region the simulated storm is centered on, or all of Oahu. */
  focusRegion: Region | "island-wide";
  /** Active preset, or "custom" when daily values were edited by hand. */
  intensity: StormIntensity | "custom";
}

export type StormIntensity = "dry" | "light" | "moderate" | "heavy" | "storm";

/**
 * A single beach prediction. The unsafe probability is the backend model's
 * island-wide output scaled to this beach by its real historical exceedance
 * rate; nothing here is mocked.
 */
export interface BeachPrediction {
  beach: Beach;
  unsafeProbability: number;
  safetyLevel: SafetyLevel;
  /** Change in probability versus the beach's historical exceedance (-1..1). */
  delta: number;
  /** True when the beach has too few historical samples to be reliable. */
  limitedData: boolean;
}

/** Aggregate results for the whole island under the active scenario. */
export interface SimulationResult {
  predictions: BeachPrediction[];
  unsafeCount: number;
  cautionCount: number;
  safeCount: number;
  averageProbability: number;
  features: RainfallFeatures;
  mostUnsafe: BeachPrediction[];
  mostSafe: BeachPrediction[];
}

/** Lifecycle phases that gate the experience. */
export type AppPhase = "loading" | "intro" | "dashboard";
