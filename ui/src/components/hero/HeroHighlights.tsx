"use client";

import { motion } from "framer-motion";
import { CloudRain, MapPin, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { BAV_THRESHOLD } from "@/lib/constants";
import { useSimulation } from "@/context/SimulationContext";

interface Highlight {
  icon: ReactNode;
  value: string;
  label: string;
}

/** Trio of headline metrics anchoring the hero in real numbers. */
export function HeroHighlights() {
  const { beachCount } = useSimulation();

  const highlights: Highlight[] = [
    {
      icon: <MapPin className="h-4 w-4 text-ocean-500" />,
      value: beachCount > 0 ? `${beachCount}` : "--",
      label: "monitored beaches",
    },
    {
      icon: <CloudRain className="h-4 w-4 text-sage-500" />,
      value: "7-day",
      label: "rainfall model",
    },
    {
      icon: <ShieldCheck className="h-4 w-4 text-caution-500" />,
      value: `${BAV_THRESHOLD}`,
      label: "CFU EPA action level",
    },
  ];

  return (
    <motion.div
      className="flex flex-wrap items-center justify-center gap-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      {highlights.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-2.5 shadow-panel-sm ring-1 ring-white/60 backdrop-blur"
        >
          {item.icon}
          <span className="text-sm font-bold text-ocean-800">{item.value}</span>
          <span className="text-xs text-ocean-500">{item.label}</span>
        </div>
      ))}
    </motion.div>
  );
}
