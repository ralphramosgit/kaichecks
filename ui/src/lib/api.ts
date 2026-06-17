import { BEACHES } from "@/lib/beaches";
import type { Beach, Region } from "@/lib/types";

const DEFAULT_BASE_URL = "http://localhost:8000";

/** Base URL of the FastAPI backend. Override with NEXT_PUBLIC_API_BASE_URL. */
export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || DEFAULT_BASE_URL
  );
}

// The /beaches endpoint does not return a region grouping, so reuse the region
// from the bundled catalog (keyed by id) and fall back to a coordinate guess.
const REGION_BY_ID = new Map(BEACHES.map((b) => [b.locationId, b.region]));

function regionFromCoords(lat: number, lon: number): Region {
  if (lon >= -157.84) return "windward"; // Kailua, Waimanalo, Kaneohe
  if (lat >= 21.55) return "north-shore"; // Haleiwa, Sunset
  if (lon <= -158.05) return "leeward"; // Waianae, Makaha
  return "south-shore"; // Honolulu, Waikiki, Ewa
}

/** Normalized prediction returned by POST /predict. */
export interface ApiPrediction {
  unsafeProbability: number;
  unsafe: boolean;
  predictedEnterococcus: number;
  bavThreshold: number;
  featuresUsed: Record<string, number>;
}

interface RawBeach {
  location_id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  samples: number;
  exceedance_rate: number;
  nearest_station_id: string | null;
}

/** GET /beaches -> the Oahu catalog, mapped to the frontend Beach shape. */
export async function fetchBeaches(signal?: AbortSignal): Promise<Beach[]> {
  const res = await fetch(`${getApiBaseUrl()}/beaches`, { signal });
  if (!res.ok) throw new Error(`GET /beaches failed: ${res.status}`);
  const raw: RawBeach[] = await res.json();

  return raw.map((b) => ({
    locationId: b.location_id,
    name: b.location_name,
    region:
      REGION_BY_ID.get(b.location_id) ??
      regionFromCoords(b.latitude, b.longitude),
    latitude: b.latitude,
    longitude: b.longitude,
    samples: b.samples,
    exceedanceRate: b.exceedance_rate,
    nearestStationId: b.nearest_station_id ?? null,
  }));
}

/** POST /predict -> the model's island-wide verdict for a rainfall scenario. */
export async function predictScenario(
  rainfall7day: number[],
  month: number,
  signal?: AbortSignal,
): Promise<ApiPrediction> {
  const res = await fetch(`${getApiBaseUrl()}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rainfall_7day: rainfall7day, month }),
    signal,
  });
  if (!res.ok) throw new Error(`POST /predict failed: ${res.status}`);
  const d = await res.json();

  return {
    unsafeProbability: d.unsafe_probability,
    unsafe: d.unsafe,
    predictedEnterococcus: d.predicted_enterococcus_cfu,
    bavThreshold: d.bav_threshold,
    featuresUsed: d.features_used,
  };
}
