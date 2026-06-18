"use client";

import { useState } from "react";
import Link from "next/link";
import { CloudRain, Droplets, Database, BarChart2, ArrowLeft, Waves } from "lucide-react";

import { RainfallTab } from "./tabs/RainfallTab";
import { WaterQualityTab } from "./tabs/WaterQualityTab";
import { MasterDatasetTab } from "./tabs/MasterDatasetTab";
import { MLFiguresTab } from "./tabs/MLFiguresTab";

type Tab = "rainfall" | "water-quality" | "master" | "ml";

const TABS: { id: Tab; label: string; icon: React.ReactNode; sub: string }[] = [
  { id: "rainfall", label: "Rainfall", icon: <CloudRain className="h-4 w-4" />, sub: "1.46M rows · 165 stations" },
  { id: "water-quality", label: "Water Quality", icon: <Droplets className="h-4 w-4" />, sub: "45,553 samples · 84 beaches" },
  { id: "master", label: "Master Dataset", icon: <Database className="h-4 w-4" />, sub: "32,620 rows · 35 gauges" },
  { id: "ml", label: "Model & Findings", icon: <BarChart2 className="h-4 w-4" />, sub: "9 diagnostic figures" },
];

export function ExploreShell() {
  const [activeTab, setActiveTab] = useState<Tab>("rainfall");

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 via-foam to-sand-50">
      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-ocean-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ocean-600 hover:bg-ocean-50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ocean-500 text-white">
              <Waves className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-bold text-ocean-800">Data Explorer</span>
            <span className="hidden text-xs text-ocean-400 sm:block">/ Kaichecks</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mx-auto max-w-7xl overflow-x-auto px-4">
          <div className="flex gap-0.5 pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "border-ocean-500 text-ocean-700"
                    : "border-transparent text-ocean-400 hover:text-ocean-600"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className="hidden text-[10px] font-normal text-ocean-300 lg:block">
                  {tab.sub}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {activeTab === "rainfall" && <RainfallTab />}
        {activeTab === "water-quality" && <WaterQualityTab />}
        {activeTab === "master" && <MasterDatasetTab />}
        {activeTab === "ml" && <MLFiguresTab />}
      </main>
    </div>
  );
}
