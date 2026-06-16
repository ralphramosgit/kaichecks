import type { Region, SafetyLevel, StormIntensity } from "@/lib/types";

/** EPA Beach Action Value for enterococcus (CFU per 100 mL). */
export const BAV_THRESHOLD = 130;

/** Probability cut points that map a prediction to a safety verdict. */
export const SAFETY_THRESHOLDS = {
  unsafe: 0.5,
  caution: 0.25,
} as const;

/**
 * Geographic bounding box used to project lat/lon onto the stylized map.
 * Padded slightly beyond the real beach extents so coastal pins sit inland
 * of the map edges.
 */
export const OAHU_BOUNDS = {
  latMin: 21.24,
  latMax: 21.72,
  lonMin: -158.29,
  lonMax: -157.63,
} as const;

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const REGION_LABELS: Record<Region, string> = {
  "north-shore": "North Shore",
  windward: "Windward",
  "south-shore": "South Shore",
  leeward: "Leeward",
};

export const REGION_ORDER: Region[] = [
  "north-shore",
  "windward",
  "south-shore",
  "leeward",
];

export const SAFETY_META: Record<
  SafetyLevel,
  { label: string; tone: string; hex: string }
> = {
  safe: { label: "Safe to swim", tone: "sage", hex: "#5E9047" },
  caution: { label: "Use caution", tone: "caution", hex: "#D9A23A" },
  unsafe: { label: "Unsafe", tone: "coral", hex: "#DD5C3C" },
};

/**
 * Storm intensity presets. Each defines a seven-day rainfall shape in mm
 * (oldest first, newest last) used as a starting point in the control panel.
 */
export const INTENSITY_PRESETS: Record<
  StormIntensity,
  { label: string; description: string; pattern: number[] }
> = {
  dry: {
    label: "Dry spell",
    description: "Little to no rain across the week.",
    pattern: [0, 0, 0, 0, 0, 0, 0],
  },
  light: {
    label: "Light showers",
    description: "Passing trade-wind showers.",
    pattern: [1, 0, 2, 1, 0, 3, 2],
  },
  moderate: {
    label: "Moderate rain",
    description: "A wet few days building up.",
    pattern: [4, 6, 3, 8, 5, 10, 7],
  },
  heavy: {
    label: "Heavy rain",
    description: "Sustained heavy rainfall.",
    pattern: [10, 14, 9, 18, 22, 16, 24],
  },
  storm: {
    label: "Severe storm",
    description: "Major storm with intense recent downpours.",
    pattern: [18, 26, 22, 30, 38, 44, 52],
  },
};

export const INTENSITY_ORDER: StormIntensity[] = [
  "dry",
  "light",
  "moderate",
  "heavy",
  "storm",
];
