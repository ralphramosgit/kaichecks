"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useSimulation } from "@/context/SimulationContext";
import { REGION_LABELS } from "@/lib/constants";
import { fetchSummary } from "@/lib/api";

import { SafetyVerdict } from "./SafetyVerdict";
import { BeachSummary } from "./BeachSummary";
import { BeachStats } from "./BeachStats";
import { BeachCfuChart } from "./BeachCfuChart";

/**
 * Detail modal for a selected beach: the safety verdict, an AI summary
 * placeholder, historical stats, and a path to a new simulation.
 */
export function BeachDetailModal() {
  const { selectedPrediction, selectBeach, rerun, scenario, result } = useSimulation();
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const open = Boolean(selectedPrediction);

  useEffect(() => {
    if (!selectedPrediction) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSummary("");
    setSummaryLoading(true);

    fetchSummary(
      {
        unsafe_probability: selectedPrediction.unsafeProbability,
        predicted_enterococcus_cfu: 0,
        bav_threshold: 104,
        unsafe_count: result.unsafeCount,
        caution_count: result.cautionCount,
        total_count: result.predictions.length,
        month: scenario.month,
        rain_7day: result.features.rain7day,
        rain_24hr: result.features.rain24hr,
        most_unsafe_beach: selectedPrediction.beach.name,
        safest_beach: result.mostSafe[0]?.beach.name ?? "unknown",
      },
      controller.signal,
    )
      .then((text) => { setSummary(text); setSummaryLoading(false); })
      .catch((err) => { if (err.name !== "AbortError") setSummaryLoading(false); });

    return () => controller.abort();
  }, [selectedPrediction, scenario.month, result]);

  // Close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") selectBeach(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, selectBeach]);

  return (
    <AnimatePresence>
      {open && selectedPrediction ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop. */}
          <button
            type="button"
            aria-label="Close detail"
            onClick={() => selectBeach(null)}
            className="absolute inset-0 bg-ocean-800/40 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="beach-modal-title"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="glass-panel scroll-island relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl shadow-panel"
          >
            {/* Header. */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-ocean-100/70 bg-white/80 px-5 py-4 backdrop-blur">
              <div>
                <h2
                  id="beach-modal-title"
                  className="text-lg font-bold tracking-tight text-ocean-800"
                >
                  {selectedPrediction.beach.name}
                </h2>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-ocean-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {REGION_LABELS[selectedPrediction.beach.region]} coast
                </span>
              </div>
              <IconButton label="Close" onClick={() => selectBeach(null)}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>

            <div className="space-y-4 px-5 py-4">
              <SafetyVerdict prediction={selectedPrediction} />

              <BeachSummary summary={summaryLoading ? "Generating summary…" : summary} />

              <BeachCfuChart locationId={selectedPrediction.beach.locationId} />

              <BeachStats beach={selectedPrediction.beach} />
            </div>

            {/* Footer. */}
            <div className="sticky bottom-0 flex items-center gap-2 border-t border-ocean-100/70 bg-white/80 px-5 py-3 backdrop-blur">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => selectBeach(null)}
              >
                Close
              </Button>
              <Button
                className="flex-1"
                onClick={rerun}
                leadingIcon={<RefreshCw className="h-4 w-4" />}
              >
                New simulation
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
