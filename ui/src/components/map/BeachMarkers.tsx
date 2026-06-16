"use client";

import { useMemo } from "react";
import L from "leaflet";
import { Marker, Tooltip } from "react-leaflet";

import { useSimulation } from "@/context/SimulationContext";
import { SAFETY_META } from "@/lib/constants";
import type { BeachPrediction, SafetyLevel } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

function umbrellaSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12a10.06 10.06 0 0 0-20 0Z"/><path d="M12 12v8a2 2 0 0 0 4 0"/><path d="M12 2v1"/></svg>`;
}

function makeIcon(
  level: SafetyLevel,
  active: boolean,
  dimmed: boolean,
): L.DivIcon {
  const hex = SAFETY_META[level].hex;
  const ripple =
    level === "unsafe" && !dimmed ? '<span class="kai-ripple"></span>' : "";
  const html = `<div class="kai-pin${active ? " is-active" : ""}${
    dimmed ? " is-dim" : ""
  }" style="--pin:${hex}">${ripple}<span class="kai-pin-dot">${umbrellaSvg(
    hex,
  )}</span></div>`;

  return L.divIcon({
    html,
    className: "kai-pin-wrap",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/** Interactive beach markers layered on the map, wired to simulation state. */
export function BeachMarkers() {
  const { result, scenario, selectedBeachId, selectBeach, hoverBeach } =
    useSimulation();

  // Recreate icons only when the relevant state actually changes. Hover is
  // handled by CSS (:hover) so the markers stay mounted and tooltips do not
  // get orphaned when the user moves between pins.
  const markers = useMemo(
    () =>
      result.predictions.map((prediction: BeachPrediction) => {
        const { locationId, region, latitude, longitude, name } =
          prediction.beach;
        const focused =
          scenario.focusRegion === "island-wide" ||
          scenario.focusRegion === region;
        const active = selectedBeachId === locationId;
        return {
          locationId,
          name,
          latitude,
          longitude,
          probability: prediction.unsafeProbability,
          icon: makeIcon(prediction.safetyLevel, active, !focused),
          active,
        };
      }),
    [result.predictions, scenario.focusRegion, selectedBeachId],
  );

  return (
    <>
      {markers.map((marker) => (
        <Marker
          key={marker.locationId}
          position={[marker.latitude, marker.longitude]}
          icon={marker.icon}
          zIndexOffset={marker.active ? 1000 : 0}
          eventHandlers={{
            click: () => selectBeach(marker.locationId),
            mouseover: () => hoverBeach(marker.locationId),
            mouseout: () => hoverBeach(null),
          }}
        >
          <Tooltip direction="top" offset={[0, -14]} opacity={1} sticky={false}>
            <span className="kai-tooltip">
              {marker.name}
              <span className="kai-tooltip-pct">
                {formatPercent(marker.probability)}
              </span>
            </span>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
