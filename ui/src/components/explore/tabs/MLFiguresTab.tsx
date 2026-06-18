"use client";

import { BarChart2 } from "lucide-react";

interface Figure {
  file: string;
  title: string;
  step: string;
  description: string;
  tags: string[];
}

const FIGURES: Figure[] = [
  {
    file: "/figures/ml/01_target_distribution.png",
    title: "Target Distribution",
    step: "Step 1 — Exploratory",
    description:
      "Enterococcus on raw and log1p scale. Raw values are heavily right-skewed — most samples are near zero with rare extreme spikes. The log transformation spreads the distribution and makes it learnable for a regressor.",
    tags: ["Data quality", "Regression target"],
  },
  {
    file: "/figures/ml/02_class_balance.png",
    title: "Class Balance",
    step: "Step 2 — Imbalance check",
    description:
      "31,403 safe samples vs 1,217 unsafe (3.7% unsafe rate). This strong imbalance is the central modelling challenge. A naive model predicting 'safe' every time would be 96% accurate and completely useless. XGBoost's scale_pos_weight = 22.63 compensates.",
    tags: ["Class imbalance", "Classifier"],
  },
  {
    file: "/figures/ml/03_rainfall_vs_exceedance.png",
    title: "Rainfall vs Exceedance Rate",
    step: "Step 3 — Hypothesis validation",
    description:
      "The core research hypothesis confirmed: the unsafe rate rises monotonically from 1.4% during dry spells to 20.9% after 100mm+ of antecedent rain. This validates that rainfall is the primary contamination driver before any model is trained.",
    tags: ["EDA", "Key finding"],
  },
  {
    file: "/figures/ml/04_pred_vs_actual.png",
    title: "Regressor: Predicted vs Actual",
    step: "Step 4 — Regressor evaluation",
    description:
      "Predicted vs actual enterococcus in log space. The regressor captures the overall trend but struggles with high-value outliers (test RMSE 0.943, R² = -0.105). It is kept as a secondary continuous estimate, not for safety decisions.",
    tags: ["Regressor", "Evaluation"],
  },
  {
    file: "/figures/ml/05_feature_importance.png",
    title: "Feature Importance (XGBoost)",
    step: "Step 5 — Model interpretability",
    description:
      "rain_48hr and rain_24hr are the strongest predictors — recent rainfall carries more signal than totals alone. Month (seasonality) ranks above rain_72hr, showing the wet/dry season strongly modulates risk independent of any single storm.",
    tags: ["Classifier", "Interpretability"],
  },
  {
    file: "/figures/ml/06_confusion_matrix.png",
    title: "Confusion Matrix",
    step: "Step 6 — Classifier evaluation",
    description:
      "Test set results (2014 onward): 4,796 true safe, 32 true unsafe caught, 963 false alarms, 52 missed unsafe days. The model errs toward caution (high false positive rate) — correct for a public health screening tool where missing an unsafe day is worse than a false alarm.",
    tags: ["Classifier", "Evaluation"],
  },
  {
    file: "/figures/ml/07_roc_pr.png",
    title: "ROC & Precision-Recall Curves",
    step: "Step 7 — Ranking quality",
    description:
      "XGBoost (AUC 0.665) and Random Forest (AUC 0.663) both outperform random. The low PR-AUC (0.072 vs baseline 0.014) reflects the class imbalance challenge — even a good model has low precision when unsafe samples are only 3.7% of the data.",
    tags: ["Classifier", "Random Forest", "Evaluation"],
  },
  {
    file: "/figures/ml/08_model_comparison.png",
    title: "Model Comparison",
    step: "Step 8 — Model selection",
    description:
      "Side-by-side scorecard on recall, F1, ROC AUC, and PR AUC. XGBoost classifier wins on recall (38% of unsafe days caught) and PR-AUC, which is why it is the deployed model. The regressor barely detects unsafe days despite similar ROC-AUC.",
    tags: ["Model selection", "All models"],
  },
  {
    file: "/figures/ml/09_top_beaches.png",
    title: "Top Beaches by Historical Risk",
    step: "Step 9 — Data insight",
    description:
      "Top 15 Oahu beaches by historical exceedance rate (minimum 100 samples). McCully Street Bridge (59%) and Ala Moana Bridge (48%) rank highest — both are freshwater-adjacent sites that receive direct stormwater discharge. These inform the Bayesian scaling in the live app.",
    tags: ["Beach catalog", "Historical data"],
  },
];

const TAG_COLORS: Record<string, string> = {
  "Data quality": "bg-ocean-50 text-ocean-600",
  "Regression target": "bg-ocean-50 text-ocean-600",
  "Class imbalance": "bg-coral-100 text-coral-600",
  "Classifier": "bg-caution-100 text-caution-500",
  "EDA": "bg-sage-50 text-sage-600",
  "Key finding": "bg-sage-100 text-sage-600",
  "Regressor": "bg-ocean-50 text-ocean-600",
  "Evaluation": "bg-sand-100 text-sand-500",
  "Interpretability": "bg-sage-50 text-sage-600",
  "Random Forest": "bg-sage-50 text-sage-600",
  "Model selection": "bg-caution-100 text-caution-500",
  "All models": "bg-caution-100 text-caution-500",
  "Beach catalog": "bg-ocean-50 text-ocean-600",
  "Historical data": "bg-ocean-50 text-ocean-600",
};

function FigureCard({ figure }: { figure: Figure }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ocean-100 transition-shadow hover:shadow-md">
      <div className="bg-ocean-50 p-3">
        <img
          src={figure.file}
          alt={figure.title}
          className="w-full rounded-lg object-contain"
          style={{ maxHeight: 280 }}
        />
      </div>
      <div className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ocean-400">
          {figure.step}
        </p>
        <h3 className="mt-0.5 text-sm font-bold text-ocean-800">{figure.title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-ocean-600">{figure.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {figure.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                TAG_COLORS[tag] ?? "bg-ocean-50 text-ocean-500"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const METRICS = [
  { model: "XGB Regressor", precision: "0.167", recall: "0.012", f1: "0.022", roc: "0.664", pr: "0.053", deployed: false },
  { model: "XGB Classifier", precision: "0.032", recall: "0.381", f1: "0.059", roc: "0.665", pr: "0.072", deployed: true },
  { model: "Random Forest", precision: "0.040", recall: "0.262", f1: "0.070", roc: "0.663", pr: "0.043", deployed: false },
];

export function MLFiguresTab() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ocean-100 text-ocean-600">
          <BarChart2 className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-ocean-900">Model & Findings</h1>
          <p className="text-sm text-ocean-500">
            9 diagnostic figures from the training notebook · XGBoost classifier + regressor + Random Forest baseline
          </p>
        </div>
      </div>

      {/* Context */}
      <div className="rounded-2xl bg-ocean-800 p-5 text-white">
        <h2 className="mb-2 text-sm font-bold">What the model does</h2>
        <p className="text-xs leading-relaxed text-ocean-200">
          Two XGBoost models are trained on the master dataset (32,620 samples, 84 beaches, pre-2014
          train / 2014+ test). The classifier predicts the probability that a water sample will
          exceed the EPA Beach Action Value of 130 CFU/100 mL. The regressor predicts the raw
          bacteria count in log space. Neither model knows about individual beaches — they learn a
          single rainfall-to-bacteria relationship across all Oahu. Individual beach risk is
          distributed post-prediction by the frontend using each beach's historical exceedance rate.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-ocean-700 px-3 py-1">7 rainfall features</span>
          <span className="rounded-full bg-ocean-700 px-3 py-1">Time-based train/test split</span>
          <span className="rounded-full bg-ocean-700 px-3 py-1">scale_pos_weight = 22.63</span>
          <span className="rounded-full bg-ocean-700 px-3 py-1">400 trees · depth 4 · lr 0.05</span>
        </div>
      </div>

      {/* Metrics table */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <h2 className="mb-3 text-sm font-bold text-ocean-800">
          Test Set Metrics (2014 onward, 5,843 rows, 84 unsafe)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ocean-100">
                {["Model", "Precision", "Recall", "F1", "ROC AUC", "PR AUC"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-ocean-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((m) => (
                <tr key={m.model} className={`border-b border-ocean-50 ${m.deployed ? "bg-sage-50" : ""}`}>
                  <td className="px-3 py-2.5 text-xs font-semibold text-ocean-800">
                    {m.model}
                    {m.deployed && (
                      <span className="ml-2 rounded-full bg-sage-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        DEPLOYED
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-xs text-ocean-700">{m.precision}</td>
                  <td className={`px-3 py-2.5 text-center font-mono text-xs font-bold ${m.deployed ? "text-sage-600" : "text-ocean-700"}`}>{m.recall}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-xs text-ocean-700">{m.f1}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-xs text-ocean-700">{m.roc}</td>
                  <td className={`px-3 py-2.5 text-center font-mono text-xs ${m.deployed ? "font-bold text-sage-600" : "text-ocean-700"}`}>{m.pr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ocean-400">
          Recall and PR AUC matter most — they measure how many of the rare unsafe days the model
          catches. Accuracy is misleading when 96% of samples are safe. The XGBoost classifier
          catches 38% of unsafe days at a precision of 3.2% (most alerts are false positives,
          intentionally erring toward caution).
        </p>
      </div>

      {/* Figures grid */}
      <div>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-ocean-400">
          9 Diagnostic Figures
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {FIGURES.map((fig) => (
            <FigureCard key={fig.file} figure={fig} />
          ))}
        </div>
      </div>
    </div>
  );
}
