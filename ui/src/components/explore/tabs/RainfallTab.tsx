"use client";

import { CloudRain, CheckCircle, AlertTriangle, Info, Download } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { useJsonData } from "@/hooks/useJsonData";

interface RainfallSummary {
  summary: {
    clean_stations: number;
    clean_rows: number;
    date_range: { start: string; end: string };
  };
  season_split: {
    wet_avg_mm: number;
    dry_avg_mm: number;
    wet_months: string;
    dry_months: string;
  };
  monthly_island: { month: number; month_label: string; avg_mm: number }[];
  yearly: { year: number; avg_mm: number }[];
  stations: {
    station_id: string;
    station_name: string;
    lat: number;
    lon: number;
    elevation_m: number;
    days: number;
    avg_mm: number;
    max_mm: number;
  }[];
  top_wettest_stations: {
    station_id: string;
    station_name: string;
    avg_mm: number;
    elevation_m: number;
  }[];
}

interface PipelineStepProps {
  num: number;
  title: string;
  file: string;
  rows: string;
  entities: string;
  description: string;
  last?: boolean;
}

function PipelineStep({ num, title, file, rows, entities, description, last }: PipelineStepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ocean-500 text-sm font-bold text-white">
          {num}
        </div>
        {!last && <div className="mt-1 w-0.5 flex-1 bg-ocean-100" />}
      </div>
      <div className={last ? "pb-0" : "pb-8"}>
        <p className="text-sm font-bold text-ocean-800">{title}</p>
        <code className="mt-0.5 block text-xs text-ocean-400">{file}</code>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-ocean-50 px-2.5 py-0.5 text-[11px] font-semibold text-ocean-600 ring-1 ring-ocean-100">
            {rows}
          </span>
          <span className="rounded-full bg-sage-50 px-2.5 py-0.5 text-[11px] font-semibold text-sage-600 ring-1 ring-sage-100">
            {entities}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ocean-600">{description}</p>
      </div>
    </div>
  );
}

interface CleaningRuleProps {
  icon: React.ReactNode;
  title: string;
  detail: string;
  type: "removed" | "kept" | "note";
}

function CleaningRule({ icon, title, detail, type }: CleaningRuleProps) {
  const colors = {
    removed: "bg-coral-100 text-coral-600 ring-coral-200",
    kept: "bg-sage-50 text-sage-600 ring-sage-200",
    note: "bg-ocean-50 text-ocean-600 ring-ocean-100",
  };
  return (
    <div className={`flex gap-3 rounded-xl p-3 ring-1 ${colors[type]}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-xs opacity-80">{detail}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ocean-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-ocean-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ocean-800">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ocean-500">{sub}</p>}
    </div>
  );
}

export function RainfallTab() {
  const { data, loading } = useJsonData<RainfallSummary>("/data/rainfall_summary.json");

  const s3Base = process.env.NEXT_PUBLIC_DATA_S3_URL;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ocean-100 text-ocean-600">
            <CloudRain className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-ocean-900">Rainfall Dataset</h1>
            <p className="text-sm text-ocean-500">
              HCDP daily rainfall · 175 raw → 165 clean stations · 1990 – 2024
            </p>
          </div>
          {s3Base && (
            <a
              href={`${s3Base}/clean_rainfall_data.csv`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1.5 rounded-xl bg-ocean-50 px-3 py-1.5 text-xs font-semibold text-ocean-600 ring-1 ring-ocean-100 hover:bg-ocean-100 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV (80 MB)
            </a>
          )}
        </div>
        <div className="mt-3 rounded-xl border border-caution-300 bg-caution-100 px-4 py-2.5">
          <p className="text-xs text-caution-500">
            <strong>Note:</strong> The raw rainfall file has 1.46M rows (~80 MB) — too large to
            load in the browser. The charts below use pre-aggregated statistics.
            {s3Base ? " The full CSV is available via the download button above." : ""}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ocean-400">
          Pipeline at a Glance
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Source files" value="436" sub="monthly CSVs" />
          <StatCard label="Raw stations" value="175" sub="Oahu only" />
          <StatCard label="Raw rows" value="1.48M" sub="combined" />
          <StatCard
            label="Clean stations"
            value={loading ? "…" : String(data?.summary.clean_stations ?? 165)}
            sub="10 dropped"
          />
          <StatCard
            label="Clean rows"
            value={loading ? "…" : (data ? (data.summary.clean_rows / 1e6).toFixed(2) + "M" : "1.46M")}
            sub="after cleaning"
          />
          <StatCard label="Missing values" value="0" sub="in clean file" />
        </div>
      </div>

      {/* Live charts — only shown when JSON is loaded */}
      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly average rainfall */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
            <h2 className="mb-1 text-sm font-bold text-ocean-800">
              Average Daily Rainfall by Month
            </h2>
            <p className="mb-1 text-xs text-ocean-400">
              Island-wide mean across all 165 stations · 1990 – 2024
            </p>
            <div className="mb-3 flex gap-4 text-xs">
              <span className="rounded-full bg-ocean-50 px-2.5 py-0.5 font-semibold text-ocean-600 ring-1 ring-ocean-100">
                Wet {data.season_split.wet_months}: {data.season_split.wet_avg_mm} mm/day
              </span>
              <span className="rounded-full bg-sand-100 px-2.5 py-0.5 font-semibold text-sand-500 ring-1 ring-sand-200">
                Dry {data.season_split.dry_months}: {data.season_split.dry_avg_mm} mm/day
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthly_island} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAF7FC" vertical={false} />
                <XAxis
                  dataKey="month_label"
                  tick={{ fontSize: 10, fill: "#6FC4E4" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${v}`}
                  tick={{ fontSize: 10, fill: "#6FC4E4" }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "mm/day", angle: -90, position: "insideLeft", fontSize: 9, fill: "#6FC4E4" }}
                />
                <Tooltip
                  formatter={(v: number) => [`${v} mm/day`, "Avg daily rainfall"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #A2DBEF" }}
                />
                <Bar dataKey="avg_mm" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  {data.monthly_island.map((entry) => (
                    <Cell
                      key={entry.month}
                      fill={[11, 12, 1, 2, 3].includes(entry.month) ? "#176C99" : "#3FA8D4"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Yearly trend */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
            <h2 className="mb-1 text-sm font-bold text-ocean-800">
              Island-Wide Average Daily Rainfall by Year
            </h2>
            <p className="mb-4 text-xs text-ocean-400">
              Annual mean across all stations · long-term trend line
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.yearly} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAF7FC" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 9, fill: "#6FC4E4" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => String(v).slice(2)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6FC4E4" }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "mm/day", angle: -90, position: "insideLeft", fontSize: 9, fill: "#6FC4E4" }}
                />
                <Tooltip
                  formatter={(v: number) => [`${v} mm/day`, "Avg daily rainfall"]}
                  labelFormatter={(l) => `Year ${l}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #A2DBEF" }}
                />
                <Line
                  type="monotone"
                  dataKey="avg_mm"
                  stroke="#3FA8D4"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top wettest stations */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100 lg:col-span-2">
            <h2 className="mb-1 text-sm font-bold text-ocean-800">
              Top 15 Wettest Stations
            </h2>
            <p className="mb-4 text-xs text-ocean-400">
              Ranked by average daily rainfall · higher elevation = more orographic rainfall
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.top_wettest_stations}
                layout="vertical"
                margin={{ top: 0, right: 80, bottom: 0, left: 160 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#EAF7FC" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#6FC4E4" }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "avg mm/day", position: "bottom", fontSize: 10, fill: "#6FC4E4" }}
                />
                <YAxis
                  type="category"
                  dataKey="station_name"
                  width={158}
                  tick={{ fontSize: 9, fill: "#11526F" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number, _name, props) => [
                    `${v} mm/day  (elev ${props.payload.elevation_m}m)`,
                    "Avg daily rainfall",
                  ]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #A2DBEF" }}
                />
                <Bar dataKey="avg_mm" fill="#176C99" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-ocean-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-ocean-300 border-t-transparent" />
          <span className="text-sm">Loading summary data…</span>
        </div>
      )}

      {/* Pipeline steps */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-ocean-400">
            4-Step Pipeline
          </h2>
          <PipelineStep
            num={1}
            title="Combine 436 Monthly Files"
            file="merge_hcdp_data.script.ipynb → raw_data/rainfall_data.csv"
            rows="1,482,457 rows"
            entities="175 stations"
            description="436 CSVs arrive in wide format — one row per station, one column per day. This notebook stacks all files, melts wide to long, filters to Oahu (island == 'OA'), and parses column names back to real YYYY-MM-DD dates."
          />
          <PipelineStep
            num={2}
            title="Clean Rainfall Data"
            file="rainfall_data.clean.ipynb → clean_data/clean_rainfall_data.csv"
            rows="1,463,821 rows"
            entities="165 stations"
            description="Drops 10 stations missing >50% of days, zeroes negative readings, fills 1–2 day gaps by linear interpolation, drops longer gaps. Result: one row per station per calendar day with zero missing values."
          />
          <PipelineStep
            num={3}
            title="Clean Water Quality"
            file="water_quality_data.clean.ipynb → clean_data/clean_water_quality_data.csv"
            rows="45,553 rows"
            entities="107 beaches"
            description="Parallel pipeline for beach water quality data. See the Water Quality tab for full details."
          />
          <PipelineStep
            num={4}
            title="Merge into Master Dataset"
            file="merge_clean_wq_rainfall.ipynb → clean_data/master_dataset.csv"
            rows="32,620 rows"
            entities="84 beaches · 35 gauges"
            description="Each beach is matched to its nearest gauge by haversine distance. Rainfall is shifted one day forward (leakage guard), 7 antecedent features are computed, and beach samples are left-joined to their gauge's feature rows."
            last
          />
        </div>

        <div>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-ocean-400">
            Cleaning Decisions
          </h2>
          <div className="space-y-2.5">
            <CleaningRule
              type="removed"
              icon={<AlertTriangle className="h-4 w-4" />}
              title="10 sparse stations dropped"
              detail="Any station missing more than 50% of its daily readings is excluded. A gauge with that many holes cannot reliably serve as a beach's nearest rainfall source."
            />
            <CleaningRule
              type="removed"
              icon={<AlertTriangle className="h-4 w-4" />}
              title="Negative readings zeroed"
              detail="Negative rainfall is physically impossible — treated as missing data (sensor error or data entry issue)."
            />
            <CleaningRule
              type="kept"
              icon={<CheckCircle className="h-4 w-4" />}
              title="1–2 day gaps interpolated"
              detail="Short gaps of 1 or 2 days are filled by linear interpolation between the surrounding real readings — almost certainly sensor outages, not real weather events."
            />
            <CleaningRule
              type="removed"
              icon={<AlertTriangle className="h-4 w-4" />}
              title="Longer gaps dropped"
              detail="Any run of 3+ consecutive missing days is removed. Fabricating multiple days of rainfall would corrupt the 7-day rolling window features the model depends on."
            />
            <CleaningRule
              type="note"
              icon={<Info className="h-4 w-4" />}
              title="Complete daily grid reindexed"
              detail="Each surviving station is reindexed to one row per calendar day. This ensures rolling windows are computed across real calendar days, not just days with records."
            />
          </div>

          <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ocean-100">
            <p className="text-xs font-bold text-ocean-700">
              Why only 35 of 165 gauges appear in the final model?
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-ocean-600">
              Each of the 84 beaches is assigned to its nearest gauge by haversine distance. Of the
              165 clean gauges, only 35 ended up being the closest gauge for at least one beach. The
              remaining 130 gauges are in areas with no nearby beach sampling sites.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
