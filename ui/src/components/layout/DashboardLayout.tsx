"use client";

import { SafetyListPanel } from "@/components/beaches/SafetyListPanel";
import { RainfallControlPanel } from "@/components/controls/RainfallControlPanel";
import { LoadingScreen } from "@/components/loading/LoadingScreen";
import { BeachDetailModal } from "@/components/modal/BeachDetailModal";
import { MapStage } from "@/components/map/MapStage";
import { DataResultsPanel } from "@/components/results/DataResultsPanel";
import { useSimulation } from "@/context/SimulationContext";

import { AppHeader } from "./AppHeader";
import { DashboardError } from "./DashboardError";

/**
 * Dashboard composition: the Oahu map fills the stage as a living backdrop with
 * floating glass panels arranged around it. The rainfall controls sit top-left,
 * the safety rankings and data results stack on the right, and the beach detail
 * modal mounts above everything.
 */
export function DashboardLayout({ onRestart }: { onRestart: () => void }) {
  const { apiStatus, result, retry } = useSimulation();

  // No mock fallback: surface backend failures, and hold the loading screen
  // until the first real result lands.
  if (apiStatus === "error") {
    return <DashboardError onRetry={retry} onRestart={onRestart} />;
  }
  if (result.predictions.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Living map backdrop. `isolate` keeps the pins' z-indices scoped to
          this layer so they never paint over the floating panels. */}
      <div className="absolute inset-0 isolate">
        <MapStage />
      </div>

      <AppHeader onRestart={onRestart} />

      {/* Floating panel overlay. Lets the map show through the center gap on
          large screens; stacks into a scrollable column on small screens. */}
      <div className="scroll-island pointer-events-auto absolute inset-0 z-10 overflow-y-auto px-4 pb-4 pt-16 lg:pointer-events-none">
        <div className="flex min-h-full flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="pointer-events-auto shrink-0">
            <RainfallControlPanel />
          </div>

          <div className="pointer-events-auto flex shrink-0 flex-col gap-4 lg:max-h-[calc(100vh-80px)] lg:overflow-y-auto lg:pr-1 scroll-island">
            <SafetyListPanel />
            <DataResultsPanel />
          </div>
        </div>
      </div>

      <BeachDetailModal />
    </div>
  );
}
