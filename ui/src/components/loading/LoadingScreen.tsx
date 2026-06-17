"use client";

import { motion } from "framer-motion";
import { Waves } from "lucide-react";

import { BackgroundShader } from "@/components/ui/background-shader";

const BUBBLES = [
  { left: "18%", size: 10, delay: 0 },
  { left: "32%", size: 6, delay: 0.6 },
  { left: "54%", size: 14, delay: 0.3 },
  { left: "68%", size: 8, delay: 0.9 },
  { left: "82%", size: 6, delay: 0.45 },
];

export function LoadingScreen() {
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden">
      <BackgroundShader />

      {/* Rising bubbles. */}
      {BUBBLES.map((bubble, index) => (
        <motion.span
          key={index}
          className="absolute bottom-[30%] rounded-full bg-white/50"
          style={{ left: bubble.left, width: bubble.size, height: bubble.size }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -120, opacity: [0, 0.8, 0] }}
          transition={{
            duration: 2.4,
            delay: bubble.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 shadow-panel ring-1 ring-white/30 backdrop-blur"
          initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <motion.span
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Waves className="h-10 w-10 text-white" />
          </motion.span>
        </motion.div>

        <motion.h1
          className="mt-5 text-3xl font-bold tracking-tight text-white"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Kaichecks
        </motion.h1>
        <motion.p
          className="mt-1 text-sm font-medium text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          Oahu beach water safety simulator
        </motion.p>

        {/* Progress track. */}
        <div className="mt-7 h-1.5 w-56 overflow-hidden rounded-full bg-white/20">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-300 to-cyan-300"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.9, ease: "easeInOut" }}
          />
        </div>
        <motion.span
          className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-white/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Charting the coastline
        </motion.span>
      </div>
    </div>
  );
}
