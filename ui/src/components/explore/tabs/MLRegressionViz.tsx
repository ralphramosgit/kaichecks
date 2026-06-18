"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Static sample data - representative of the actual test-set distribution
// ---------------------------------------------------------------------------

const SAFE_SAMPLES = [
  { r: 2, c: 0.3 },
  { r: 5, c: 0.8 },
  { r: 8, c: 1.2 },
  { r: 12, c: 0.4 },
  { r: 15, c: 1.5 },
  { r: 18, c: 0.7 },
  { r: 22, c: 2.1 },
  { r: 25, c: 1.0 },
  { r: 28, c: 0.9 },
  { r: 32, c: 1.4 },
  { r: 35, c: 2.3 },
  { r: 38, c: 0.6 },
  { r: 42, c: 1.9 },
  { r: 45, c: 2.5 },
  { r: 48, c: 0.7 },
  { r: 52, c: 2.8 },
  { r: 55, c: 1.6 },
  { r: 58, c: 3.0 },
  { r: 62, c: 2.2 },
  { r: 65, c: 1.1 },
  { r: 68, c: 2.6 },
  { r: 72, c: 3.1 },
  { r: 75, c: 1.8 },
  { r: 78, c: 2.9 },
  { r: 82, c: 2.0 },
  { r: 85, c: 3.2 },
  { r: 88, c: 1.5 },
  { r: 92, c: 2.7 },
  { r: 95, c: 3.4 },
  { r: 98, c: 2.3 },
];

const UNSAFE_SAMPLES = [
  { r: 35, c: 5.1 },
  { r: 55, c: 6.2 },
  { r: 68, c: 5.8 },
  { r: 82, c: 7.1 },
  { r: 95, c: 5.5 },
  { r: 108, c: 6.8 },
];

// Regression line: nearly flat between 1.80 and 2.40 (never reaches BAV 4.87)
function regPredict(rain: number) {
  return 1.8 + 0.005 * rain;
}

const BAV = 4.87; // log1p(130 CFU)

// SVG layout constants
const W = 500,
  H = 220;
const PL = 38,
  PR = 20,
  PT = 14,
  PB = 28;
const PW = W - PL - PR;
const PH = H - PT - PB;

function xScale(rain: number) {
  return PL + (rain / 120) * PW;
}
function yScale(logCfu: number) {
  return PT + PH - (logCfu / 8) * PH;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MLRegressionViz() {
  const [rain, setRain] = useState(80);

  const prediction = regPredict(rain);
  const gap = BAV - prediction;
  const currentX = xScale(rain);
  const predY = yScale(prediction);
  const bavY = yScale(BAV);

  const regX0 = xScale(0);
  const regY0 = yScale(regPredict(0));
  const regX1 = xScale(120);
  const regY1 = yScale(regPredict(120));

  const midGapY = (predY + bavY) / 2;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
      <h3 className="mb-1 text-sm font-bold text-ocean-800">
        Interactive: why the regressor misses unsafe days
      </h3>
      <p className="mb-4 text-xs text-ocean-500">
        The orange regression line never approaches the BAV threshold (red
        dashed, 4.87). Predictions stay between 1.80 and 2.40 regardless of
        rainfall, so high-CFU samples (red dots above the line) are always
        missed. Drag the slider to see the gap.
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Axes */}
        <line
          x1={PL}
          y1={PT}
          x2={PL}
          y2={PT + PH}
          stroke="#A2DBEF"
          strokeWidth="1"
        />
        <line
          x1={PL}
          y1={PT + PH}
          x2={W - PR}
          y2={PT + PH}
          stroke="#A2DBEF"
          strokeWidth="1"
        />

        {/* Y ticks */}
        {[0, 2, 4, 6, 8].map((v) => (
          <g key={v}>
            <line
              x1={PL - 3}
              y1={yScale(v)}
              x2={PL}
              y2={yScale(v)}
              stroke="#A2DBEF"
              strokeWidth="1"
            />
            <text
              x={PL - 5}
              y={yScale(v) + 4}
              fontSize="9"
              fill="#6FC4E4"
              textAnchor="end"
            >
              {v}
            </text>
          </g>
        ))}

        {/* X ticks */}
        {[0, 30, 60, 90, 120].map((v) => (
          <g key={v}>
            <line
              x1={xScale(v)}
              y1={PT + PH}
              x2={xScale(v)}
              y2={PT + PH + 3}
              stroke="#A2DBEF"
              strokeWidth="1"
            />
            <text
              x={xScale(v)}
              y={PT + PH + 13}
              fontSize="9"
              fill="#6FC4E4"
              textAnchor="middle"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={W / 2}
          y={H - 1}
          fontSize="9"
          fill="#6FC4E4"
          textAnchor="middle"
        >
          rain_48hr (mm)
        </text>
        <text
          x={8}
          y={PT + PH / 2}
          fontSize="9"
          fill="#6FC4E4"
          textAnchor="middle"
          transform={`rotate(-90,8,${PT + PH / 2})`}
        >
          log1p(CFU)
        </text>

        {/* Unsafe zone shading */}
        <rect
          x={PL}
          y={PT}
          width={PW}
          height={bavY - PT}
          fill="#DD5C3C"
          opacity="0.04"
        />

        {/* BAV threshold line */}
        <line
          x1={PL}
          y1={bavY}
          x2={W - PR}
          y2={bavY}
          stroke="#DD5C3C"
          strokeWidth="1.5"
          strokeDasharray="5 3"
        />
        <text x={W - PR + 2} y={bavY + 4} fontSize="8" fill="#DD5C3C">
          BAV
        </text>

        {/* Safe samples */}
        {SAFE_SAMPLES.map((s, i) => (
          <circle
            key={i}
            cx={xScale(s.r)}
            cy={yScale(s.c)}
            r={3}
            fill="#3FA8D4"
            opacity="0.55"
          />
        ))}

        {/* Unsafe samples */}
        {UNSAFE_SAMPLES.map((s, i) => (
          <circle
            key={i}
            cx={xScale(s.r)}
            cy={yScale(s.c)}
            r={4}
            fill="#DD5C3C"
            opacity="0.85"
          />
        ))}

        {/* Regression line */}
        <line
          x1={regX0}
          y1={regY0}
          x2={regX1}
          y2={regY1}
          stroke="#E8BE5C"
          strokeWidth="2.5"
        />

        {/* Current rain vertical guide */}
        <line
          x1={currentX}
          y1={PT}
          x2={currentX}
          y2={PT + PH}
          stroke="#11526F"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity="0.5"
        />

        {/* Prediction dot */}
        <circle
          cx={currentX}
          cy={predY}
          r={5}
          fill="#E8BE5C"
          stroke="white"
          strokeWidth="2"
        />

        {/* Gap bracket */}
        {gap > 0.3 && (
          <g>
            <line
              x1={currentX + 10}
              y1={predY}
              x2={currentX + 10}
              y2={bavY}
              stroke="#DD5C3C"
              strokeWidth="1.5"
            />
            <line
              x1={currentX + 6}
              y1={predY}
              x2={currentX + 14}
              y2={predY}
              stroke="#DD5C3C"
              strokeWidth="1.5"
            />
            <line
              x1={currentX + 6}
              y1={bavY}
              x2={currentX + 14}
              y2={bavY}
              stroke="#DD5C3C"
              strokeWidth="1.5"
            />
            <text x={currentX + 16} y={midGapY + 4} fontSize="8" fill="#DD5C3C">
              {gap.toFixed(2)} gap
            </text>
          </g>
        )}

        {/* Legend */}
        <circle cx={PL + 8} cy={PT + 10} r={3} fill="#3FA8D4" opacity="0.55" />
        <text x={PL + 14} y={PT + 14} fontSize="9" fill="#11526F">
          Safe
        </text>
        <circle cx={PL + 48} cy={PT + 10} r={4} fill="#DD5C3C" opacity="0.85" />
        <text x={PL + 55} y={PT + 14} fontSize="9" fill="#11526F">
          Unsafe
        </text>
        <line
          x1={PL + 95}
          y1={PT + 10}
          x2={PL + 110}
          y2={PT + 10}
          stroke="#E8BE5C"
          strokeWidth="2.5"
        />
        <text x={PL + 113} y={PT + 14} fontSize="9" fill="#11526F">
          Prediction
        </text>
      </svg>

      {/* Slider */}
      <div className="mt-2 flex items-center gap-3">
        <span className="w-20 shrink-0 text-xs text-ocean-500">rain_48hr</span>
        <input
          type="range"
          min={0}
          max={120}
          value={rain}
          onChange={(e) => setRain(Number(e.target.value))}
          className="flex-1 accent-ocean-600"
        />
        <span className="w-12 shrink-0 text-right text-sm font-bold text-ocean-700">
          {rain}mm
        </span>
      </div>

      {/* Info cards */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-ocean-50 p-3 text-center">
          <p className="text-[10px] text-ocean-400">Model predicts</p>
          <p className="text-xl font-bold text-ocean-800">
            {prediction.toFixed(2)}
          </p>
          <p className="text-[10px] text-ocean-400">log1p(CFU)</p>
        </div>
        <div className="rounded-xl bg-coral-50 p-3 text-center ring-1 ring-coral-200">
          <p className="text-[10px] text-coral-400">BAV threshold</p>
          <p className="text-xl font-bold text-coral-700">4.87</p>
          <p className="text-[10px] text-coral-400">log1p(130 CFU)</p>
        </div>
        <div className="rounded-xl bg-caution-50 p-3 text-center ring-1 ring-caution-200">
          <p className="text-[10px] text-caution-500">Gap below BAV</p>
          <p className="text-xl font-bold text-caution-600">{gap.toFixed(2)}</p>
          <p className="text-[10px] text-caution-500">log units short</p>
        </div>
      </div>

      <p className="mt-3 text-xs italic text-ocean-400">
        No matter how high the rainfall, the regression line stays between 1.80
        and 2.40 log CFU. It never crosses the BAV at 4.87. When converted to
        binary by thresholding at 130 CFU, it predicts safe for almost every
        sample. This is why recall = 1.2% for the regressor. The regression loss
        function is dominated by the 96% safe majority and simply learns to
        predict their average, ignoring the unsafe outliers that matter most.
      </p>
    </div>
  );
}
