"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { fetchBeaches, predictScenario } from "@/lib/api";
import { INTENSITY_PRESETS } from "@/lib/constants";
import { buildFeatures, runSimulation } from "@/lib/simulation";
import type {
  Beach,
  BeachPrediction,
  RainfallScenario,
  Region,
  SimulationResult,
  StormIntensity,
} from "@/lib/types";
import { clamp } from "@/lib/utils";

/**
 * Backend connection state. The app never falls back to mock data: until the
 * model responds we are "loading", and any failure surfaces as "error".
 */
export type ApiStatus = "loading" | "ready" | "error";

interface SimulationContextValue {
  scenario: RainfallScenario;
  result: SimulationResult;
  /** Increments each time a fresh run is committed; drives panel re-animation. */
  runId: number;
  /** Backend connection state; drives the loading and error screens. */
  apiStatus: ApiStatus;
  /** Number of beaches in the live backend catalog (0 until it loads). */
  beachCount: number;
  selectedBeachId: string | null;
  selectedPrediction: BeachPrediction | null;
  hoveredBeachId: string | null;
  setIntensity: (intensity: StormIntensity) => void;
  setMonth: (month: number) => void;
  setFocusRegion: (region: Region | "island-wide") => void;
  setRainfallDay: (dayIndex: number, millimeters: number) => void;
  selectBeach: (beachId: string | null) => void;
  hoverBeach: (beachId: string | null) => void;
  resetScenario: () => void;
  rerun: () => void;
  /** Re-attempt the backend calls after an error. */
  retry: () => void;
}

const DEFAULT_SCENARIO: RainfallScenario = {
  rainfall7day: [...INTENSITY_PRESETS.moderate.pattern],
  month: 2,
  focusRegion: "island-wide",
  intensity: "moderate",
};

/**
 * Empty placeholder result used only before the first backend response. It is
 * never rendered: the dashboard shows the loading screen until real data
 * arrives, so no fabricated numbers ever reach the UI.
 */
const EMPTY_RESULT: SimulationResult = {
  predictions: [],
  unsafeCount: 0,
  cautionCount: 0,
  safeCount: 0,
  averageProbability: 0,
  features: buildFeatures(
    DEFAULT_SCENARIO.rainfall7day,
    DEFAULT_SCENARIO.month,
  ),
  mostUnsafe: [],
  mostSafe: [],
};

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<RainfallScenario>(DEFAULT_SCENARIO);
  const [beaches, setBeaches] = useState<Beach[]>([]);
  const [result, setResult] = useState<SimulationResult>(EMPTY_RESULT);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("loading");
  const [selectedBeachId, setSelectedBeachId] = useState<string | null>(null);
  const [hoveredBeachId, setHoveredBeachId] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // Load the real beach catalog from the backend. There is no bundled fallback:
  // if the API is unreachable the dashboard shows an error instead of mock data.
  useEffect(() => {
    const controller = new AbortController();
    fetchBeaches(controller.signal)
      .then((live) => setBeaches(live))
      .catch(() => {
        if (!controller.signal.aborted) setApiStatus("error");
      });
    return () => controller.abort();
  }, [reloadKey]);

  // Run the model on every scenario or catalog change. The backend supplies the
  // island probability; any failure surfaces as an error with no fabricated
  // fallback. The previous real result stays visible while a new one loads.
  useEffect(() => {
    if (beaches.length === 0) return;

    const controller = new AbortController();
    setApiStatus("loading");

    predictScenario(scenario.rainfall7day, scenario.month, controller.signal)
      .then((prediction) => {
        setResult(
          runSimulation(scenario, beaches, prediction.unsafeProbability),
        );
        setApiStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setApiStatus("error");
      });

    return () => controller.abort();
  }, [scenario, beaches, reloadKey]);

  const setIntensity = useCallback((intensity: StormIntensity) => {
    setScenario((prev) => ({
      ...prev,
      intensity,
      rainfall7day: [...INTENSITY_PRESETS[intensity].pattern],
    }));
    setRunId((id) => id + 1);
  }, []);

  const setMonth = useCallback((month: number) => {
    setScenario((prev) => ({ ...prev, month: clamp(month, 1, 12) }));
    setRunId((id) => id + 1);
  }, []);

  const setFocusRegion = useCallback((focusRegion: Region | "island-wide") => {
    setScenario((prev) => ({ ...prev, focusRegion }));
    setRunId((id) => id + 1);
  }, []);

  const setRainfallDay = useCallback(
    (dayIndex: number, millimeters: number) => {
      setScenario((prev) => {
        const next = [...prev.rainfall7day];
        next[dayIndex] = clamp(Math.round(millimeters), 0, 120);
        return { ...prev, rainfall7day: next, intensity: "custom" };
      });
      setRunId((id) => id + 1);
    },
    [],
  );

  const selectBeach = useCallback((beachId: string | null) => {
    setSelectedBeachId(beachId);
  }, []);

  const hoverBeach = useCallback((beachId: string | null) => {
    setHoveredBeachId(beachId);
  }, []);

  const resetScenario = useCallback(() => {
    setScenario(DEFAULT_SCENARIO);
    setSelectedBeachId(null);
    setRunId((id) => id + 1);
  }, []);

  const rerun = useCallback(() => {
    setSelectedBeachId(null);
    setRunId((id) => id + 1);
  }, []);

  const retry = useCallback(() => {
    setApiStatus("loading");
    setReloadKey((key) => key + 1);
  }, []);

  const selectedPrediction = useMemo(
    () =>
      selectedBeachId
        ? (result.predictions.find(
            (prediction) => prediction.beach.locationId === selectedBeachId,
          ) ?? null)
        : null,
    [result.predictions, selectedBeachId],
  );

  const value = useMemo<SimulationContextValue>(
    () => ({
      scenario,
      result,
      runId,
      apiStatus,
      beachCount: beaches.length,
      selectedBeachId,
      selectedPrediction,
      hoveredBeachId,
      setIntensity,
      setMonth,
      setFocusRegion,
      setRainfallDay,
      selectBeach,
      hoverBeach,
      resetScenario,
      rerun,
      retry,
    }),
    [
      scenario,
      result,
      runId,
      apiStatus,
      beaches.length,
      selectedBeachId,
      selectedPrediction,
      hoveredBeachId,
      setIntensity,
      setMonth,
      setFocusRegion,
      setRainfallDay,
      selectBeach,
      hoverBeach,
      resetScenario,
      rerun,
      retry,
    ],
  );

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

/** Access the simulation state. Must be used inside SimulationProvider. */
export function useSimulation(): SimulationContextValue {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
}
