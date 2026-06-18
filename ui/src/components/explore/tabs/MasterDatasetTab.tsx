"use client";

import { useMemo, useState } from "react";
import { Database } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

import { useCsvData } from "@/hooks/useCsvData";
import { DataTable, type TableColumn } from "@/components/explore/DataTable";

interface MasterRow {
  date: string;
  location_id: string | number;
  location_name: string;
  latitude: number;
  longitude: number;
  enterococcus: number;
  unsafe: number;
  nearest_station_id: string | number;
  rain_24hr: number;
  rain_48hr: number;
  rain_72hr: number;
  rain_7day: number;
  days_since_rain: number;
  max_rain_3day: number;
  month: number;
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const COLUMNS: TableColumn<MasterRow>[] = [
  { key: "date", label: "Date", width: "110px" },
  { key: "location_name", label: "Beach" },
  { key: "enterococcus", label: "CFU", numeric: true,
    render: (v) => typeof v === "number" ? v.toFixed(1) : String(v) },
  { key: "unsafe", label: "Unsafe", width: "72px",
    render: (v) =>
      Number(v) === 1 ? (
        <span className="rounded-full bg-coral-100 px-2 py-0.5 text-[10px] font-bold text-coral-600">YES</span>
      ) : (
        <span className="rounded-full bg-sage-50 px-2 py-0.5 text-[10px] font-bold text-sage-600">safe</span>
      ),
  },
  { key: "rain_24hr", label: "24hr mm", numeric: true,
    render: (v) => typeof v === "number" ? v.toFixed(1) : String(v) },
  { key: "rain_48hr", label: "48hr mm", numeric: true,
    render: (v) => typeof v === "number" ? v.toFixed(1) : String(v) },
  { key: "rain_72hr", label: "72hr mm", numeric: true,
    render: (v) => typeof v === "number" ? v.toFixed(1) : String(v) },
  { key: "rain_7day", label: "7day mm", numeric: true,
    render: (v) => typeof v === "number" ? v.toFixed(1) : String(v) },
  { key: "days_since_rain", label: "Dry days", numeric: true, width: "80px" },
  { key: "max_rain_3day", label: "Max 3day", numeric: true,
    render: (v) => typeof v === "number" ? v.toFixed(1) : String(v) },
  { key: "month", label: "Month", width: "70px",
    render: (v) => MONTH_LABELS[Number(v) - 1] ?? String(v) },
];

const FEATURE_COLS: { key: keyof MasterRow; label: string; color: string }[] = [
  { key: "rain_24hr", label: "24hr mm", color: "#3FA8D4" },
  { key: "rain_48hr", label: "48hr mm", color: "#2389BC" },
  { key: "rain_72hr", label: "72hr mm", color: "#176C99" },
  { key: "rain_7day", label: "7day mm", color: "#11526F" },
  { key: "max_rain_3day", label: "Max 3day", color: "#7DAE64" },
  { key: "days_since_rain", label: "Dry days", color: "#5E9047" },
];

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ocean-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-ocean-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ocean-800">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ocean-500">{sub}</p>}
    </div>
  );
}

export function MasterDatasetTab() {
  const s3Base = process.env.NEXT_PUBLIC_DATA_S3_URL;
  const csvUrl = s3Base
    ? `${s3Base}/master_dataset.csv`
    : "/data/master_dataset.csv";
  const { data, loading, error } = useCsvData<MasterRow>(csvUrl);
  const [unsafeFilter, setUnsafeFilter] = useState<"all" | "safe" | "unsafe">("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const filteredData = useMemo(() => {
    let d = data;
    if (unsafeFilter !== "all") d = d.filter((r) => unsafeFilter === "unsafe" ? r.unsafe === 1 : r.unsafe === 0);
    if (monthFilter !== "all") d = d.filter((r) => String(r.month) === monthFilter);
    return d;
  }, [data, unsafeFilter, monthFilter]);

  const stats = useMemo(() => {
    if (!data.length) return null;
    const unsafeCount = data.filter((r) => r.unsafe === 1).length;
    const beaches = new Set(data.map((r) => String(r.location_id))).size;
    const gauges = new Set(data.map((r) => String(r.nearest_station_id))).size;
    const trainRows = data.filter((r) => parseInt(r.date?.slice(0, 4)) < 2014).length;
    const testRows = data.length - trainRows;
    return { total: data.length, beaches, gauges, unsafeCount, unsafeRate: ((unsafeCount / data.length) * 100).toFixed(2), trainRows, testRows };
  }, [data]);

  const monthData = useMemo(() => {
    if (!data.length) return [];
    const months = MONTH_LABELS.map((m) => ({ month: m, rate: 0, total: 0, unsafe: 0 }));
    data.forEach((r) => {
      const m = Number(r.month) - 1;
      if (m >= 0 && m < 12) { months[m].total++; if (r.unsafe === 1) months[m].unsafe++; }
    });
    months.forEach((m) => { if (m.total > 0) m.rate = parseFloat(((m.unsafe / m.total) * 100).toFixed(2)); });
    return months;
  }, [data]);

  const featureAvgData = useMemo(() => {
    if (!data.length) return [];
    const safe = data.filter((r) => r.unsafe === 0);
    const unsafe = data.filter((r) => r.unsafe === 1);
    const avg = (arr: MasterRow[], key: keyof MasterRow) =>
      arr.length ? parseFloat((arr.reduce((s, r) => s + Number(r[key] ?? 0), 0) / arr.length).toFixed(1)) : 0;
    return FEATURE_COLS.map(({ key, label }) => ({
      label,
      safe: avg(safe, key),
      unsafe: avg(unsafe, key),
    }));
  }, [data]);

  // Scatter: rain_7day vs enterococcus (sampled 2000 points)
  const scatterData = useMemo(() => {
    if (!data.length) return [];
    const sample = data.filter((_, i) => i % Math.ceil(data.length / 2000) === 0);
    return sample.map((r) => ({
      x: Number(r.rain_7day),
      y: Math.min(Number(r.enterococcus), 3000),
      unsafe: r.unsafe,
    }));
  }, [data]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ocean-100 text-ocean-600">
          <Database className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-ocean-900">Master Training Dataset</h1>
          <p className="text-sm text-ocean-500">
            32,620 water samples × 7 antecedent rainfall features · 84 beaches · 35 gauges
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total rows" value={stats.total.toLocaleString()} />
          <StatCard label="Beaches" value={String(stats.beaches)} />
          <StatCard label="Rain gauges" value={String(stats.gauges)} />
          <StatCard label="Unsafe rows" value={stats.unsafeCount.toLocaleString()} sub={`${stats.unsafeRate}%`} />
          <StatCard label="Train rows" value={stats.trainRows.toLocaleString()} sub="before 2014" />
          <StatCard label="Test rows" value={stats.testRows.toLocaleString()} sub="2014 onward" />
        </div>
      )}

      {/* Charts */}
      {data.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Unsafe rate by month */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
            <h2 className="mb-1 text-sm font-bold text-ocean-800">Unsafe Rate by Month</h2>
            <p className="mb-4 text-xs text-ocean-400">
              Oahu wet season (Nov–Apr) shows elevated risk
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAF7FC" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6FC4E4" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: "#6FC4E4" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "Unsafe rate"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #A2DBEF" }}
                />
                <Bar dataKey="rate" fill="#DD5C3C" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Feature avg safe vs unsafe */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
            <h2 className="mb-1 text-sm font-bold text-ocean-800">
              Avg Feature Values: Safe vs Unsafe
            </h2>
            <p className="mb-4 text-xs text-ocean-400">
              Shows how much more rainfall precedes unsafe samples
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={featureAvgData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAF7FC" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#6FC4E4" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#6FC4E4" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #A2DBEF" }} />
                <Bar dataKey="safe" name="Safe avg (mm)" fill="#3FA8D4" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="unsafe" name="Unsafe avg (mm)" fill="#DD5C3C" radius={[4, 4, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scatter: rain_7day vs enterococcus */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100 lg:col-span-2">
            <h2 className="mb-1 text-sm font-bold text-ocean-800">
              7-Day Rainfall vs Enterococcus (sampled 2,000 pts)
            </h2>
            <p className="mb-4 text-xs text-ocean-400">
              Orange = unsafe (&gt;130 CFU) · blue = safe · CFU capped at 3,000 for readability
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EAF7FC" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="7-day rain (mm)"
                  tick={{ fontSize: 10, fill: "#6FC4E4" }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: "7-day rainfall (mm)", position: "bottom", fontSize: 10, fill: "#6FC4E4" }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Enterococcus CFU"
                  tick={{ fontSize: 10, fill: "#6FC4E4" }}
                  axisLine={false}
                  tickLine={false}
                />
                <ZAxis range={[18, 18]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload as { x: number; y: number; unsafe: number };
                    return (
                      <div className="rounded-lg border border-ocean-100 bg-white p-2 text-xs shadow">
                        <p>7-day rain: <strong>{d.x} mm</strong></p>
                        <p>Enterococcus: <strong>{d.y} CFU</strong></p>
                        <p className={d.unsafe ? "text-coral-500" : "text-sage-600"}>
                          {d.unsafe ? "UNSAFE" : "safe"}
                        </p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={scatterData.filter((d) => d.unsafe === 0)}
                  fill="#3FA8D4"
                  fillOpacity={0.3}
                />
                <Scatter
                  data={scatterData.filter((d) => d.unsafe === 1)}
                  fill="#DD5C3C"
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Column guide */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <h2 className="mb-3 text-sm font-bold text-ocean-800">Column Guide</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { col: "date", role: "key", desc: "Sample date (YYYY-MM-DD)" },
            { col: "location_name", role: "key", desc: "Beach name from DOH records" },
            { col: "enterococcus", role: "raw measurement", desc: "Bacteria count in CFU/100 mL" },
            { col: "unsafe", role: "ML target", desc: "1 if enterococcus > 130 BAV, else 0" },
            { col: "nearest_station_id", role: "provenance", desc: "HCDP gauge assigned to this beach" },
            { col: "rain_24hr", role: "feature", desc: "Rainfall in the 24h before sample (mm)" },
            { col: "rain_48hr", role: "feature", desc: "Rolling 48h sum (mm)" },
            { col: "rain_72hr", role: "feature", desc: "Rolling 72h sum (mm)" },
            { col: "rain_7day", role: "feature", desc: "Rolling 7-day sum (mm)" },
            { col: "max_rain_3day", role: "feature", desc: "Heaviest single day in prior 3 days" },
            { col: "days_since_rain", role: "feature", desc: "Consecutive dry days before sample" },
            { col: "month", role: "feature", desc: "Calendar month (seasonality proxy)" },
          ].map(({ col, role, desc }) => (
            <div key={col} className="flex gap-2 text-xs">
              <code className="shrink-0 rounded bg-ocean-50 px-1.5 py-0.5 font-mono text-ocean-600">
                {col}
              </code>
              <span className="text-ocean-600">
                <span className={`mr-1 rounded px-1 text-[9px] font-bold uppercase ${
                  role === "ML target" ? "bg-coral-100 text-coral-600" :
                  role === "feature" ? "bg-sage-50 text-sage-600" :
                  "bg-ocean-50 text-ocean-500"
                }`}>{role}</span>
                {desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-ocean-800">Full Dataset</h2>
          <p className="text-xs text-ocean-400">32,620 rows · sortable, searchable, paginated</p>
        </div>
        <DataTable
          columns={COLUMNS}
          data={filteredData}
          loading={loading}
          error={error}
          searchPlaceholder="Search beach name, date…"
          extraFilters={
            <>
              <select
                value={unsafeFilter}
                onChange={(e) => setUnsafeFilter(e.target.value as typeof unsafeFilter)}
                className="h-9 rounded-xl border border-ocean-100 bg-white px-3 text-sm text-ocean-700 outline-none focus:border-ocean-300"
              >
                <option value="all">All labels</option>
                <option value="unsafe">Unsafe only</option>
                <option value="safe">Safe only</option>
              </select>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="h-9 rounded-xl border border-ocean-100 bg-white px-3 text-sm text-ocean-700 outline-none focus:border-ocean-300"
              >
                <option value="all">All months</option>
                {MONTH_LABELS.map((m, i) => (
                  <option key={i} value={String(i + 1)}>{m}</option>
                ))}
              </select>
            </>
          }
        />
      </div>
    </div>
  );
}
