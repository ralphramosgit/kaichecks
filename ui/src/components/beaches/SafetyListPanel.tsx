"use client";

import { useState } from "react";
import { ListOrdered } from "lucide-react";

import { CollapsiblePanel } from "@/components/ui/CollapsiblePanel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useSimulation } from "@/context/SimulationContext";

import { BeachSafetyList } from "./BeachSafetyList";

type Tab = "unsafe" | "safe";

const TAB_OPTIONS = [
  { value: "unsafe" as const, label: "Most unsafe" },
  { value: "safe" as const, label: "Safest" },
];

/**
 * Ranked beach lists. Collapses to a one-liner; expands to toggle between the
 * ten highest-risk and ten safest beaches under the active scenario.
 */
export function SafetyListPanel() {
  const { result } = useSimulation();
  const [tab, setTab] = useState<Tab>("unsafe");

  const predictions = tab === "unsafe" ? result.mostUnsafe : result.mostSafe;

  return (
    <CollapsiblePanel
      className="w-[340px] max-w-[calc(100vw-2rem)]"
      delay={0.25}
      icon={<ListOrdered className="h-5 w-5" />}
      title="Beach safety ranking"
      subtitle="Top ten by predicted water safety"
      badge={
        <span className="rounded-full bg-coral-100 px-2.5 py-1 text-[11px] font-semibold text-coral-600">
          {result.unsafeCount} unsafe
        </span>
      }
    >
      <div className="px-4 pt-3">
        <SegmentedControl
          options={TAB_OPTIONS}
          value={tab}
          onChange={setTab}
          layoutId="safety-list-tab"
          size="sm"
          fluid
        />
      </div>
      <div className="scroll-island max-h-[40vh] overflow-y-auto px-3 py-2">
        <BeachSafetyList predictions={predictions} />
      </div>
    </CollapsiblePanel>
  );
}
