"use client";

import { Warp } from "@paper-design/shaders-react";

import { cn } from "@/lib/utils";

/**
 * Silky animated ocean rendered with a WebGL warp shader. Used as the living
 * water backdrop behind the Oahu map. The colors run from deep ocean to pale
 * foam so the island and floating panels stay legible on top.
 *
 * A static CSS gradient sits underneath as a paint-in fallback (and for the
 * brief moment before the shader initializes or when WebGL is unavailable).
 */
export function SilkBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        "bg-gradient-to-b from-ocean-100 via-ocean-200 to-ocean-400",
        className,
      )}
      aria-hidden
    >
      <Warp
        style={{ width: "100%", height: "100%" }}
        colors={["#0a4d68", "#1f7fa8", "#3FA8D4", "#9FD7EE", "#EAF8FF"]}
        speed={0.55}
        rotation={38}
        proportion={0.5}
        softness={1}
        shape="stripes"
        shapeScale={0.28}
        distortion={0.22}
        swirl={0.82}
        swirlIterations={8}
        scale={1.1}
      />

      {/* Depth and legibility wash: lighten the top, deepen the lower edges. */}
      <div className="absolute inset-0 bg-gradient-to-b from-foam/40 via-transparent to-ocean-500/25" />
    </div>
  );
}
