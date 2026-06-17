"use client";

import { CloudRain, CalendarDays, Home, Waves } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useSimulation } from "@/context/SimulationContext";
import { INTENSITY_PRESETS, MONTHS } from "@/lib/constants";

/** Top application bar for the dashboard: brand, live scenario, restart. */
export function AppHeader({ onRestart }: { onRestart: () => void }) {
  const { scenario } = useSimulation();
  const intensityLabel =
    scenario.intensity === "custom"
      ? "Custom storm"
      : INTENSITY_PRESETS[scenario.intensity].label;

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-4 py-3">
      <div className="glass-panel pointer-events-auto flex items-center gap-2.5 rounded-2xl px-3.5 py-2 shadow-panel-sm">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ocean-500 text-white">
          <Waves className="h-4.5 w-4.5" />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight text-ocean-800">
            Kaichecks
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-ocean-500">
            Beach water safety
          </div>
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <div className="glass-panel hidden items-center gap-3 rounded-2xl px-3.5 py-2 shadow-panel-sm sm:flex">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ocean-700">
            <CloudRain className="h-3.5 w-3.5 text-ocean-500" />
            {intensityLabel}
          </span>
          <span className="h-3.5 w-px bg-ocean-100" />
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ocean-700">
            <CalendarDays className="h-3.5 w-3.5 text-sage-500" />
            {MONTHS[scenario.month - 1]}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRestart}
          leadingIcon={<Home className="h-4 w-4" />}
        >
          Intro
        </Button>
      </div>
    </header>
  );
}
