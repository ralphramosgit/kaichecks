"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet.heat";
import { useMap } from "react-leaflet";

import type { BeachPrediction } from "@/lib/types";

interface HeatLayerProps {
  predictions: BeachPrediction[];
  visible: boolean;
}

/** Name of the dedicated pane that paints the heatmap above the landmass. */
const HEAT_PANE = "kai-heat-pane";

/**
 * Risk heatmap drawn directly on the map with leaflet.heat. Each beach
 * contributes a point weighted by its unsafe probability; the gradient runs
 * green (safe) to amber to red (unsafe) so risk reads as color on the coast.
 *
 * The heat canvas lives in a dedicated pane stacked above the island fill so
 * the colors land on the land, not behind it.
 */
export function HeatLayer({ predictions, visible }: HeatLayerProps) {
  const map = useMap();

  // Create the heat pane once, sitting above the overlay (polygon) pane.
  useEffect(() => {
    if (!map.getPane(HEAT_PANE)) {
      const pane = map.createPane(HEAT_PANE);
      pane.style.zIndex = "450";
      pane.style.pointerEvents = "none";
      pane.style.mixBlendMode = "multiply";
    }
  }, [map]);

  useEffect(() => {
    if (!visible) return;

    const points: [number, number, number][] = predictions.map((p) => [
      p.beach.latitude,
      p.beach.longitude,
      // Floor the weight so even safe beaches register faintly on the map.
      0.25 + p.unsafeProbability * 0.75,
    ]);

    const layer = L.heatLayer(points, {
      pane: HEAT_PANE,
      radius: 40,
      blur: 28,
      max: 1,
      minOpacity: 0.4,
      gradient: {
        0.2: "#5E9047",
        0.45: "#9FC588",
        0.6: "#D9A23A",
        0.8: "#DD5C3C",
        1.0: "#B23A22",
      },
    });

    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, predictions, visible]);

  return null;
}
