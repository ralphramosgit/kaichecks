"use client";

import { CalendarDays, ChevronDown } from "lucide-react";

import { MONTHS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface MonthSelectProps {
  month: number;
  onChange: (month: number) => void;
}

function isWetSeason(month: number): boolean {
  return month >= 11 || month <= 4;
}

/** Month picker with a wet/dry season hint. */
export function MonthSelect({ month, onChange }: MonthSelectProps) {
  const wet = isWetSeason(month);
  return (
    <div className="flex-1">
      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ocean-600/80">
        <CalendarDays className="h-3.5 w-3.5" />
        Month
      </label>
      <div className="relative">
        <select
          value={month}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full appearance-none rounded-xl bg-white/70 py-2 pl-3 pr-8 text-sm font-semibold text-ocean-700 ring-1 ring-ocean-100 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400"
        >
          {MONTHS.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-500" />
      </div>
      <span
        className={cn(
          "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
          wet ? "bg-ocean-100 text-ocean-600" : "bg-sand-100 text-sand-500",
        )}
      >
        {wet ? "Wet season" : "Dry season"}
      </span>
      <p className="mt-1 text-[10px] leading-snug text-ocean-500/70">
        Minor seasonal adjustment. Rainfall amount drives the result.
      </p>
    </div>
  );
}
