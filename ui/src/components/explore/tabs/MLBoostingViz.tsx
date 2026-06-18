"use client";

import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Play, Pause, RotateCcw } from "lucide-react";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const RAIN_MM = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

// Final probabilities at 400 trees, derived from exceedance pattern (Fig 03)
const FINAL_PROBS = [
  0.014, 0.018, 0.025, 0.035, 0.048, 0.065, 0.085, 0.105, 0.135, 0.158, 0.178,
  0.196, 0.209,
];

const BASE_RATE = 0.037; // flat prediction without scale_pos_weight

function convergence(n: number) {
  return 1 - Math.exp(-n / 55);
}

function buildChartData(nTrees: number) {
  const c = convergence(nTrees);
  return RAIN_MM.map((rain, i) => ({
    rain,
    withWeight: parseFloat(
      ((BASE_RATE + (FINAL_PROBS[i] - BASE_RATE) * c) * 100).toFixed(2),
    ),
    noWeight: parseFloat((BASE_RATE * 100).toFixed(2)),
  }));
}

// ---------------------------------------------------------------------------
// SVG decision tree (one example tree, depth 2)
// ---------------------------------------------------------------------------

function DecisionTreeDiagram() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
      <h3 className="mb-1 text-sm font-bold text-ocean-800">
        Structure of one tree (depth-2 example)
      </h3>
      <p className="mb-4 text-xs text-ocean-500">
        Each of the 400 trees is a shallow decision tree. XGBoost trains them
        one by one, each fitting the residual error left by the ensemble so far.
        With max_depth = 4, each tree can make up to 4 sequential splits and
        capture simple feature interactions.
      </p>

      <svg viewBox="0 0 500 196" className="mx-auto w-full max-w-lg">
        {/* Edges - level 0 to level 1 */}
        <line
          x1="250"
          y1="36"
          x2="120"
          y2="80"
          stroke="#A2DBEF"
          strokeWidth="1.5"
        />
        <line
          x1="250"
          y1="36"
          x2="380"
          y2="80"
          stroke="#A2DBEF"
          strokeWidth="1.5"
        />
        <text x="176" y="62" fontSize="9" fill="#6FC4E4" textAnchor="middle">
          YES
        </text>
        <text x="324" y="62" fontSize="9" fill="#6FC4E4" textAnchor="middle">
          NO
        </text>

        {/* Edges - level 1 to level 2 */}
        <line
          x1="120"
          y1="108"
          x2="58"
          y2="152"
          stroke="#A2DBEF"
          strokeWidth="1.5"
        />
        <line
          x1="120"
          y1="108"
          x2="182"
          y2="152"
          stroke="#A2DBEF"
          strokeWidth="1.5"
        />
        <line
          x1="380"
          y1="108"
          x2="318"
          y2="152"
          stroke="#A2DBEF"
          strokeWidth="1.5"
        />
        <line
          x1="380"
          y1="108"
          x2="442"
          y2="152"
          stroke="#A2DBEF"
          strokeWidth="1.5"
        />
        <text x="83" y="133" fontSize="9" fill="#6FC4E4" textAnchor="middle">
          YES
        </text>
        <text x="157" y="133" fontSize="9" fill="#6FC4E4" textAnchor="middle">
          NO
        </text>
        <text x="343" y="133" fontSize="9" fill="#6FC4E4" textAnchor="middle">
          YES
        </text>
        <text x="417" y="133" fontSize="9" fill="#6FC4E4" textAnchor="middle">
          NO
        </text>

        {/* Root node */}
        <rect x="162" y="8" width="176" height="30" rx="6" fill="#11526F" />
        <text
          x="250"
          y="28"
          fontSize="11"
          fill="white"
          textAnchor="middle"
          fontWeight="600"
        >
          {"rain_48hr <= 45mm?"}
        </text>

        {/* Level 1 */}
        <rect x="48" y="80" width="144" height="30" rx="6" fill="#EAF7FC" />
        <text
          x="120"
          y="99"
          fontSize="10"
          fill="#11526F"
          textAnchor="middle"
          fontWeight="600"
        >
          {"month <= 4 (spring)?"}
        </text>

        <rect x="308" y="80" width="144" height="30" rx="6" fill="#EAF7FC" />
        <text
          x="380"
          y="99"
          fontSize="10"
          fill="#11526F"
          textAnchor="middle"
          fontWeight="600"
        >
          {"rain_7day <= 28mm?"}
        </text>

        {/* Leaves */}
        <rect x="16" y="152" width="84" height="30" rx="6" fill="#D1EDDF" />
        <text
          x="58"
          y="171"
          fontSize="10"
          fill="#2D7A4F"
          textAnchor="middle"
          fontWeight="600"
        >
          2.1% unsafe
        </text>

        <rect x="140" y="152" width="84" height="30" rx="6" fill="#D1EDDF" />
        <text
          x="182"
          y="171"
          fontSize="10"
          fill="#2D7A4F"
          textAnchor="middle"
          fontWeight="600"
        >
          4.8% unsafe
        </text>

        <rect x="276" y="152" width="84" height="30" rx="6" fill="#FDEEC8" />
        <text
          x="318"
          y="171"
          fontSize="10"
          fill="#8A6020"
          textAnchor="middle"
          fontWeight="600"
        >
          6.2% unsafe
        </text>

        <rect x="400" y="152" width="84" height="30" rx="6" fill="#F9D5CB" />
        <text
          x="442"
          y="171"
          fontSize="10"
          fill="#8B3A24"
          textAnchor="middle"
          fontWeight="600"
        >
          13.4% unsafe
        </text>
      </svg>

      <p className="mt-3 text-[10px] text-ocean-400 text-center">
        The real model uses depth 4. Each of 400 trees contributes its
        prediction scaled by learning_rate = 0.05. The ensemble sum, passed
        through sigmoid, gives P(unsafe).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Boosting animation
// ---------------------------------------------------------------------------

const STAGE_LABELS: Array<[number, string]> = [
  [
    10,
    "Early training: predictions cluster near the base rate (3.7%). The model has not yet learned to differentiate rainfall levels.",
  ],
  [
    60,
    "Signal emerging: high-rainfall scenarios begin separating. Each new tree corrects residuals left by previous trees.",
  ],
  [
    180,
    "Converging: the probability curve stabilizes. New trees make progressively smaller corrections.",
  ],
  [
    350,
    "Mostly stable: learning_rate = 0.05 keeps each correction small, preventing overfitting.",
  ],
  [
    400,
    "Fully trained (400 trees). Gray dashed line shows predictions WITHOUT scale_pos_weight - flat at 3.7% for every rainfall level. The model would be useless without it.",
  ],
];

function getStageLabel(n: number) {
  for (const [limit, label] of STAGE_LABELS) {
    if (n <= limit) return label;
  }
  return STAGE_LABELS[STAGE_LABELS.length - 1][1];
}

export function MLBoostingViz() {
  const [nTrees, setNTrees] = useState(1);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setNTrees((n) => {
          if (n >= 400) {
            setPlaying(false);
            return 400;
          }
          return Math.min(n + (n < 30 ? 1 : n < 120 ? 4 : 8), 400);
        });
      }, 80);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing]);

  const data = buildChartData(nTrees);
  const at80 = data.find((d) => d.rain === 80)!;
  const converged = Math.round(convergence(nTrees) * 100);

  return (
    <div className="space-y-4">
      <DecisionTreeDiagram />

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <h3 className="mb-1 text-sm font-bold text-ocean-800">
          Interactive: probability curve as trees are added
        </h3>
        <p className="mb-4 text-xs text-ocean-500">
          Orange line shows P(unsafe) for each rainfall level at the current
          tree count. Gray dashed line shows what predictions look like WITHOUT
          scale_pos_weight (stuck at 3.7%). Hit play or drag the slider.
        </p>

        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ocean-700 text-white transition-colors hover:bg-ocean-800"
          >
            {playing ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setNTrees(1);
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ocean-100 text-ocean-600 transition-colors hover:bg-ocean-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <input
            type="range"
            min={1}
            max={400}
            value={nTrees}
            onChange={(e) => {
              setPlaying(false);
              setNTrees(Number(e.target.value));
            }}
            className="flex-1 accent-ocean-600"
          />
          <span className="w-20 shrink-0 text-right text-sm font-bold text-ocean-700">
            {nTrees} {nTrees === 1 ? "tree" : "trees"}
          </span>
        </div>

        <ResponsiveContainer width="100%" height={230}>
          <LineChart
            data={data}
            margin={{ top: 4, right: 20, bottom: 20, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#EAF7FC" />
            <XAxis
              dataKey="rain"
              tick={{ fontSize: 10, fill: "#6FC4E4" }}
              axisLine={false}
              tickLine={false}
              label={{
                value: "rain_48hr (mm)",
                position: "insideBottom",
                offset: -10,
                fontSize: 10,
                fill: "#6FC4E4",
              }}
            />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 10, fill: "#6FC4E4" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 25]}
            />
            <Tooltip
              formatter={(v: number, key: string) => [
                `${v.toFixed(1)}%`,
                key === "withWeight"
                  ? "With scale_pos_weight"
                  : "Without (baseline 3.7%)",
              ]}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid #A2DBEF",
              }}
            />
            <ReferenceLine
              x={80}
              stroke="#E8BE5C"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: "80mm",
                position: "insideTopRight",
                fontSize: 9,
                fill: "#E8BE5C",
              }}
            />
            <Line
              type="monotone"
              dataKey="noWeight"
              stroke="#C0D8E3"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="withWeight"
              stroke="#11526F"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-ocean-50 p-3 text-center">
            <p className="text-[10px] text-ocean-400">Trees trained</p>
            <p className="text-xl font-bold text-ocean-800">{nTrees}</p>
          </div>
          <div className="rounded-xl bg-ocean-50 p-3 text-center">
            <p className="text-[10px] text-ocean-400">P(unsafe) at 80mm</p>
            <p className="text-xl font-bold text-ocean-800">
              {at80.withWeight.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-xl bg-ocean-50 p-3 text-center">
            <p className="text-[10px] text-ocean-400">Converged</p>
            <p className="text-xl font-bold text-ocean-800">{converged}%</p>
          </div>
        </div>

        <p className="mt-3 text-xs italic text-ocean-400">
          {getStageLabel(nTrees)}
        </p>
      </div>
    </div>
  );
}
