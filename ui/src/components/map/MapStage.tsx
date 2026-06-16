"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Navigation } from "lucide-react";

import { SilkBackground } from "@/components/ui/SilkBackground";
import { WaveSpinner } from "@/components/ui/WaveSpinner";

import { MapLegend } from "./MapLegend";

/**
 * Central map stage: the silky water shader as the ocean, the real Oahu map
 * floating on top, and a legend with the heatmap toggle. The Leaflet map is
 * client only, so it is loaded dynamically with a themed placeholder.
 */
const OahuMap = dynamic(() => import("./OahuMap").then((m) => m.OahuMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <WaveSpinner />
    </div>
  ),
});

export function MapStage() {
  const [heatmapVisible, setHeatmapVisible] = useState(false);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <SilkBackground />

      <div className="absolute inset-0">
        <OahuMap heatmapVisible={heatmapVisible} />
      </div>

      {/* Island label. */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-[500] -translate-x-1/2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-ocean-700/80 backdrop-blur-sm">
          <Navigation className="h-3 w-3" />
          Oahu
        </span>
      </div>

      {/* Legend with heatmap toggle, pinned lower center. */}
      <div className="absolute bottom-5 left-1/2 z-[500] -translate-x-1/2">
        <MapLegend
          heatmapVisible={heatmapVisible}
          onToggleHeatmap={() => setHeatmapVisible((value) => !value)}
        />
      </div>

      {/* Map data credit (coastline derived from OpenStreetMap, ODbL). */}
      <div className="pointer-events-none absolute bottom-1.5 right-2 z-[500] text-[10px] font-medium text-ocean-800/45">
        Coastline &copy; OpenStreetMap
      </div>
    </div>
  );
}
