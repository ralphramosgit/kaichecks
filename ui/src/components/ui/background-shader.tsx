"use client";

import { MeshGradient } from "@paper-design/shaders-react";

export function BackgroundShader() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <MeshGradient
        style={{ height: "100vh", width: "100vw" }}
        distortion={0.8}
        swirl={0.1}
        offsetX={0}
        offsetY={0}
        scale={1}
        rotation={0}
        speed={1}
        colors={[
          "hsl(216, 90%, 27%)",
          "hsl(243, 68%, 36%)",
          "hsl(205, 91%, 64%)",
          "hsl(211, 61%, 57%)",
        ]}
      />
    </div>
  );
}
