"use client";

import "leaflet/dist/leaflet.css";

import { MapContainer, Polygon, ZoomControl } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";

import { useSimulation } from "@/context/SimulationContext";
import { OAHU_OUTLINE } from "@/lib/oahu-outline";

import { BeachMarkers } from "./BeachMarkers";
import { HeatLayer } from "./HeatLayer";

const CENTER: LatLngExpression = [21.485, -157.965];
const MAX_BOUNDS: LatLngBoundsExpression = [
  [21.05, -158.6],
  [21.92, -157.35],
];

/**
 * The real, zoomable Oahu map. Drawn as an accurate coastline polygon on a
 * transparent Leaflet canvas (no tiles) so the silk water shader shows through
 * as the ocean. Carries the risk heatmap and all beach markers.
 */
export function OahuMap({ heatmapVisible }: { heatmapVisible: boolean }) {
  const { result } = useSimulation();

  return (
    <MapContainer
      center={CENTER}
      zoom={10.5}
      minZoom={9.75}
      maxZoom={14}
      zoomSnap={0.25}
      zoomDelta={0.5}
      maxBounds={MAX_BOUNDS}
      maxBoundsViscosity={1}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom
      className="kai-map h-full w-full"
    >
      {/* Sandy shoreline halo beneath the land for a soft coast edge. */}
      <Polygon
        positions={OAHU_OUTLINE}
        pathOptions={{
          color: "#EBD9B0",
          weight: 7,
          opacity: 0.65,
          fill: false,
          lineJoin: "round",
        }}
      />
      {/* The landmass. */}
      <Polygon
        positions={OAHU_OUTLINE}
        pathOptions={{
          color: "#CDB582",
          weight: 1.5,
          fillColor: "#9FC588",
          fillOpacity: 0.97,
          lineJoin: "round",
        }}
      />

      <HeatLayer predictions={result.predictions} visible={heatmapVisible} />
      <BeachMarkers />

      <ZoomControl position="bottomright" />
    </MapContainer>
  );
}
