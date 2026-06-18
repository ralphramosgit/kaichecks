"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Tree definitions
// Each tree has a set of features it sampled (random subset) and an effective
// threshold - the rain_48hr level at which this tree votes "unsafe".
// Real trees use all 7 features simultaneously; this simplified view shows
// the threshold behaviour that emerges from different bootstrap samples.
// ---------------------------------------------------------------------------

const TREES = [
  {
    id: 1,
    features: ["rain_48hr", "rain_7day"],
    threshold: 72,
    note: "Weights 48hr and weekly accumulation equally. Fires when both are elevated.",
    rule: "rain_48hr",
  },
  {
    id: 2,
    features: ["rain_24hr", "month"],
    threshold: 48,
    note: "Very sensitive to same-day rain. Winter months lower the threshold further.",
    rule: "rain_24hr",
  },
  {
    id: 3,
    features: ["rain_72hr", "days_since_rain"],
    threshold: 85,
    note: "Conservative - requires a large 3-day total. Long dry spells raise its tolerance.",
    rule: "rain_72hr",
  },
  {
    id: 4,
    features: ["rain_48hr", "max_rain_3day"],
    threshold: 61,
    note: "Tracks peak daily intensity. A single heavy day in a 48hr window triggers it.",
    rule: "rain_48hr",
  },
  {
    id: 5,
    features: ["rain_24hr", "rain_7day"],
    threshold: 55,
    note: "The most sensitive tree in this sample. Trained on a wet-season-heavy bootstrap.",
    rule: "rain_24hr",
  },
];

// For the mini SVG tree inside each card (depth 1, single split)
function MiniTree({
  threshold,
  rain,
  feature,
}: {
  threshold: number;
  rain: number;
  feature: string;
}) {
  const fires = rain >= threshold;
  return (
    <svg viewBox="0 0 160 80" className="w-full">
      {/* Root box */}
      <rect x="30" y="4" width="100" height="22" rx="4" fill="#EAF7FC" />
      <text
        x="80"
        y="19"
        fontSize="8"
        fill="#11526F"
        textAnchor="middle"
        fontWeight="600"
      >
        {`${feature} >= ${threshold}mm?`}
      </text>

      {/* Edges */}
      <line
        x1="55"
        y1="26"
        x2="30"
        y2="52"
        stroke="#A2DBEF"
        strokeWidth="1.5"
      />
      <line
        x1="105"
        y1="26"
        x2="130"
        y2="52"
        stroke="#A2DBEF"
        strokeWidth="1.5"
      />
      <text x="37" y="44" fontSize="7" fill="#6FC4E4" textAnchor="middle">
        YES
      </text>
      <text x="123" y="44" fontSize="7" fill="#6FC4E4" textAnchor="middle">
        NO
      </text>

      {/* Leaf: YES = unsafe */}
      <rect
        x="4"
        y="52"
        width="52"
        height="22"
        rx="4"
        fill={fires ? "#F9D5CB" : "#F9D5CB"}
        opacity={fires ? 1 : 0.4}
      />
      <text
        x="30"
        y="66"
        fontSize="8"
        fill={fires ? "#8B3A24" : "#C0909A"}
        textAnchor="middle"
        fontWeight="600"
      >
        UNSAFE
      </text>

      {/* Leaf: NO = safe */}
      <rect
        x="104"
        y="52"
        width="52"
        height="22"
        rx="4"
        fill={!fires ? "#D1EDDF" : "#D1EDDF"}
        opacity={!fires ? 1 : 0.4}
      />
      <text
        x="130"
        y="66"
        fontSize="8"
        fill={!fires ? "#2D7A4F" : "#7AAA8A"}
        textAnchor="middle"
        fontWeight="600"
      >
        SAFE
      </text>

      {/* Active path highlight */}
      {fires ? (
        <line
          x1="55"
          y1="26"
          x2="30"
          y2="52"
          stroke="#DD5C3C"
          strokeWidth="2.5"
        />
      ) : (
        <line
          x1="105"
          y1="26"
          x2="130"
          y2="52"
          stroke="#3FA8D4"
          strokeWidth="2.5"
        />
      )}

      {/* Current rain dot on root */}
      <circle cx="80" cy="15" r="3" fill={fires ? "#DD5C3C" : "#3FA8D4"} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MLForestViz() {
  const [rain, setRain] = useState(65);

  const votes = TREES.map((t) => ({
    ...t,
    fires: rain >= t.threshold,
  }));

  const unsafeCount = votes.filter((v) => v.fires).length;
  const probability = unsafeCount / TREES.length;
  const prediction = probability >= 0.5 ? "UNSAFE" : "SAFE";
  const pct = Math.round(probability * 100);

  return (
    <div className="space-y-4">
      {/* Bootstrap sampling explanation */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <h3 className="mb-1 text-sm font-bold text-ocean-800">
          How bootstrap sampling creates tree diversity
        </h3>
        <p className="mb-3 text-xs text-ocean-500">
          Before training each tree, the Random Forest draws a bootstrap sample:
          a random selection of training rows with replacement, typically the
          same size as the training set. About 63% of rows appear in any given
          bootstrap sample; the rest are out-of-bag (OOB). Each tree also
          considers only sqrt(7) = 2-3 randomly chosen features at each split.
          The result is 100 trees that all see slightly different data and use
          different features, so their errors are uncorrelated - and averaging
          them cancels much of the noise.
        </p>

        <svg viewBox="0 0 500 80" className="w-full">
          {/* Training set */}
          <rect x="0" y="20" width="120" height="40" rx="6" fill="#EAF7FC" />
          <text
            x="60"
            y="36"
            fontSize="9"
            fill="#11526F"
            textAnchor="middle"
            fontWeight="600"
          >
            Training set
          </text>
          <text x="60" y="50" fontSize="8" fill="#6FC4E4" textAnchor="middle">
            26,777 samples
          </text>

          {/* Arrow */}
          <line
            x1="120"
            y1="40"
            x2="170"
            y2="40"
            stroke="#A2DBEF"
            strokeWidth="1.5"
          />
          <text x="145" y="35" fontSize="8" fill="#6FC4E4" textAnchor="middle">
            sample
          </text>
          <text x="145" y="55" fontSize="8" fill="#6FC4E4" textAnchor="middle">
            with replace.
          </text>

          {/* Bootstrap samples */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect
                x={180 + i * 108}
                y={14}
                width={96}
                height={52}
                rx="6"
                fill={["#EAF7FC", "#EDF7F0", "#FDF8EC"][i]}
              />
              <text
                x={228 + i * 108}
                y={34}
                fontSize="8"
                fill="#11526F"
                textAnchor="middle"
                fontWeight="600"
              >
                {`Bootstrap ${i + 1}`}
              </text>
              <text
                x={228 + i * 108}
                y={46}
                fontSize="7"
                fill="#6FC4E4"
                textAnchor="middle"
              >
                ~63% unique rows
              </text>
              <text
                x={228 + i * 108}
                y={57}
                fontSize="7"
                fill="#6FC4E4"
                textAnchor="middle"
              >
                {
                  [
                    `features: 48hr, 7d`,
                    `features: 24hr, mo`,
                    `features: 72hr, ds`,
                  ][i]
                }
              </text>
            </g>
          ))}

          <text x="480" y="44" fontSize="8" fill="#6FC4E4" textAnchor="middle">
            ... x100
          </text>
        </svg>
      </div>

      {/* Voting visualization */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <h3 className="mb-1 text-sm font-bold text-ocean-800">
          Interactive: majority voting across 5 representative trees
        </h3>
        <p className="mb-4 text-xs text-ocean-500">
          Drag the slider to change rain_48hr. Each tree evaluates the input
          using its own learned threshold (a simplification - real trees use all
          7 features). The final prediction is the majority vote: 3 or more
          trees must agree for a prediction of UNSAFE.
        </p>

        {/* Slider */}
        <div className="mb-5 flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-ocean-500">
            rain_48hr
          </span>
          <input
            type="range"
            min={0}
            max={120}
            value={rain}
            onChange={(e) => setRain(Number(e.target.value))}
            className="flex-1 accent-ocean-600"
          />
          <span className="w-16 shrink-0 text-right text-sm font-bold text-ocean-700">
            {rain}mm
          </span>
        </div>

        {/* Tree cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {votes.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl p-3 transition-all ${
                t.fires
                  ? "bg-coral-50 ring-1 ring-coral-300"
                  : "bg-sage-50 ring-1 ring-sage-200"
              }`}
            >
              <p className="mb-1 text-[10px] font-bold text-ocean-500">
                Tree {t.id}
              </p>
              <div className="flex flex-wrap gap-1">
                {t.features.map((f) => (
                  <span
                    key={f}
                    className="rounded bg-white px-1 py-0.5 font-mono text-[8px] text-ocean-600 shadow-sm"
                  >
                    {f}
                  </span>
                ))}
              </div>

              <MiniTree threshold={t.threshold} rain={rain} feature={t.rule} />

              <div
                className={`mt-1 rounded-full py-0.5 text-center text-[10px] font-bold ${
                  t.fires ? "bg-coral-500 text-white" : "bg-sage-500 text-white"
                }`}
              >
                {t.fires ? "UNSAFE" : "SAFE"}
              </div>
            </div>
          ))}
        </div>

        {/* Vote result */}
        <div className="mt-5 rounded-xl bg-ocean-800 p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-ocean-300">
                {unsafeCount} of {TREES.length} trees vote UNSAFE
              </p>
              <p
                className={`text-2xl font-bold ${
                  prediction === "UNSAFE" ? "text-coral-400" : "text-sage-400"
                }`}
              >
                {prediction}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ocean-300">Ensemble probability</p>
              <p className="text-2xl font-bold">{pct}%</p>
              <p className="text-[10px] text-ocean-400">threshold: 50%</p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ocean-700">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                prediction === "UNSAFE" ? "bg-coral-400" : "bg-sage-400"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-ocean-400">
            {probability >= 0.5
              ? `${unsafeCount}/${TREES.length} = ${pct}% exceeds the 50% threshold. Prediction: UNSAFE.`
              : `${unsafeCount}/${TREES.length} = ${pct}% is below the 50% threshold. Prediction: SAFE.`}
          </p>
        </div>

        <p className="mt-3 text-xs italic text-ocean-400">
          This shows 5 of the 100 trees in the deployed model. Real Random
          Forest voting uses all 100 trees. class_weight=balanced ensures each
          tree treats the rare unsafe class as 22.63x more important than the
          safe class when choosing splits.
        </p>
      </div>
    </div>
  );
}
