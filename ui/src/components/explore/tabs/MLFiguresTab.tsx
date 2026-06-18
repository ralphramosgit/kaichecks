"use client";

import { useState } from "react";
import {
  BarChart2, X, Lightbulb, FlaskConical, BookOpen, Expand,
  Zap, TrendingUp, Trees, CheckCircle2, XCircle, AlertTriangle,
  Target, GitBranch, Layers,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MLSubTab = "overview" | "xgb-classifier" | "xgb-regressor" | "random-forest";

interface Figure {
  file: string;
  title: string;
  step: string;
  tags: string[];
  whatItIs: string;
  howProduced: string;
  insights: string[];
}

// ---------------------------------------------------------------------------
// Figure data (9 diagnostic plots)
// ---------------------------------------------------------------------------

const FIGURES: Figure[] = [
  {
    file: "/figures/ml/01_target_distribution.png",
    title: "Target Distribution",
    step: "Step 1: Exploratory Analysis",
    tags: ["Data quality", "Regression target"],
    whatItIs:
      "Two histograms side by side showing the distribution of enterococcus bacteria counts in the master dataset. The left panel shows raw CFU/100 mL values. The right shows the same values after a log1p transformation, with a red dashed BAV threshold line at log1p(130) = 4.87.",
    howProduced:
      "Plotted from the enterococcus column in master_dataset.csv. The log1p transform is log(x + 1), which handles zero values without breaking. The red dashed BAV line is drawn at the log1p of 130 (the EPA Beach Action Value). Both histograms use the same sample set of 32,620 rows.",
    insights: [
      "On the raw scale, over 96% of samples are compressed into the first bar near zero, making the distribution unlearnable for a regressor.",
      "The log transform spreads values across the full range and reveals a multi-modal structure that the model can actually fit.",
      "The BAV line sits far to the right of the main mass, confirming that dangerous readings are rare outliers in the dataset and reinforcing the class imbalance problem.",
      "This directly justifies training the XGBRegressor on log1p(enterococcus) rather than the raw value. The loss function can now treat all samples fairly instead of being dominated by a handful of extreme readings.",
    ],
  },
  {
    file: "/figures/ml/02_class_balance.png",
    title: "Class Balance",
    step: "Step 2: Imbalance Check",
    tags: ["Class imbalance", "Classifier"],
    whatItIs:
      "A bar chart showing the count of safe (unsafe = 0) versus unsafe (unsafe = 1) samples in the master dataset. Safe: 31,403 samples. Unsafe: 1,217 samples. Overall unsafe rate: 3.7%.",
    howProduced:
      "Computed as a simple value count of the binary unsafe column in master_dataset.csv. No modelling involved; this is a raw count of the training labels produced by the data preparation pipeline.",
    insights: [
      "Only 1 in 27 samples is unsafe. A naive classifier that always predicts safe would score 96.3% accuracy while catching zero unsafe days.",
      "Standard accuracy is a completely meaningless metric for this problem. Recall and PR AUC are the right measures.",
      "The imbalance ratio of 25.8:1 directly sets XGBoost's scale_pos_weight = 22.63, which makes each unsafe training sample count as 22 safe samples in the loss function.",
      "Random Forest addresses this identically using class_weight='balanced', which reweights each sample inversely proportional to its class frequency.",
      "Without this correction, both models would learn to predict safe on every input and report a deceptively high accuracy.",
    ],
  },
  {
    file: "/figures/ml/03_rainfall_vs_exceedance.png",
    title: "Rainfall vs Exceedance Rate",
    step: "Step 3: Hypothesis Validation",
    tags: ["EDA", "Key finding"],
    whatItIs:
      "A bar chart showing the fraction of water samples that exceeded 130 CFU (the unsafe rate) across 7 bins of 7-day antecedent rainfall: 0-1mm, 1-5mm, 5-10mm, 10-25mm, 25-50mm, 50-100mm, and 100+mm.",
    howProduced:
      "The rain_7day column in master_dataset.csv was binned using pd.cut() into those 7 ranges. The unsafe rate per bin was computed as mean(unsafe) multiplied by 100 to get a percentage. No model was involved; this is a direct aggregation of the training data.",
    insights: [
      "The unsafe rate rises monotonically from 1.4% (dry spell) to 20.9% (100mm+), a 15x increase. This confirms the research hypothesis before any model is trained.",
      "Even at 100mm+, only 21% of samples are unsafe. Rainfall is strongly predictive but not deterministic. Beach location, drainage infrastructure, tidal state, and dilution all play roles the model cannot see.",
      "The step between 25-50mm and 50-100mm (7% to 10.6%) is smaller than expected, suggesting a saturation effect where additional rainfall has diminishing marginal impact on contamination.",
      "This figure is the clearest single justification for the whole project. If rainfall had no relationship to exceedance rate, none of the modelling would make sense.",
      "The modest slope explains the honest ROC AUC of 0.665. A stronger signal would produce a higher ceiling. The model is only as good as the underlying relationship allows.",
    ],
  },
  {
    file: "/figures/ml/04_pred_vs_actual.png",
    title: "Regressor: Predicted vs Actual",
    step: "Step 4: Regressor Evaluation",
    tags: ["Regressor", "Evaluation"],
    whatItIs:
      "A scatter plot of predicted log1p(CFU) vs actual log1p(CFU) on the held-out test set (2014 onward, 5,843 samples). Each point is one water sample. The black dashed line is perfect prediction. The red dotted lines mark the BAV threshold at log1p(130) = 4.87 on both axes.",
    howProduced:
      "The XGBRegressor was trained on pre-2014 data and used to predict on X_test (2014 onward). Predictions were compared to y_test (log1p of actual enterococcus). Test set metrics computed: RMSE 0.943, MAE 0.740, R2 = -0.105.",
    insights: [
      "R2 = -0.105 means the regressor performs worse than simply predicting the training mean for every sample. It has not learned a useful function.",
      "Predictions cluster around 2.0 log units regardless of actual values. The model learned the average behavior across all conditions but not the extreme values that matter most.",
      "Most truly unsafe samples (right of the vertical BAV line) are predicted below the BAV (below the horizontal line). The regressor systematically under-predicts high readings.",
      "This is why the regressor is kept only as a secondary continuous bacteria estimate in the app, not for safety decisions. The XGB classifier is deployed instead.",
      "The wide scatter in both axes reveals that individual sample readings contain high noise that 7 rainfall features simply cannot capture. A perfect rainfall predictor would still have substantial residual error.",
    ],
  },
  {
    file: "/figures/ml/05_feature_importance.png",
    title: "Feature Importance (XGBoost)",
    step: "Step 5: Model Interpretability",
    tags: ["Classifier", "Interpretability"],
    whatItIs:
      "A horizontal bar chart of XGBoost classifier feature importance by gain for all 7 training features. Gain measures the average improvement in the model loss function each time a feature is used to split a tree node, averaged across all 400 trees.",
    howProduced:
      "Called xgb_classifier.get_booster().get_score(importance_type='gain') on the trained classifier. The raw gain values were normalized to sum to 1.0 for relative comparison. Importance type 'gain' is preferred over 'weight' (split count) because it measures actual predictive value, not just usage frequency.",
    insights: [
      "rain_48hr is the single most important feature (relative importance 0.22), slightly ahead of rain_24hr (0.21). The 24-48 hour window captures the peak of urban runoff reaching the coast after a storm.",
      "Month ranks 3rd (0.14), above rain_72hr. Seasonal context is more predictive than the 3-day total, showing that the same amount of rain is more dangerous in winter when soil saturation and baseline water levels are higher.",
      "days_since_rain is least important (0.07), likely because its information is largely redundant with rain_24hr being zero. Dry spell duration adds marginal signal once recent rain is already known.",
      "All 7 features contribute meaningfully with no near-zero values. This validates that each rainfall window captures a distinct and useful aspect of contamination risk.",
      "The dominance of short-window features (24hr and 48hr) over long-window ones (7day) is consistent with the known physics of urban runoff: bacteria load peaks 1-3 days after rain, not a week later.",
    ],
  },
  {
    file: "/figures/ml/06_confusion_matrix.png",
    title: "Confusion Matrix",
    step: "Step 6: Classifier Evaluation",
    tags: ["Classifier", "Evaluation"],
    whatItIs:
      "A 2x2 confusion matrix for the XGBoost classifier on the held-out test set (2014 onward, 5,843 samples, 84 truly unsafe days). Rows represent actual labels. Columns represent predicted labels.",
    howProduced:
      "XGBClassifier.predict(X_test) at the default 0.5 probability threshold, compared against y_test. The four cells: true negatives (safe predicted safe), false positives (safe predicted unsafe), false negatives (unsafe predicted safe), true positives (unsafe predicted unsafe).",
    insights: [
      "True negatives: 4,796. Safe days correctly identified. The model is very good at recognizing safe conditions.",
      "False positives: 963. Safe days incorrectly flagged as unsafe. This is a 20% false alarm rate among safe days, which is acceptable for a public health screening tool that prioritizes catching dangerous days.",
      "False negatives: 52. Unsafe days the model completely missed. These are the dangerous outcomes: beaches that should have been flagged were not.",
      "True positives: 32. Of the 84 truly unsafe test days, the model caught 32 (recall = 38%). It misses 62% of unsafe days, but this is a real improvement over zero detection.",
      "For this use case, false negatives (missed unsafe days) are more costly than false positives (unnecessary beach closures). The model correctly prioritizes recall by erring toward caution.",
      "Lowering the decision threshold below 0.5 would catch more unsafe days but at the cost of even more false alarms, a deliberate tradeoff the deployed app leaves to the user.",
    ],
  },
  {
    file: "/figures/ml/07_roc_pr.png",
    title: "ROC and Precision-Recall Curves",
    step: "Step 7: Ranking Quality",
    tags: ["Classifier", "Random Forest", "Evaluation"],
    whatItIs:
      "Two side-by-side evaluation curves. Left: the ROC curve (true positive rate vs false positive rate) for both XGBoost and Random Forest classifiers, with the no-skill diagonal. Right: the Precision-Recall curve for both models, with the dataset base rate (3.7%) shown as a dashed baseline.",
    howProduced:
      "sklearn's roc_curve() and precision_recall_curve() functions were applied to the predicted class probabilities from both models on the test set. Curves are computed across all possible probability thresholds, not just the default 0.5 cutoff.",
    insights: [
      "XGBoost ROC AUC 0.665, Random Forest AUC 0.663, nearly identical ranking quality despite having different architectures.",
      "Both comfortably outperform the no-skill diagonal (AUC 0.5), confirming that the models learned something real from rainfall.",
      "PR-AUC 0.072 vs the 0.014 baseline, 5x better than random on the PR curve. The low absolute value is not a failure; it directly reflects how difficult precision is at a 3.7% base rate.",
      "Using predicted probabilities rather than hard binary predictions produces smoother curves. The model has genuine confidence gradients, not just on/off outputs.",
      "The ROC curves diverge most at low false positive rates on the left side, the operationally relevant region where a safety tool needs to catch unsafe days without generating excessive false alarms.",
    ],
  },
  {
    file: "/figures/ml/08_model_comparison.png",
    title: "Model Comparison",
    step: "Step 8: Model Selection",
    tags: ["Model selection", "All models"],
    whatItIs:
      "A grouped bar chart comparing recall, F1, ROC AUC, and PR AUC across three trained models: XGB Regressor (threshold-converted to binary predictions at 130 CFU), XGB Classifier, and Random Forest Classifier.",
    howProduced:
      "All three models were evaluated on the same held-out test set (2014 onward). The regressor was converted to binary predictions by applying expm1() to inverse the log transform, then thresholding at 130 CFU. sklearn.metrics computed all four scores for each model.",
    insights: [
      "The XGB Regressor has near-zero recall (0.012) despite having the same ROC AUC as the others. Optimizing for mean regression error is fundamentally the wrong objective for rare-event detection.",
      "All three models share nearly identical ROC AUC of about 0.665. The predictive ceiling is set by the data, not the model; all three models extract approximately the same total signal from 7 rainfall features.",
      "The key differentiator is recall: XGB Classifier (38%) vs Random Forest (26%) vs Regressor (1%). The classifier was selected because scale_pos_weight directly trains it to catch unsafe days.",
      "Random Forest is a close second and could be deployed. Its lower recall (26%) means it would miss more unsafe days, making it less appropriate for a safety-focused tool.",
      "This chart makes the deployment decision clear: the XGB Classifier is not better in every metric, but it is better on the one metric that matters most for public health screening.",
    ],
  },
  {
    file: "/figures/ml/09_top_beaches.png",
    title: "Top Beaches by Historical Risk",
    step: "Step 9: Data Insight",
    tags: ["Beach catalog", "Historical data"],
    whatItIs:
      "A horizontal bar chart of the top 15 Oahu beaches by historical exceedance rate, restricted to beaches with at least 100 water quality samples on record. Values come from beach_catalog.csv, which is a summary of the master dataset.",
    howProduced:
      "beach_catalog.csv was filtered to beaches with n >= 100 samples, sorted by exceed_rate descending, and the top 15 were plotted. The exceedance rate for each beach is simply the fraction of its historical samples that exceeded 130 CFU.",
    insights: [
      "McCully Street Bridge (59%) and Ala Moana Bridge (48%) are not ocean swimming beaches. They are freshwater stream monitoring points in the DOH dataset that receive direct stormwater discharge. Their extreme rates reflect structural contamination, not weather-driven risk.",
      "Kahana Bay Beach (21%) is a genuine ocean swimming beach with unusually high risk due to its location at the mouth of Kahana Stream on the Windward coast.",
      "These historical rates feed directly into the Bayesian probability scaling in the live app. A beach with twice the island average exceedance rate gets twice the odds of being unsafe for any given storm scenario.",
      "The wide range from 3% to 59% confirms that treating all 84 beaches identically would produce misleading results. Individual beach history is essential for meaningful risk distribution.",
      "Beaches with fewer than 100 samples were excluded because a beach with 5 clean samples showing 0% exceedance tells us almost nothing; the Bayesian prior pulls sparse beaches toward the island average.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Tag colors
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Figure card and modal
// ---------------------------------------------------------------------------

function FigureCard({ figure, onClick }: { figure: Figure; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-ocean-100 transition-all hover:shadow-md hover:ring-ocean-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-400"
    >
      <div className="relative bg-ocean-50 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={figure.file}
          alt={figure.title}
          className="w-full rounded-lg object-contain"
          style={{ maxHeight: 220 }}
        />
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-ocean-900/0 transition-all group-hover:bg-ocean-900/10">
          <span className="flex items-center gap-1.5 rounded-full bg-white/0 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow transition-all group-hover:bg-ocean-700/90 group-hover:opacity-100">
            <Expand className="h-3.5 w-3.5" />
            View details
          </span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ocean-400">{figure.step}</p>
        <h3 className="mt-0.5 text-sm font-bold text-ocean-800">{figure.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ocean-500">{figure.whatItIs}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {figure.tags.map((tag) => (
            <span
              key={tag}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${TAG_COLORS[tag] ?? "bg-ocean-50 text-ocean-500"}`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function FigureModal({ figure, onClose }: { figure: Figure; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ocean-900/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative my-8 w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-ocean-50 text-ocean-500 transition-colors hover:bg-ocean-100 hover:text-ocean-700"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="rounded-t-3xl bg-ocean-50 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={figure.file}
            alt={figure.title}
            className="mx-auto w-full rounded-xl object-contain"
            style={{ maxHeight: 360 }}
          />
        </div>
        <div className="space-y-6 p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ocean-400">{figure.step}</p>
            <h2 className="mt-0.5 text-xl font-bold text-ocean-900">{figure.title}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {figure.tags.map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TAG_COLORS[tag] ?? "bg-ocean-50 text-ocean-500"}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-ocean-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-ocean-500" />
              <h3 className="text-xs font-bold uppercase tracking-wide text-ocean-600">What it is</h3>
            </div>
            <p className="text-sm leading-relaxed text-ocean-700">{figure.whatItIs}</p>
          </div>
          <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
            <div className="mb-2 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-sand-500" />
              <h3 className="text-xs font-bold uppercase tracking-wide text-sand-500">How it was produced</h3>
            </div>
            <p className="text-sm leading-relaxed text-ocean-700">{figure.howProduced}</p>
          </div>
          <div className="rounded-2xl bg-sage-50 p-4 ring-1 ring-sage-200">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-sage-600" />
              <h3 className="text-xs font-bold uppercase tracking-wide text-sage-600">Key insights</h3>
            </div>
            <ul className="space-y-2.5">
              {figure.insights.map((insight, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ocean-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-500 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ icon, label, title, sub }: { icon: JSX.Element; label: string; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ocean-100 text-ocean-600">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-ocean-400">{label}</p>
        <h2 className="text-lg font-bold text-ocean-900">{title}</h2>
        <p className="mt-0.5 text-sm text-ocean-500">{sub}</p>
      </div>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-ocean-50 p-4">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ocean-500">{title}</p>
      <p className="text-sm leading-relaxed text-ocean-700">{body}</p>
    </div>
  );
}

function DecisionCard({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ocean-700 text-xs font-bold text-white">
        {n}
      </span>
      <div>
        <p className="text-sm font-bold text-ocean-800">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ocean-600">{body}</p>
      </div>
    </div>
  );
}

function ProConRow({ type, text }: { type: "pro" | "con" | "warn"; text: string }) {
  if (type === "pro") return (
    <li className="flex items-start gap-2 text-sm text-ocean-700">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage-500" />
      {text}
    </li>
  );
  if (type === "con") return (
    <li className="flex items-start gap-2 text-sm text-ocean-700">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" />
      {text}
    </li>
  );
  return (
    <li className="flex items-start gap-2 text-sm text-ocean-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-caution-500" />
      {text}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Metrics table (shared)
// ---------------------------------------------------------------------------

const METRICS = [
  { model: "XGB Regressor", precision: "0.167", recall: "0.012", f1: "0.022", roc: "0.664", pr: "0.053", deployed: false },
  { model: "XGB Classifier", precision: "0.032", recall: "0.381", f1: "0.059", roc: "0.665", pr: "0.072", deployed: true },
  { model: "Random Forest", precision: "0.040", recall: "0.262", f1: "0.070", roc: "0.663", pr: "0.043", deployed: false },
];

function MetricsTable({ highlight }: { highlight?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
      <h2 className="mb-1 text-sm font-bold text-ocean-800">Test Set Performance</h2>
      <p className="mb-4 text-xs text-ocean-400">2014 onward, 5,843 rows, 84 truly unsafe days</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ocean-100">
              {["Model", "Precision", "Recall", "F1", "ROC AUC", "PR AUC"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-ocean-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => (
              <tr
                key={m.model}
                className={`border-b border-ocean-50 transition-colors ${
                  highlight && m.model === highlight
                    ? "bg-ocean-100 font-semibold"
                    : m.deployed
                    ? "bg-sage-50"
                    : ""
                }`}
              >
                <td className="px-3 py-2.5 text-xs font-semibold text-ocean-800">
                  {m.model}
                  {m.deployed && (
                    <span className="ml-2 rounded-full bg-sage-500 px-1.5 py-0.5 text-[9px] font-bold text-white">DEPLOYED</span>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({ onFigureClick }: { onFigureClick: (f: Figure) => void }) {
  return (
    <div className="space-y-8">
      {/* Extended overview */}
      <div className="rounded-3xl bg-ocean-800 p-6 text-white">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-ocean-300">Project Overview</p>
        <h2 className="mb-4 text-xl font-bold leading-snug">
          Predicting beach water safety from rainfall on Oahu
        </h2>

        <div className="space-y-3 text-sm leading-relaxed text-ocean-200">
          <p>
            Hawaii&apos;s beach water quality is primarily driven by nonpoint source pollution carried
            by stormwater runoff. When it rains, bacteria, sediment, and sewage overflow from
            streams, storm drains, and agriculture wash into the nearshore ocean. The Hawaii
            Department of Health Clean Water Branch monitors 84 beaches across Oahu and issues
            advisories when enterococcus bacteria exceed 130 CFU/100 mL, the EPA Beach Action Value (BAV).
            The problem is that sampling is infrequent (roughly weekly), so there are many days
            between measurements where the true safety status is unknown.
          </p>
          <p>
            This project asks a specific question: can we predict whether a water sample would
            exceed 130 CFU based only on recent rainfall data? If rainfall is predictive enough,
            we can fill in the gaps between measurements and provide a real-time risk estimate on
            days when no sample exists. The answer is yes, but with important caveats.
          </p>
          <p>
            The master dataset joins 34 years of DOH water quality samples (32,620 rows,
            1990-2024) with antecedent rainfall from 35 rain gauges matched to each beach via
            Haversine distance. Seven rainfall features were engineered: precipitation totals
            over the prior 24 hours, 48 hours, 72 hours, and 7 days; the maximum single-day
            rainfall in any 3-day window; the number of days since measurable rain last fell;
            and calendar month as a seasonality proxy.
          </p>
          <p>
            The dataset has a critical class imbalance: only 3.7% of samples are unsafe (1,217
            of 32,620). This is not a data quality problem but a real feature of the system.
            Oahu&apos;s beaches are safe the vast majority of the time. But it means that standard
            accuracy is a useless metric and any model that ignores the imbalance will simply
            learn to predict safe for every input and score 96.3% accuracy while catching
            zero unsafe days. All three models trained here explicitly correct for this.
          </p>
          <p>
            The train/test split is strictly time-based: all samples before 2014 form the
            training set (26,777 rows) and all samples from 2014 onward form the test set
            (5,843 rows, 84 unsafe). This is intentional. A random split would allow future
            observations to inform the model&apos;s training, inflating performance estimates and
            hiding whether the model can generalize to genuinely unseen conditions. A time-based
            split is the honest evaluation.
          </p>
          <p>
            Three models were trained: an XGBoost Regressor targeting continuous log1p(CFU),
            an XGBoost Classifier targeting the binary unsafe label, and a Random Forest
            Classifier as a baseline. The XGBoost Classifier was selected for deployment
            because it achieved the highest recall (38%) and the highest PR AUC (0.072), the
            two metrics that matter most when catching rare dangerous events is the goal.
            The regressor is retained as a secondary estimate of bacterial concentration
            displayed alongside the binary prediction in the live application.
          </p>
          <p>
            Island-wide model probabilities are then distributed to individual beaches using
            Bayesian scaling. Each beach has a historical exceedance rate computed from its
            full DOH sample history. A beach with double the island-average historical rate
            gets double the adjusted probability for any given rainfall scenario. This preserves
            the model&apos;s core prediction while accounting for the fact that some beaches are
            structurally riskier than others regardless of rainfall.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Training rows", value: "26,777" },
            { label: "Test rows", value: "5,843" },
            { label: "Features", value: "7 rainfall" },
            { label: "Unsafe rate", value: "3.7%" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-ocean-700/50 p-3 text-center">
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-ocean-300">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline steps */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <h2 className="mb-4 text-sm font-bold text-ocean-800">ML Pipeline Summary</h2>
        <ol className="space-y-3">
          {[
            { n: 1, title: "Target analysis", body: "Plot raw and log1p enterococcus distributions. Confirm log transform is necessary for regression. Identify BAV threshold at 130 CFU." },
            { n: 2, title: "Class imbalance audit", body: "Count safe vs unsafe labels. Compute imbalance ratio (25.8:1). Set scale_pos_weight = 22.63 for XGBoost. Set class_weight='balanced' for Random Forest." },
            { n: 3, title: "Hypothesis validation", body: "Bin samples by 7-day antecedent rainfall, compute unsafe rate per bin. Confirm monotonic increase from 1.4% (dry) to 20.9% (100mm+) before training any model." },
            { n: 4, title: "Feature engineering", body: "Compute rain_24hr, rain_48hr, rain_72hr, rain_7day, max_rain_3day, days_since_rain for each sample using matched gauge data. Add month as seasonality feature." },
            { n: 5, title: "Time-based train/test split", body: "Pre-2014 as training (26,777 rows), 2014+ as test (5,843 rows). Strict temporal separation prevents data leakage." },
            { n: 6, title: "Train three models", body: "XGBRegressor on log1p target, XGBClassifier on binary label, RandomForestClassifier on binary label. Identical feature set for fair comparison." },
            { n: 7, title: "Evaluate and select", body: "Compare recall, F1, ROC AUC, PR AUC on held-out test set. XGB Classifier wins on recall (38%) and PR AUC (0.072). Selected for deployment." },
            { n: 8, title: "Bayesian beach scaling", body: "Multiply island-wide classifier probability by each beach's historical exceedance ratio to produce per-beach estimates. Shown live on the map." },
          ].map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ocean-700 text-[11px] font-bold text-white">{s.n}</span>
              <div>
                <span className="text-sm font-bold text-ocean-800">{s.title}: </span>
                <span className="text-sm text-ocean-600">{s.body}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Metrics */}
      <MetricsTable />

      {/* Figures */}
      <div>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-ocean-400">
          9 Diagnostic Figures, click any card to expand
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {FIGURES.map((fig) => (
            <FigureCard key={fig.file} figure={fig} onClick={() => onFigureClick(fig)} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// XGB Classifier tab
// ---------------------------------------------------------------------------

function XGBClassifierTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          icon={<Zap className="h-5 w-5" />}
          label="Deployed model"
          title="XGBoost Classifier"
          sub="Gradient-boosted decision trees trained to predict the probability that enterococcus exceeds 130 CFU/100 mL"
        />
        <span className="shrink-0 rounded-full bg-sage-500 px-3 py-1 text-xs font-bold text-white">DEPLOYED</span>
      </div>

      {/* Mechanism */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-ocean-500" />
          <h3 className="text-sm font-bold text-ocean-800">How the algorithm works</h3>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-ocean-700">
          <p>
            XGBoost (Extreme Gradient Boosting) builds an ensemble of decision trees sequentially.
            Each new tree is trained to correct the mistakes made by all the trees that came before it.
            This process is called boosting: instead of training 400 independent trees and averaging them
            (like Random Forest), XGBoost trains them one at a time, each focusing on the residual errors
            of the previous ensemble.
          </p>
          <p>
            Each individual tree is a shallow, weak learner. With max depth = 4, each tree can make at most
            4 sequential splits, which is just enough to learn simple interactions between features (e.g.,
            &quot;rain_48hr is high AND month is November&quot;) without memorizing specific training examples.
            The learning rate of 0.05 means that each new tree contributes only 5% of its full prediction
            to the ensemble, forcing the model to learn incrementally over many trees rather than fitting
            large corrections in a few steps. This is a form of regularization that prevents overfitting.
          </p>
          <p>
            For binary classification, XGBoost optimizes logistic loss (log loss). Each sample produces a
            raw score that is passed through a sigmoid function to produce a probability between 0 and 1.
            At prediction time, a threshold of 0.5 is used: probabilities above 0.5 are labeled unsafe.
            Because the true unsafe rate in the test set is only 1.4% (84 unsafe out of 5,843), using 0.5
            as a threshold is aggressive. Most predictions are near zero, and the model has to push a
            score above 0.5 only when rainfall patterns strongly resemble historical unsafe conditions.
          </p>
          <p>
            The scale_pos_weight parameter is the key to making classification work. Without it, the
            log-loss function treats each unsafe sample the same as each safe sample. Because there are
            22.63 safe samples for every unsafe sample, the model would learn that predicting safe for
            everything minimizes loss. Setting scale_pos_weight = 22.63 tells XGBoost to treat each
            unsafe sample as 22.63 times more important in the loss function. This forces the model to
            devote real learning capacity to the unsafe minority class.
          </p>
        </div>
      </div>

      {/* Architecture */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-ocean-500" />
          <h3 className="text-sm font-bold text-ocean-800">Architecture and hyperparameters</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { param: "n_estimators = 400", why: "400 sequential trees. Cross-validation showed diminishing returns beyond 300, so 400 provides a safe margin. More trees with a low learning rate produce better generalization than fewer trees with a high learning rate." },
            { param: "max_depth = 4", why: "Maximum tree depth of 4 splits. Deep enough to capture rainfall interactions (e.g., moderate 48hr rain AND high 7day accumulation). Shallow enough to avoid memorizing specific storms in the training set." },
            { param: "learning_rate = 0.05", why: "Each tree contributes 5% of its prediction. Slow learners trained with more trees generalize better than fast learners with fewer trees. This is the primary anti-overfitting mechanism." },
            { param: "scale_pos_weight = 22.63", why: "Computed as the ratio of safe to unsafe training samples (26,777 / 1,182 unsafe in train). This is the exact compensation needed to undo the effect of class imbalance on the log-loss gradient." },
            { param: "objective = binary:logistic", why: "Outputs a probability via sigmoid function. The natural choice for binary classification problems where the output should be interpretable as a probability." },
            { param: "subsample = 0.8", why: "Each tree is trained on a random 80% sample of the training data. This introduces variance between trees, which reduces overfitting and is analogous to bagging in Random Forest." },
            { param: "colsample_bytree = 0.8", why: "Each tree considers only 80% of features at each split. With only 7 features, this means each tree sees approximately 5-6 features, preventing any single feature from dominating every tree." },
            { param: "eval_metric = logloss", why: "Log loss is the natural evaluation metric for probabilistic classifiers. It penalizes confident wrong predictions more than uncertain ones, which is appropriate for a risk tool." },
          ].map((p) => (
            <div key={p.param} className="rounded-xl bg-ocean-50 p-3">
              <p className="mb-1 font-mono text-xs font-bold text-ocean-700">{p.param}</p>
              <p className="text-xs leading-relaxed text-ocean-600">{p.why}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key decisions */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <div className="mb-4 flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-ocean-500" />
          <h3 className="text-sm font-bold text-ocean-800">Key design decisions</h3>
        </div>
        <div className="space-y-4">
          <DecisionCard
            n={1}
            title="Classifier over regressor for safety decisions"
            body="The regressor was trained first and produced recall of 1.2% when its continuous output was thresholded at 130 CFU. This near-zero recall made it unacceptable for safety use. The classifier with scale_pos_weight directly optimizes the model to identify unsafe days, producing 38% recall. For a public health application, recall is the primary objective: missing an unsafe day (false negative) is worse than a false alarm (false positive)."
          />
          <DecisionCard
            n={2}
            title="Time-based train/test split instead of random"
            body="A random 80/20 split would allow samples from 2020 to appear in both training and test sets. Because water quality at a beach is correlated across time (wet season patterns repeat year to year), this would allow the model to effectively learn the test set's temporal patterns. A strict pre-2014 / 2014+ split means the test set contains conditions the model has never seen. The resulting metrics are harder to achieve but more honest."
          />
          <DecisionCard
            n={3}
            title="No beach-specific features in the model"
            body="The model sees only rainfall features and month. It does not know which beach a sample came from. This is deliberate: it forces the model to learn a generalized rainfall-to-bacteria relationship that applies across all beaches and all years. Individual beach risk is handled separately by the Bayesian scaling step in the frontend, which multiplies the island-wide probability by each beach's historical exceedance rate."
          />
          <DecisionCard
            n={4}
            title="Threshold at 0.5, adjustable by the app user"
            body="The deployed model uses 0.5 as the decision boundary. At this threshold: recall = 38%, precision = 3.2%. The app exposes the raw probability so users can interpret it directly. Lowering the threshold to 0.3 would catch more unsafe days but generate more false alarms. The choice of threshold is a policy decision, not a technical one, and is left to the user."
          />
          <DecisionCard
            n={5}
            title="7 rainfall windows, not raw gauge readings"
            body="The raw input is daily rainfall at the nearest gauge. The model does not see these directly. Instead, six sliding-window aggregations are computed: sums over 24hr, 48hr, 72hr, and 7 days; the maximum single-day reading in any 3-day window; and the number of consecutive dry days. These aggregations encode how recent, how intense, and how prolonged the rainfall was. Month is added as a proxy for season, soil saturation, and baseline water levels."
          />
        </div>
      </div>

      {/* Results */}
      <MetricsTable highlight="XGB Classifier" />

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <h3 className="mb-4 text-sm font-bold text-ocean-800">Detailed findings</h3>
        <div className="space-y-3 text-sm leading-relaxed text-ocean-700">
          <p>
            On the test set (2014 onward, 5,843 samples), the classifier correctly identified
            32 of the 84 truly unsafe days (recall = 38.1%). It generated 963 false positives:
            safe days that were incorrectly flagged. The confusion matrix shows true negatives
            at 4,796 and false negatives at 52.
          </p>
          <p>
            The precision of 3.2% is low but expected. With a base rate of only 1.4% unsafe
            in the test set, even a model that raises every alert based on a clear rainfall
            signal will have low precision because most rainy days do not produce unsafe water.
            The relevant comparison is PR AUC = 0.072 vs a baseline of 0.014, which is 5x
            better than a random classifier at the same threshold.
          </p>
          <p>
            Feature importance from the trained model reveals that rain_48hr (0.22) and
            rain_24hr (0.21) account for nearly half the total predictive power. Month (0.14)
            ranks third, confirming that the same storm is more dangerous in November than
            in August. The 7-day total accounts for the remaining 11%, capturing the cumulative
            saturation effect of prolonged wet weather.
          </p>
          <p>
            The ROC AUC of 0.665 is the honest ceiling imposed by the data. Rainfall is a
            noisy proxy for bacterial contamination at a specific beach. Other drivers, including
            wildlife, ocean circulation, sediment resuspension, and sewer infrastructure,
            contribute to individual sample readings in ways that a rainfall model cannot see.
            A model that correctly identifies the signal that exists in the data, without
            overfitting to noise, is the right objective, and 0.665 reflects that signal.
          </p>
        </div>
      </div>

      {/* Strengths / limitations */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-sage-50 p-4 ring-1 ring-sage-200">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-sage-600">Strengths</h3>
          <ul className="space-y-2">
            {[
              "Best recall of the three models (38%): catches the most unsafe days",
              "scale_pos_weight directly addresses class imbalance, the core challenge of this problem",
              "Outputs a calibrated probability, not just a binary label, which powers the risk gradient on the map",
              "Feature importance is interpretable and consistent with the known physics of urban runoff",
              "Short-window features (24hr, 48hr) dominate, which aligns with the expected 1-3 day lag between rain and bacterial peak",
            ].map((s, i) => <ProConRow key={i} type="pro" text={s} />)}
          </ul>
        </div>
        <div className="rounded-2xl bg-coral-50 p-4 ring-1 ring-coral-200">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-coral-500">Limitations</h3>
          <ul className="space-y-2">
            {[
              "Catches only 38% of unsafe days at threshold 0.5. Lowering the threshold increases recall but multiplies false alarms",
              "3.2% precision means 97% of alerts are false positives. Not suitable for automated beach closures without human review",
              "No beach-specific features: the model cannot distinguish a protected bay from an exposed stream mouth",
              "Does not account for wave action, tidal state, or nearshore ocean circulation, all of which affect bacterial dilution",
              "Performance is bounded by the quality of the nearest-gauge match. Some beaches are > 5 km from the nearest gauge",
            ].map((s, i) => <ProConRow key={i} type="con" text={s} />)}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// XGB Regressor tab
// ---------------------------------------------------------------------------

function XGBRegressorTab() {
  return (
    <div className="space-y-6">
      <SectionHeader
        icon={<TrendingUp className="h-5 w-5" />}
        label="Secondary model"
        title="XGBoost Regressor"
        sub="Predicts the continuous log1p(CFU/100 mL) bacteria concentration. Not deployed for safety decisions."
      />

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-ocean-500" />
          <h3 className="text-sm font-bold text-ocean-800">How the algorithm works</h3>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-ocean-700">
          <p>
            The XGB Regressor uses the same gradient boosting architecture as the classifier:
            400 trees built sequentially, each correcting the residual errors of the previous
            ensemble, with max depth 4 and learning rate 0.05. The critical difference is
            the objective function. Instead of log loss (which outputs a probability), the
            regressor minimizes squared error (reg:squarederror). Each prediction is a real number
            rather than a probability, representing the expected log1p(enterococcus) at a given
            beach under given rainfall conditions.
          </p>
          <p>
            The target variable is log1p(enterococcus) rather than raw CFU. This transformation
            is necessary because the raw enterococcus distribution is extremely right-skewed:
            96% of values cluster near zero while a handful of extreme readings (some above
            10,000 CFU) would dominate the mean squared error loss and force the model to
            overfit on outliers. log1p(x) = log(1 + x) maps this distribution into a more
            symmetric, learnable range. Predictions are inverted with expm1(y) = exp(y) - 1
            to recover the original scale.
          </p>
          <p>
            Crucially, the regressor does not use scale_pos_weight because it has no concept
            of safe vs unsafe classes. It simply fits a function from rainfall features to
            log-bacteria counts. The implication is that the loss function is dominated by
            the majority of samples near zero. Fitting those well minimizes RMSE, so the
            model learns to predict values near the mean of the training distribution rather
            than learning to predict the extreme values that actually exceed the BAV.
          </p>
          <p>
            This is why converting the regressor to binary predictions by thresholding
            expm1(y_pred) at 130 produces recall of only 1.2%: the model systematically
            under-predicts high readings because they represent a tiny fraction of training loss.
            The regressor is structurally incapable of being a good rare-event detector
            without a mechanism equivalent to scale_pos_weight, which does not exist in
            standard regression.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-ocean-500" />
          <h3 className="text-sm font-bold text-ocean-800">Why it was trained</h3>
        </div>
        <div className="space-y-4">
          <DecisionCard
            n={1}
            title="Provides a continuous bacteria estimate for the app"
            body="The classifier produces a probability (0 to 1). The regressor produces an estimated CFU count. Both are shown in the app: the probability drives the risk color on the map, while the estimated CFU provides a more intuitive number that users can compare to the 130 CFU threshold directly."
          />
          <DecisionCard
            n={2}
            title="Validates the log1p target transformation"
            body="Training the regressor confirmed that the log transform is necessary and sufficient. Without it (raw CFU as the target), RMSE was dominated by extreme outliers and the model learned nothing. With log1p, the model converged and produced finite, interpretable predictions, even if those predictions were not very accurate in absolute terms."
          />
          <DecisionCard
            n={3}
            title="Establishes the predictive ceiling of rainfall features"
            body="R2 = -0.105 on the test set means that the 7 rainfall features cannot reliably predict the exact magnitude of individual readings. This is an important finding. It tells us that rainfall is a useful signal for relative risk (high rain = more likely to be unsafe) but not for precise quantitative prediction. The ceiling on ROC AUC (0.664) is set by the same limitation."
          />
          <DecisionCard
            n={4}
            title="Benchmark for comparison against the classifier"
            body="Figure 08 (model comparison) would be incomplete without the regressor. Showing that recall drops from 38% to 1.2% when switching from a classifier to a regressor is the single clearest demonstration of why the classifier was deployed. Without this comparison, the argument for using a classifier over a regressor would be purely theoretical."
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard
          title="Test set performance"
          body="RMSE = 0.943 in log space. MAE = 0.740 in log space. R2 = -0.105, meaning the model is worse than predicting the mean. When converted to binary at 130 CFU: recall = 0.012 (1.2%), catching essentially no unsafe days."
        />
        <InfoCard
          title="Role in the live app"
          body="The app shows an estimated CFU alongside the classifier probability. The regressor provides this number. It is displayed with a disclaimer that it is an estimate with high uncertainty, not a precise measurement."
        />
      </div>

      <MetricsTable highlight="XGB Regressor" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-sage-50 p-4 ring-1 ring-sage-200">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-sage-600">Strengths</h3>
          <ul className="space-y-2">
            {[
              "Produces an interpretable continuous output (estimated CFU) rather than a probability",
              "Useful as a secondary signal when the classifier probability is near the 0.5 threshold",
              "Demonstrates that regression and classification are not interchangeable for imbalanced problems",
              "ROC AUC of 0.664 confirms that the rainfall signal is real even when the task is regression",
            ].map((s, i) => <ProConRow key={i} type="pro" text={s} />)}
          </ul>
        </div>
        <div className="rounded-2xl bg-coral-50 p-4 ring-1 ring-coral-200">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-coral-500">Limitations</h3>
          <ul className="space-y-2">
            {[
              "R2 = -0.105: worse than predicting the mean. Cannot reliably estimate exact CFU counts.",
              "Recall = 1.2% when thresholded: structurally unable to detect unsafe days because regression loss is dominated by the safe majority",
              "Predictions cluster near 2.0 log units regardless of true value; systematic under-prediction of high readings",
              "Cannot be deployed for safety decisions without a recall-boosting mechanism equivalent to scale_pos_weight",
            ].map((s, i) => <ProConRow key={i} type="con" text={s} />)}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Random Forest tab
// ---------------------------------------------------------------------------

function RandomForestTab() {
  return (
    <div className="space-y-6">
      <SectionHeader
        icon={<Trees className="h-5 w-5" />}
        label="Baseline model"
        title="Random Forest Classifier"
        sub="An ensemble of 100 independent decision trees trained in parallel. Strong baseline, not deployed."
      />

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-ocean-500" />
          <h3 className="text-sm font-bold text-ocean-800">How the algorithm works</h3>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-ocean-700">
          <p>
            Random Forest builds an ensemble of decision trees independently and in parallel.
            This is the fundamental difference from XGBoost, which builds trees sequentially
            where each tree corrects the previous. In a Random Forest, each tree is trained
            on a bootstrap sample: a random sample of the training data with replacement,
            typically the same size as the training set. Because of replacement, each bootstrap
            sample includes roughly 63% of the original training rows and leaves out the rest
            (called the out-of-bag samples).
          </p>
          <p>
            At each node split, the Random Forest considers only a random subset of features
            rather than all features. With 7 features and the default setting of
            sqrt(7) = 2.65, each split considers roughly 2-3 randomly chosen features.
            This feature randomization is key: it forces trees to be diverse from each other.
            If all trees could use all features, they would all tend to split on the same
            most-informative feature first (rain_48hr), producing highly correlated trees
            whose ensemble adds little value. Restricting the feature set at each split
            forces different trees to explore different feature combinations.
          </p>
          <p>
            The final prediction is the majority vote across all 100 trees. For class
            probabilities (used in ROC and PR curves), the vote is the fraction of trees
            predicting unsafe. A sample predicted unsafe by 60 of 100 trees has a probability
            of 0.6. This averaging across diverse, partially-correlated trees is what makes
            Random Forest robust: individual trees overfit to their bootstrap sample, but
            the ensemble averages out the overfitting.
          </p>
          <p>
            Class imbalance is handled through class_weight=&apos;balanced&apos;. This parameter
            reweights each sample in the Gini impurity calculation at each node split,
            giving each unsafe sample a weight of approximately 22.63 (the inverse of its
            class frequency). This is mathematically equivalent to scale_pos_weight in
            XGBoost and produces the same effect: the tree-splitting criterion now treats
            a misclassified unsafe sample as 22.63 times more costly than a misclassified
            safe sample.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-ocean-500" />
          <h3 className="text-sm font-bold text-ocean-800">Architecture and hyperparameters</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { param: "n_estimators = 100", why: "100 trees is the standard default and typically sufficient. Random Forest gains most of its variance reduction in the first 50-100 trees. Beyond 200, the marginal improvement in variance reduction is negligible compared to the added inference cost." },
            { param: "class_weight = 'balanced'", why: "Reweights each sample by the inverse of its class frequency in the training set. With 26,777 safe and 1,182 unsafe training samples, each unsafe sample receives a weight of approximately 22.63. This is the RF equivalent of scale_pos_weight." },
            { param: "max_features = 'sqrt'", why: "At each split, the model considers sqrt(n_features) = ~2.6 randomly selected features. This is the standard setting that produces maximum diversity between trees while still providing enough signal for meaningful splits." },
            { param: "bootstrap = True", why: "Each tree is trained on a bootstrap sample (random with replacement) of the training data. This is the 'random' in Random Forest and is essential for tree diversity." },
            { param: "criterion = 'gini'", why: "Gini impurity measures how often a randomly chosen element would be incorrectly classified. It is the standard criterion for classification trees and is computationally fast. With class_weight='balanced', unsafe samples disproportionately influence the Gini calculation." },
            { param: "max_depth = None", why: "Trees grow until all leaves are pure (contain only one class) or contain fewer than min_samples_split samples. Unlike XGBoost where shallow trees are used for regularization, Random Forest relies on averaging for regularization, so deep trees are acceptable." },
          ].map((p) => (
            <div key={p.param} className="rounded-xl bg-ocean-50 p-3">
              <p className="mb-1 font-mono text-xs font-bold text-ocean-700">{p.param}</p>
              <p className="text-xs leading-relaxed text-ocean-600">{p.why}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ocean-100">
        <div className="mb-4 flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-ocean-500" />
          <h3 className="text-sm font-bold text-ocean-800">Why it was not deployed</h3>
        </div>
        <div className="space-y-4">
          <DecisionCard
            n={1}
            title="Lower recall than XGB Classifier (26% vs 38%)"
            body="On the test set, Random Forest caught 22 of 84 unsafe days vs 32 for XGB Classifier. At a safety threshold of 130 CFU, missing 10 additional unsafe days per prediction cycle is a meaningful difference. The goal is to catch as many dangerous beach days as possible, so the higher-recall model wins."
          />
          <DecisionCard
            n={2}
            title="Lower PR AUC (0.043 vs 0.072)"
            body="PR AUC integrates precision and recall across all thresholds. It is the most relevant metric when the positive class is rare. XGB achieves 0.072 vs the 0.014 baseline (5x improvement), while Random Forest achieves 0.043 (3x improvement). XGB maintains better precision at equivalent recall levels across the full threshold range."
          />
          <DecisionCard
            n={3}
            title="Boosting outperforms bagging on this dataset"
            body="The boosting mechanism in XGBoost explicitly focuses on hard-to-classify examples with each new tree. Because unsafe days are rare and hard to distinguish from safe high-rainfall days, this sequential correction mechanism is better suited to this problem than the parallel averaging of Random Forest. Boosting is generally superior on structured/tabular data where the signal is subtle."
          />
          <DecisionCard
            n={4}
            title="Random Forest remains a strong validation"
            body="The fact that both models achieve nearly identical ROC AUC (0.663 vs 0.665) confirms that the predictive ceiling is set by the rainfall signal itself, not by the choice of model. Neither algorithm can extract more information than the data contains. This agreement between two fundamentally different algorithms validates the results."
          />
        </div>
      </div>

      <MetricsTable highlight="Random Forest" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-sage-50 p-4 ring-1 ring-sage-200">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-sage-600">Strengths</h3>
          <ul className="space-y-2">
            {[
              "More interpretable than XGBoost: feature importance is directly readable as split frequency",
              "Less sensitive to hyperparameter choices: default settings are robust and rarely overfit",
              "Parallel training is faster than sequential boosting at equal tree counts",
              "Out-of-bag error provides a free cross-validation estimate without a separate validation set",
              "Strong agreement with XGB on ROC AUC confirms the rainfall signal is real and model-independent",
            ].map((s, i) => <ProConRow key={i} type="pro" text={s} />)}
          </ul>
        </div>
        <div className="rounded-2xl bg-caution-50 p-4 ring-1 ring-caution-200">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-caution-500">Why XGB was preferred</h3>
          <ul className="space-y-2">
            {[
              "Recall: 26% vs XGB 38%. Misses 12 additional unsafe test days at the same threshold",
              "PR AUC: 0.043 vs XGB 0.072. Lower area under the precision-recall curve at all thresholds",
              "Boosting is generally superior on tabular data with subtle signals vs bagging-based approaches",
              "scale_pos_weight in XGB allows finer control over the imbalance correction than balanced weights",
            ].map((s, i) => <ProConRow key={i} type="warn" text={s} />)}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

const SUB_TABS: { id: MLSubTab; label: string; badge?: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "xgb-classifier", label: "XGB Classifier", badge: "DEPLOYED" },
  { id: "xgb-regressor", label: "XGB Regressor" },
  { id: "random-forest", label: "Random Forest" },
];

export function MLFiguresTab() {
  const [subTab, setSubTab] = useState<MLSubTab>("overview");
  const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);

  return (
    <div className="space-y-6">
      {selectedFigure && (
        <FigureModal figure={selectedFigure} onClose={() => setSelectedFigure(null)} />
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ocean-100 text-ocean-600">
          <BarChart2 className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-ocean-900">Model and Findings</h1>
          <p className="text-sm text-ocean-500">
            Machine learning pipeline, model architecture, decisions, and results
          </p>
        </div>
      </div>

      {/* Sub-tab nav */}
      <div className="flex flex-wrap gap-2 border-b border-ocean-100 pb-0">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2.5 text-xs font-semibold transition-colors ${
              subTab === t.id
                ? "bg-white text-ocean-800 shadow-sm ring-1 ring-ocean-100 ring-b-0"
                : "text-ocean-400 hover:text-ocean-600"
            }`}
          >
            {t.label}
            {t.badge && (
              <span className="rounded-full bg-sage-500 px-1.5 py-0.5 text-[8px] font-bold text-white">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div>
        {subTab === "overview" && <OverviewTab onFigureClick={setSelectedFigure} />}
        {subTab === "xgb-classifier" && <XGBClassifierTab />}
        {subTab === "xgb-regressor" && <XGBRegressorTab />}
        {subTab === "random-forest" && <RandomForestTab />}
      </div>
    </div>
  );
}
