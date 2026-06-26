"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BAV_THRESHOLD } from "@/lib/constants";

/** Raw shape of /data/beach_timeseries.json: locationId -> [date, cfu] pairs. */
type TimeseriesFile = Record<string, [string, number][]>;

/** One charted reading: epoch milliseconds on x, bacteria count on y. */
interface CfuPoint {
  t: number;
  cfu: number;
}

// Module-level cache so the ~860KB history file is fetched once per session and
// shared across every beach the user opens, instead of re-downloading per modal.
let timeseriesCache: Promise<TimeseriesFile> | null = null;

function loadTimeseries(): Promise<TimeseriesFile> {
  if (!timeseriesCache) {
    timeseriesCache = fetch("/data/beach_timeseries.json").then((res) => {
      if (!res.ok) throw new Error(`Failed to load history (${res.status})`);
      return res.json() as Promise<TimeseriesFile>;
    });
  }
  return timeseriesCache;
}

/** Whole-year tick marks spanning the data range, thinned to ~6 labels. */
function yearTicks(points: CfuPoint[]): number[] {
  if (points.length === 0) return [];
  const startYear = new Date(points[0].t).getUTCFullYear();
  const endYear = new Date(points[points.length - 1].t).getUTCFullYear();
  const span = endYear - startYear;
  const step = Math.max(1, Math.ceil(span / 6));
  const ticks: number[] = [];
  for (let y = startYear; y <= endYear; y += step) {
    ticks.push(Date.UTC(y, 0, 1));
  }
  return ticks;
}

/**
 * Historical bacteria (enterococcus) readings for one beach plotted over time,
 * with the EPA safe limit drawn as a red dotted line. The area sweeps in from
 * the left on open. A log y-axis keeps the 130 limit readable even though a few
 * storm spikes reach into the thousands.
 */
export function BeachCfuChart({ locationId }: { locationId: string }) {
  const [file, setFile] = useState<TimeseriesFile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadTimeseries()
      .then((data) => {
        if (!cancelled) setFile(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const points = useMemo<CfuPoint[]>(() => {
    const raw = file?.[locationId];
    if (!raw) return [];
    return raw
      .map(([date, cfu]) => ({
        t: Date.parse(date),
        // Clamp to 1 so the log scale (which has no zero) can render every point.
        cfu: Math.max(1, cfu),
      }))
      .filter((p) => !Number.isNaN(p.t));
  }, [file, locationId]);

  const ticks = useMemo(() => yearTicks(points), [points]);

  const exceedances = useMemo(
    () => points.filter((p) => p.cfu > BAV_THRESHOLD).length,
    [points],
  );

  if (error) return null;

  return (
    <div className="rounded-2xl bg-ocean-50/60 p-3 ring-1 ring-ocean-100">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ocean-600">
          Bacteria history
        </h3>
        <span className="text-[10px] text-ocean-400">
          enterococcus CFU/100mL · log scale
        </span>
      </div>

      {!file ? (
        <div className="flex h-[210px] items-center justify-center text-xs text-ocean-400">
          Loading history…
        </div>
      ) : points.length === 0 ? (
        <div className="flex h-[210px] items-center justify-center text-xs text-ocean-400">
          No historical readings for this beach.
        </div>
      ) : (
        <>
          {/* key remounts the chart per beach so the sweep-in animation replays. */}
          <ResponsiveContainer width="100%" height={210} key={locationId}>
            <AreaChart
              data={points}
              margin={{ top: 6, right: 10, bottom: 2, left: -6 }}
            >
              <defs>
                <linearGradient id="cfuFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3FA8D4" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3FA8D4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#DCEFF7"
                vertical={false}
              />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                ticks={ticks}
                tickFormatter={(t) => String(new Date(t).getUTCFullYear())}
                tick={{ fontSize: 10, fill: "#6FC4E4" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                scale="log"
                domain={[1, "dataMax"]}
                allowDataOverflow
                ticks={[1, 10, 100, 1000, 10000]}
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
                tick={{ fontSize: 10, fill: "#6FC4E4" }}
                width={36}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                labelFormatter={(t) =>
                  new Date(t as number).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })
                }
                formatter={(v: number) => [
                  `${Math.round(v).toLocaleString()} CFU`,
                  "Bacteria",
                ]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #A2DBEF",
                }}
              />
              <ReferenceLine
                y={BAV_THRESHOLD}
                stroke="#DD5C3C"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{
                  value: `Safe limit ${BAV_THRESHOLD}`,
                  position: "insideTopRight",
                  fill: "#DD5C3C",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
              <Area
                type="monotone"
                dataKey="cfu"
                stroke="#1E7FA8"
                strokeWidth={1.5}
                fill="url(#cfuFill)"
                dot={false}
                isAnimationActive
                animationDuration={1600}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="mt-1 px-1 text-[11px] text-ocean-500/90">
            {points.length.toLocaleString()} readings ·{" "}
            <span className="font-semibold text-coral-600">{exceedances}</span>{" "}
            above the safe limit
          </p>
        </>
      )}
    </div>
  );
}
