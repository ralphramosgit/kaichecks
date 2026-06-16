"use client";

import { CloudRain, Droplets } from "lucide-react";

import { CollapsiblePanel } from "@/components/ui/CollapsiblePanel";
import { useSimulation } from "@/context/SimulationContext";
import { INTENSITY_PRESETS } from "@/lib/constants";
import { rainfallPressure } from "@/lib/simulation";
import { formatPercent } from "@/lib/utils";

import { IntensityPicker } from "./IntensityPicker";
import { RainfallDayBars } from "./RainfallDayBars";
import { MonthSelect } from "./MonthSelect";
import { RegionFocus } from "./RegionFocus";
import { SimulationActions } from "./SimulationActions";

/**
 * Top-left control panel. Collapses to a single row; expands to the storm
 * intensity preset, the editable seven-day rainfall pattern, season, storm
 * focus, a live runoff readout, and the run/reset actions. All edits update the
 * simulation immediately.
 */
export function RainfallControlPanel() {
  const {
    scenario,
    result,
    setIntensity,
    setRainfallDay,
    setMonth,
    setFocusRegion,
    rerun,
    resetScenario,
  } = useSimulation();

  const pressure = rainfallPressure(result.features);
  const intensityLabel =
    scenario.intensity === "custom"
      ? "Custom storm"
      : INTENSITY_PRESETS[scenario.intensity].label;

  return (
    <CollapsiblePanel
      className="w-[360px] max-w-[calc(100vw-2rem)]"
      delay={0.15}
      icon={<CloudRain className="h-5 w-5" />}
      title="Rainfall simulation"
      subtitle="Shape the storm and run the model"
      badge={
        <span className="rounded-full bg-ocean-50 px-2.5 py-1 text-[11px] font-semibold text-ocean-600 ring-1 ring-ocean-100">
          {intensityLabel}
        </span>
      }
    >
      <div className="scroll-island max-h-[calc(100vh-12rem)] space-y-5 overflow-y-auto px-5 py-4">
        <IntensityPicker value={scenario.intensity} onSelect={setIntensity} />

        <RainfallDayBars
          rainfall7day={scenario.rainfall7day}
          onChangeDay={setRainfallDay}
        />

        <MonthSelect month={scenario.month} onChange={setMonth} />

        <RegionFocus value={scenario.focusRegion} onChange={setFocusRegion} />

        {/* Live runoff readout. */}
        <div className="rounded-2xl bg-ocean-50/70 p-3 ring-1 ring-ocean-100">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ocean-700">
              <Droplets className="h-4 w-4 text-ocean-500" />
              Runoff load
            </span>
            <span className="text-xs font-bold tabular-nums text-ocean-700">
              {result.features.rain7day} mm / 7d
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ocean-300 to-ocean-600 transition-[width] duration-700"
              style={{ width: `${Math.round(pressure * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-ocean-600/80">
            Estimated runoff pressure {formatPercent(pressure)} of peak.
          </p>
        </div>

        <SimulationActions onRun={rerun} onReset={resetScenario} />
      </div>
    </CollapsiblePanel>
  );
}
