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
import { BEACHES } from "@/lib/beaches";
import { INTENSITY_PRESETS } from "@/lib/constants";
import { generateForecast } from "@/lib/forecast";
import { runSimulation } from "@/lib/simulation";
import type {
  Beach,
  BeachPrediction,
  ForecastDay,
  RainfallScenario,
  Region,
  SimulationResult,
  StormIntensity,
} from "@/lib/types";
import { clamp } from "@/lib/utils";

/** Whether the live backend model is driving results, or the local fallback. */
export type ApiStatus = "local" | "loading" | "live" | "error";

interface SimulationContextValue {
  scenario: RainfallScenario;
  result: SimulationResult;
  /** Increments each time a fresh run is committed; drives panel re-animation. */
  runId: number;
  /** Whether the live backend model is driving results, or the local fallback. */
  apiStatus: ApiStatus;
  selectedBeachId: string | null;
  selectedPrediction: BeachPrediction | null;
  selectedForecast: ForecastDay[] | null;
  hoveredBeachId: string | null;
  setIntensity: (intensity: StormIntensity) => void;
  setMonth: (month: number) => void;
  setFocusRegion: (region: Region | "island-wide") => void;
  setRainfallDay: (dayIndex: number, millimeters: number) => void;
  selectBeach: (beachId: string | null) => void;
  hoverBeach: (beachId: string | null) => void;
  resetScenario: () => void;
  rerun: () => void;
}

const DEFAULT_SCENARIO: RainfallScenario = {
  rainfall7day: [...INTENSITY_PRESETS.moderate.pattern],
  month: 2,
  focusRegion: "island-wide",
  intensity: "moderate",
};

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<RainfallScenario>(DEFAULT_SCENARIO);
  const [beaches, setBeaches] = useState<Beach[]>(BEACHES);
  const [result, setResult] = useState<SimulationResult>(() =>
    runSimulation(DEFAULT_SCENARIO),
  );
  const [apiStatus, setApiStatus] = useState<ApiStatus>("local");
  const [selectedBeachId, setSelectedBeachId] = useState<string | null>(null);
  const [hoveredBeachId, setHoveredBeachId] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);

  // Load the real beach catalog from the backend once. Silently keeps the
  // bundled catalog if the API is unreachable.
  useEffect(() => {
    const controller = new AbortController();
    fetchBeaches(controller.signal)
      .then((live) => {
        if (live.length) setBeaches(live);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Recompute on every scenario or catalog change. The backend model supplies
  // the island signal; on any failure we fall back to the local mock model so
  // the app keeps working offline.
  useEffect(() => {
    const controller = new AbortController();
    setApiStatus("loading");

    predictScenario(scenario.rainfall7day, scenario.month, controller.signal)
      .then((prediction) => {
        setResult(
          runSimulation(scenario, beaches, prediction.unsafeProbability),
        );
        setApiStatus("live");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResult(runSimulation(scenario, beaches));
        setApiStatus("error");
      });

    return () => controller.abort();
  }, [scenario, beaches]);

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

  const selectedPrediction = useMemo(
    () =>
      selectedBeachId
        ? (result.predictions.find(
            (prediction) => prediction.beach.locationId === selectedBeachId,
          ) ?? null)
        : null,
    [result.predictions, selectedBeachId],
  );

  const selectedForecast = useMemo(
    () =>
      selectedPrediction
        ? generateForecast(selectedPrediction.beach, scenario)
        : null,
    [selectedPrediction, scenario],
  );

  const value = useMemo<SimulationContextValue>(
    () => ({
      scenario,
      result,
      runId,
      apiStatus,
      selectedBeachId,
      selectedPrediction,
      selectedForecast,
      hoveredBeachId,
      setIntensity,
      setMonth,
      setFocusRegion,
      setRainfallDay,
      selectBeach,
      hoverBeach,
      resetScenario,
      rerun,
    }),
    [
      scenario,
      result,
      runId,
      apiStatus,
      selectedBeachId,
      selectedPrediction,
      selectedForecast,
      hoveredBeachId,
      setIntensity,
      setMonth,
      setFocusRegion,
      setRainfallDay,
      selectBeach,
      hoverBeach,
      resetScenario,
      rerun,
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
