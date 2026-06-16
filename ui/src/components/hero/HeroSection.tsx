"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Waves } from "lucide-react";

import { SilkBackground } from "@/components/ui/SilkBackground";
import { Button } from "@/components/ui/Button";

import { HeroHighlights } from "./HeroHighlights";

/**
 * Landing hero. A glassy, animated introduction over the ocean backdrop with a
 * single call to action that launches the simulator.
 */
export function HeroSection({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 py-16">
      <SilkBackground />

      <div className="relative z-10 flex max-w-3xl flex-col items-center text-center">
        <motion.span
          className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-xs font-semibold text-ocean-600 shadow-panel-sm ring-1 ring-white/60 backdrop-blur"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Sparkles className="h-3.5 w-3.5 text-sage-500" />
          Rainfall-driven beach safety, modeled
        </motion.span>

        <motion.h1
          className="text-shadow-island mt-6 text-balance text-5xl font-bold leading-[1.05] tracking-tight text-ocean-800 sm:text-6xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Know which Oahu beaches are{" "}
          <span className="bg-gradient-to-r from-ocean-500 via-ocean-400 to-sage-500 bg-clip-text text-transparent">
            safe after the rain
          </span>
        </motion.h1>

        <motion.p
          className="mt-5 max-w-xl text-pretty text-base text-ocean-600 sm:text-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
        >
          Simulate a storm, watch runoff move along the coastline, and see a
          machine-learning forecast of where the water turns unsafe to swim.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
        >
          <Button
            size="lg"
            onClick={onEnter}
            leadingIcon={<Waves className="h-5 w-5" />}
            trailingIcon={<ArrowRight className="h-5 w-5" />}
          >
            Launch the simulator
          </Button>
        </motion.div>

        <div className="mt-12">
          <HeroHighlights />
        </div>
      </div>
    </section>
  );
}
