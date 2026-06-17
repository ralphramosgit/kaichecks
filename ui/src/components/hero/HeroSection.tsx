"use client";

import { motion } from "framer-motion";
import { ArrowRight, Waves } from "lucide-react";

import { BackgroundShader } from "@/components/ui/background-shader";
import { Button } from "@/components/ui/Button";

import { HeroHighlights } from "./HeroHighlights";

export function HeroSection({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 py-16">
      <BackgroundShader />

      <div className="relative z-10 flex max-w-2xl flex-col items-center gap-4 text-center">
        <motion.h1
          className="text-balance text-6xl font-bold tracking-tight text-white sm:text-7xl"
          style={{ textShadow: "0 2px 16px rgba(0,0,0,0.7)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Kaichecks
        </motion.h1>

        <motion.p
          className="text-xl font-semibold text-white"
          style={{ textShadow: "0 1px 10px rgba(0,0,0,0.6)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Find out which Oahu beaches are unsafe to swim after it rains.
        </motion.p>

        <motion.p
          className="max-w-lg text-base text-white/85"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
