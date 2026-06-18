"use client";

import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TableColumn<T> {
  key: keyof T & string;
  label: string;
  numeric?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T extends object> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  pageSize?: number;
  searchPlaceholder?: string;
  extraFilters?: React.ReactNode;
}

type SortDir = "asc" | "desc" | null;

const PAGE_SIZE = 50;

export function DataTable<T extends object>({
  columns,
  data,
  loading,
  error,
  pageSize = PAGE_SIZE,
  searchPlaceholder = "Search…",
  extraFilters,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const v = (row as Record<string, unknown>)[col.key];
        return (
          v !== null && v !== undefined && String(v).toLowerCase().includes(q)
        );
      }),
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function toggleSort(key: string) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(0);
  }

  function handleSearch(v: string) {
    setSearch(v);
    setPage(0);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-ocean-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ocean-400 border-t-transparent" />
        <span className="text-sm font-medium">Loading dataset…</span>
      </div>
    );
  }

  if (error) {
    const isNotFound = error.startsWith("FILE_NOT_FOUND:");
    const filename = isNotFound ? error.split(":")[1].split("/").pop() : null;
    return (
      <div className="rounded-2xl border border-sand-200 bg-sand-50 p-8 text-center">
        <p className="text-sm font-semibold text-ocean-700">
          {isNotFound ? "Dataset file not found" : "Failed to load dataset"}
        </p>
        {isNotFound && filename && (
          <p className="mt-2 text-xs text-ocean-500">
            Copy{" "}
            <code className="rounded bg-sand-200 px-1 py-0.5 font-mono">
              {filename}
            </code>{" "}
            into{" "}
            <code className="rounded bg-sand-200 px-1 py-0.5 font-mono">
              ui/public/data/
            </code>{" "}
            to enable this table.
          </p>
        )}
        {!isNotFound && <p className="mt-1 text-xs text-ocean-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ocean-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-xl border border-ocean-100 bg-white pl-9 pr-3 text-sm text-ocean-800 outline-none placeholder:text-ocean-300 focus:border-ocean-300 focus:ring-2 focus:ring-ocean-100"
          />
        </div>
        {extraFilters}
        <span className="ml-auto text-xs text-ocean-400">
          {filtered.length.toLocaleString()} rows
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ocean-100">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ocean-100 bg-ocean-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-ocean-600 hover:text-ocean-800",
                    col.numeric && "text-right",
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-10 text-center text-xs text-ocean-400"
                >
                  No matching rows
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-ocean-50 hover:bg-ocean-50/40 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "whitespace-nowrap px-3 py-2 text-xs text-ocean-800",
                        col.numeric && "text-right font-mono",
                      )}
                    >
                      {col.render
                        ? col.render(
                            (row as Record<string, unknown>)[col.key],
                            row,
                          )
                        : String(
                            (row as Record<string, unknown>)[col.key] ?? "-",
                          )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-ocean-500">
          <span>
            Page {page + 1} of {totalPages} ({sorted.length.toLocaleString()}{" "}
            rows)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="rounded-lg px-2.5 py-1.5 hover:bg-ocean-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg px-2.5 py-1.5 hover:bg-ocean-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 2, totalPages - 5));
              const p = start + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5",
                    p === page
                      ? "bg-ocean-500 text-white font-bold"
                      : "hover:bg-ocean-50",
                  )}
                >
                  {p + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="rounded-lg px-2.5 py-1.5 hover:bg-ocean-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page === totalPages - 1}
              className="rounded-lg px-2.5 py-1.5 hover:bg-ocean-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
