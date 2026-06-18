"use client";

import { useMemo, useState } from "react";
import { Droplets } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { useCsvData } from "@/hooks/useCsvData";
import { DataTable, type TableColumn } from "@/components/explore/DataTable";

interface WQRow {
  date: string;
  location_id: string | number;
  location_name: string;
  latitude: number;
  longitude: number;
  enterococcus: number;
  unsafe: number;
  month: number;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const COLUMNS: TableColumn<WQRow>[] = [
  { key: "date", label: "Date", width: "110px" },
  { key: "location_name", label: "Beach" },
  {
    key: "enterococcus",
    label: "CFU / 100 mL",
    numeric: true,
    render: (v) => (typeof v === "number" ? v.toFixed(1) : String(v)),
  },
  {
    key: "unsafe",
    label: "Unsafe",
    width: "80px",
    render: (v) =>
      Number(v) === 1 ? (
        <span className="rounded-full bg-coral-100 px-2 py-0.5 text-[10px] font-bold text-coral-600">
          YES
        </span>
      ) : (
        <span className="rounded-full bg-sage-50 px-2 py-0.5 text-[10px] font-bold text-sage-600">
          safe
        </span>
      ),
  },
  {
    key: "month",
    label: "Month",
    numeric: true,
    width: "70px",
    render: (v) => MONTH_LABELS[Number(v) - 1] ?? String(v),
  },
  {
    key: "latitude",
    label: "Lat",
    numeric: true,
    width: "80px",
    render: (v) => (typeof v === "number" ? v.toFixed(4) : String(v)),
  },
  {
    key: "longitude",
    label: "Lon",
    numeric: true,
    width: "90px",
    render: (v) => (typeof v === "number" ? v.toFixed(4) : String(v)),
  },
];

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ocean-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-ocean-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-ocean-800">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ocean-500">{sub}</p>}
    </div>
  );
}

export function WaterQualityTab() {
  const s3Base = process.env.NEXT_PUBLIC_DATA_S3_URL;
  const csvUrl = s3Base
    ? `${s3Base}/clean_water_quality_data.csv`
    : "/data/clean_water_quality_data.csv";
  const { data, loading, error } = useCsvData<WQRow>(csvUrl);
  const [unsafeFilter, setUnsafeFilter] = useState<"all" | "safe" | "unsafe">(
    "all",
  );

  const filteredData = useMemo(() => {
    if (unsafeFilter === "all") return data;
    return data.filter((r) =>
      unsafeFilter === "unsafe" ? r.unsafe === 1 : r.unsafe === 0,
    );
  }, [data, unsafeFilter]);

  const stats = useMemo(() => {
    if (!data.length) return null;
    const unsafeCount = data.filter((r) => r.unsafe === 1).length;
    const beaches = new Set(data.map((r) => String(r.location_id))).size;
    return {
      total: data.length,
      beaches,
      unsafeCount,
      unsafeRate: ((unsafeCount / data.length) * 100).toFixed(2),
    };
  }, [data]);

  const topBeachesData = useMemo(() => {
    if (!data.length) return [];
    const grouped: Record<string, { unsafe: number; total: number }> = {};
    data.forEach((r) => {
      const name = r.location_name;
      if (!grouped[name]) grouped[name] = { unsafe: 0, total: 0 };
      grouped[name].total++;
      if (r.unsafe === 1) grouped[name].unsafe++;
    });
    return Object.entries(grouped)
      .filter(([, v]) => v.total >= 30)
      .map(([name, v]) => ({
        name: name.length > 22 ? name.slice(0, 22) + "…" : name,
        rate: parseFloat(((v.unsafe / v.total) * 100).toFixed(1)),
        total: v.total,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 20);
  }, [data]);

  const monthData = useMemo(() => {
    if (!data.length) return [];
    const months = MONTH_LABELS.map((m, i) => ({
      month: m,
      rate: 0,
      total: 0,
      unsafe: 0,
      idx: i,
    }));
    data.forEach((r) => {
      const m = Number(r.month) - 1;
      if (m >= 0 && m < 12) {
        months[m].total++;
        if (r.unsafe === 1) months[m].unsafe++;
      }
    });
    months.forEach((m) => {
      if (m.total > 0)
        m.rate = parseFloat(((m.unsafe / m.total) * 100).toFixed(2));
    });
    return months;
  }, [data]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ocean-100 text-ocean-600">
          <Droplets className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-ocean-900">
            Beach Water Quality
          </h1>
          <p className="text-sm text-ocean-500">
            Hawaii DOH Clean Water Branch · enterococcus CFU/100 mL · 1990 –
            2024
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total samples"
            value={stats.total.toLocaleString()}
          />
          <StatCard
            label="Beaches"
            value={String(stats.beaches)}
            sub="unique sites"
          />
          <StatCard
            label="Unsafe samples"
            value={stats.unsafeCount.toLocaleString()}
            sub="> 130 CFU"
          />
          <StatCard
            label="Unsafe rate"
            value={`${stats.unsafeRate}%`}
            sub="island-wide"
          />
        </div>
      )}

      {/* Charts */}
      {data.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top beaches */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
            <h2 className="mb-1 text-sm font-bold text-ocean-800">
              Top 20 Beaches by Exceedance Rate
            </h2>
            <p className="mb-4 text-xs text-ocean-400">
              min 30 samples · % unsafe (above 130 CFU)
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={topBeachesData}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 130 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#EAF7FC"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 10, fill: "#6FC4E4" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={128}
                  tick={{ fontSize: 10, fill: "#11526F" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "Exceedance rate"]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #A2DBEF",
                  }}
                />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {topBeachesData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.rate > 20
                          ? "#DD5C3C"
                          : entry.rate > 8
                            ? "#E8BE5C"
                            : "#3FA8D4"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Unsafe rate by month */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
            <h2 className="mb-1 text-sm font-bold text-ocean-800">
              Unsafe Rate by Month
            </h2>
            <p className="mb-4 text-xs text-ocean-400">
              % of samples exceeding 130 CFU - wet season (Nov–Mar) spikes are
              visible
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={monthData}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#EAF7FC"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#6FC4E4" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 10, fill: "#6FC4E4" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "Unsafe rate"]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #A2DBEF",
                  }}
                />
                <Bar
                  dataKey="rate"
                  fill="#3FA8D4"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Column explanations */}
            <div className="mt-5 border-t border-ocean-50 pt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ocean-400">
                Column Guide
              </p>
              <div className="space-y-1.5 text-xs text-ocean-600">
                <div>
                  <strong>date</strong> - sample collection date (YYYY-MM-DD)
                </div>
                <div>
                  <strong>location_name</strong> - beach name from DOH records
                </div>
                <div>
                  <strong>enterococcus</strong> - measured bacteria count
                  (CFU/100 mL)
                </div>
                <div>
                  <strong>unsafe</strong> - 1 if enterococcus &gt; 130 BAV
                  threshold, else 0
                </div>
                <div>
                  <strong>month</strong> - calendar month (seasonality proxy)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-ocean-800">Full Dataset</h2>
            <p className="text-xs text-ocean-400">
              45,553 rows · sortable, searchable, paginated
            </p>
          </div>
        </div>
        <DataTable
          columns={COLUMNS}
          data={filteredData}
          loading={loading}
          error={error}
          searchPlaceholder="Search beach name, date…"
          extraFilters={
            <select
              value={unsafeFilter}
              onChange={(e) =>
                setUnsafeFilter(e.target.value as typeof unsafeFilter)
              }
              className="h-9 rounded-xl border border-ocean-100 bg-white px-3 text-sm text-ocean-700 outline-none focus:border-ocean-300"
            >
              <option value="all">All samples</option>
              <option value="unsafe">Unsafe only</option>
              <option value="safe">Safe only</option>
            </select>
          }
        />
      </div>
    </div>
  );
}
