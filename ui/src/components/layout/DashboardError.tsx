"use client";

import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, ServerCrash } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { BackgroundShader } from "@/components/ui/background-shader";
import { getApiBaseUrl } from "@/lib/api";

export function DashboardError({
  onRetry,
  onRestart,
}: {
  onRetry: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-6">
      <BackgroundShader />

      <motion.div
        className="relative z-10 flex w-full max-w-md flex-col items-center rounded-3xl bg-white/15 p-8 text-center shadow-panel ring-1 ring-white/20 backdrop-blur"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-white ring-1 ring-white/30">
          <ServerCrash className="h-8 w-8" />
        </span>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
          Cannot reach the model
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          The prediction service did not respond, so there is nothing to show.
          This app uses live model output only and never falls back to sample
          data.
        </p>

        <code className="mt-4 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/20">
          {getApiBaseUrl()}
        </code>

        <div className="mt-6 flex w-full items-center gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onRestart}
            leadingIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to start
          </Button>
          <Button
            className="flex-1"
            onClick={onRetry}
            leadingIcon={<RefreshCw className="h-4 w-4" />}
          >
            Try again
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
