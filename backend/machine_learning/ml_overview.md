# Kaichecks Machine Learning Overview

This document explains everything the machine learning stage does, using the
actual columns and the actual logic in the code. It describes the work in
[machine_learning.script.ipynb](machine_learning.script.ipynb) (the step by step
version) and [ml_full_script.ipynb](ml_full_script.ipynb) (the same pipeline in
one cell). Both load the same file and produce identical outputs.

## 1. Research question

Can antecedent rainfall predict whether an Oahu beach is unsafe for swimming?
A beach sample is labelled **unsafe** when its enterococcus reading exceeds the
EPA Beach Action Value (BAV) of **130 CFU/100mL**. The idea is that rain washes
bacteria from land into coastal water, so the rainfall in the days before a
sample should carry a predictive signal.

## 2. The master dataset, column by column

The model reads exactly one file: `resources/clean_data/master_dataset.csv`.
It has **32,620 rows** and **15 columns**. Each row is one water quality sample
taken at one beach on one day, with the rainfall context already attached.

| Column               | Type            | Role                      | Meaning                                                   |
| -------------------- | --------------- | ------------------------- | --------------------------------------------------------- |
| `date`               | text YYYY-MM-DD | key                       | the day the sample was taken (1990-01-08 to 2024-06-12)   |
| `location_id`        | text            | key                       | stable id of the beach                                    |
| `location_name`      | text            | label                     | human readable beach name, e.g. ALA MOANA PARK EWA END    |
| `latitude`           | float           | context                   | beach latitude                                            |
| `longitude`          | float           | context                   | beach longitude                                           |
| `enterococcus`       | float           | raw measurement           | the bacteria reading in CFU/100mL, the thing being judged |
| `unsafe`             | int 0/1         | **classification target** | 1 if `enterococcus` > 130, else 0                         |
| `nearest_station_id` | text            | provenance                | the rain gauge whose rainfall was joined to this sample   |
| `rain_24hr`          | float           | **feature**               | rainfall in the 24h before the sample (mm)                |
| `rain_48hr`          | float           | **feature**               | rainfall in the prior 48h (mm)                            |
| `rain_72hr`          | float           | **feature**               | rainfall in the prior 72h (mm)                            |
| `rain_7day`          | float           | **feature**               | rainfall in the prior 7 days (mm)                         |
| `days_since_rain`    | int             | **feature**               | consecutive dry days right before the sample              |
| `max_rain_3day`      | float           | **feature**               | heaviest single day in the prior 3 days (mm)              |
| `month`              | int 1-12        | **feature**               | calendar month, a seasonality proxy                       |

So of the 15 columns: 7 are model **inputs** (the features), 1 is the model
**output** it learns to predict (`unsafe`), 1 is the raw measurement the label
comes from (`enterococcus`), and the remaining 6 are keys and context that the
model does **not** train on (`date`, `location_id`, `location_name`, `latitude`,
`longitude`, `nearest_station_id`).

The dataset covers **84 beaches** matched to **35 rain gauges**, with an overall
unsafe rate of **3.73 percent**. That low rate, a strong class imbalance, is the
central modelling challenge: a model that always says safe would be about 96
percent accurate and completely useless.

### Two example rows

```
date        location_name           enterococcus unsafe rain_24hr rain_7day days_since_rain max_rain_3day month
1990-01-09  ALA MOANA PARK EWA END   0.5          0      0.00      0.00      7               0.00          1
1990-01-16  ALA MOANA PARK EWA END   45.0         0      33.79     68.96     0               33.79         1
```

The first row is a dry spell (7 days since rain, all rainfall windows zero) and
the reading is near zero. The second follows heavy rain (about 34mm in the last
day, 69mm over the week) and the reading jumps to 45. That contrast, across
thousands of samples, is the pattern the model tries to learn.

## 3. How the feature columns are built (the logic)

The rainfall features are **not** raw gauge readings. They are engineered in
[merge_clean_wq_rainfall.ipynb](../data_scripts/merge_clean_wq_rainfall.ipynb)
before training. The logic, in order:

1. **Match each beach to its nearest gauge.** Each beach has one fixed
   coordinate. Using the haversine (great circle) distance, every beach is
   assigned the single closest rain gauge, stored as `nearest_station_id`. Great
   circle distance is used because a plain latitude/longitude subtraction
   distorts distance on the curved earth.

2. **Build a continuous daily grid per gauge.** Each gauge is reindexed to one
   row per calendar day. This matters because the rainfall windows are counted in
   calendar days, so a rolling window is only correct if no days are missing.
   Days removed in cleaning reappear here as blanks, which is what makes an
   incomplete window resolve to a missing value and get dropped later.

3. **Shift rainfall by one day (the leakage guard).** Within each gauge the
   rainfall series is shifted forward one day into an `antecedent_mm` series. This
   is the most important rule: the value lined up with sample date D is the
   rainfall from D-1 and earlier. **The sample day's own rain is never used as an
   input.** Without this shift the model could cheat by seeing same day rain.

4. **Roll the antecedent series into windows.** From `antecedent_mm`:
   - `rain_24hr` = the antecedent day itself (yesterday's rain).
   - `rain_48hr` = rolling 2 day sum.
   - `rain_72hr` = rolling 3 day sum.
   - `rain_7day` = rolling 7 day sum.
   - `max_rain_3day` = rolling 3 day **max** (captures one intense storm day, not
     just the total).
     Every window uses `min_periods` equal to its full length, so if any day in the
     window is missing the feature becomes blank and the row is dropped. The model
     never sees a fabricated or partial window.

5. **Count days since rain.** A day is dry when its antecedent rainfall is zero.
   Consecutive dry days before the sample are counted into `days_since_rain` by
   starting a new block at every wet day and counting dry days within each block.

6. **Join features back to the samples.** Each water sample is left joined to its
   assigned gauge's feature row on (`nearest_station_id`, `date`). Samples whose
   window was incomplete, or that fall before 7 days of gauge history exist, end
   up with blank features and are dropped. What survives is the 32,620 row master
   dataset.

The key idea: every input describes **only the rainfall leading up to the
sample**, so the model always predicts forward from cause (rain) to effect
(bacteria).

## 4. How the model is trained (the logic)

### 4a. Define inputs and target

```python
FEATURES = ["rain_24hr", "rain_48hr", "rain_72hr", "rain_7day",
            "days_since_rain", "max_rain_3day", "month"]
```

- `X` (what the model sees) = those 7 columns, nothing else.
- `y` for classification = the `unsafe` column (0 or 1).
- `y` for regression = `log1p(enterococcus)`. Raw enterococcus is wildly skewed
  (median around 2, max in the tens of thousands), so the regressor learns the
  **log** of the reading and predictions are converted back with `expm1` before
  being compared to 130. Training on the raw value would let a few huge readings
  dominate the loss.

The model never sees the beach name, the coordinates, the date, or the station
id. It learns a relationship of the form "given this much recent rain, in this
month, what is the chance the water is unsafe".

### 4b. Split by time, not at random

```python
train = df[df["year"] < 2014]   # 26,777 rows
test  = df[df["year"] >= 2014]  #  5,843 rows, 84 of them unsafe
```

The split is **chronological**. The model trains on the past (before 2014) and is
tested on the future (2014 onward). A random split would scatter samples from the
same storm into both train and test and let the model peek at future conditions,
inflating the scores. Time based splitting mimics the real use case: predict
tomorrow from history.

(The project overview originally proposed a 2020 cutoff, but the 2020 onward
window contained almost no unsafe samples, which made evaluation meaningless, so
the split was moved to 2014 to keep enough unsafe test cases, 84 of them.)

### 4c. Handle the class imbalance

Only 3.73 percent of samples are unsafe, so the models are told to weight the
rare class up:

- The XGBoost classifier uses `scale_pos_weight ≈ 22.63`, the ratio of safe to
  unsafe training rows. This makes one missed unsafe day cost about as much as 22
  false alarms, so the model does not just predict safe every time.
- The Random Forest uses `class_weight="balanced"`, the same idea built in.

### 4d. Fit three models

All three see the same `X_train` and the same 7 features, with
`random_state=42` for reproducibility:

1. **XGBoost regressor** (`XGBRegressor`, 400 trees, depth 4, learning rate
   0.05). Predicts `log1p(enterococcus)`, then exponentiates and thresholds at
   130 to decide safe vs unsafe.
2. **XGBoost classifier** (`XGBClassifier`, same shape). Predicts the unsafe
   probability directly. **This is the model the API uses.**
3. **Random Forest classifier** (`RandomForestClassifier`, 400 trees, depth 12,
   balanced weights). A comparison baseline.

A gradient boosted tree (XGBoost) works by building hundreds of small decision
trees in sequence, each correcting the errors of the ones before it. Each tree
asks threshold questions on the features, for example "was `rain_7day` above
40mm?", and the ensemble adds up those answers into a probability. That is why
the feature importance graph (graph 5) can rank which rainfall windows mattered
most.

## 5. Graphs

Nine figures are written to the `figures/` folder and also display inline when
the notebook runs.

| File                            | What it shows                                                     | Why it matters                                                                                      |
| ------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `01_target_distribution.png`    | Enterococcus on raw and log1p scales, with the BAV line           | Justifies training the regressor on the log of the target because the raw values are heavily skewed |
| `02_class_balance.png`          | Count of safe versus unsafe samples                               | Visualises the class imbalance that drives the use of `scale_pos_weight` and balanced weights       |
| `03_rainfall_vs_exceedance.png` | Unsafe rate across 7 day rainfall bins                            | The core hypothesis check, the unsafe rate should rise as antecedent rainfall increases             |
| `04_pred_vs_actual.png`         | Regressor predicted versus actual in log space                    | Shows how well the regressor tracks the true reading and where the BAV line sits                    |
| `05_feature_importance.png`     | Gain importance of the seven features for the classifier          | Tells you which rainfall windows the model relies on most                                           |
| `06_confusion_matrix.png`       | Classifier confusion matrix on the test set                       | Shows the trade between catching unsafe days and false alarms                                       |
| `07_roc_pr.png`                 | ROC and precision recall curves for the classifier and the forest | Compares ranking quality against the low base rate                                                  |
| `08_model_comparison.png`       | Recall, F1, ROC AUC, PR AUC bars for all three models             | Side by side scorecard that motivates picking the classifier                                        |
| `09_top_beaches.png`            | Top 15 beaches by historical exceedance rate (min 100 samples)    | Highlights which beaches are most often unsafe, useful context for the app                          |

## 6. Results

Metrics are computed on the held out 2014 onward test set. Because only 84 of the
5,843 test samples are unsafe, **recall** (the share of truly unsafe days the
model flags) and **ROC AUC** (ranking quality) matter more than raw accuracy.

| Model              | Precision | Recall | F1    | ROC AUC | PR AUC |
| ------------------ | --------- | ------ | ----- | ------- | ------ |
| XGB regressor      | 0.167     | 0.012  | 0.022 | 0.664   | 0.053  |
| **XGB classifier** | 0.032     | 0.381  | 0.059 | 0.665   | 0.072  |
| Random Forest      | 0.040     | 0.262  | 0.070 | 0.663   | 0.043  |

Regressor log error on the test set: RMSE 0.943, MAE 0.740, R2 -0.105.

How to read this:

- The **regressor** barely flags any unsafe days (recall 0.012) and its negative
  R2 means it does not predict the exact reading well. It is kept for comparison
  but is not used for decisions.
- The **XGBoost classifier** catches about 38 percent of unsafe days. Its
  precision is low (0.032), so most alerts are false alarms, but for a screening
  signal that errs toward caution this is the most useful behaviour, which is why
  it is the deployed model.
- The **Random Forest** is similar but flags fewer unsafe days (recall 0.262).
- All three sit near ROC AUC 0.66, meaning rainfall carries a **real but modest**
  predictive signal. This is an honest result, not a near perfect classifier.

## 7. Output files

All artifacts are written to the `models/` folder. Every file is overwritten on
each run, there is no skip on existing files. The figures write to disk silently,
so the printed file list at the end of the run is the confirmation.

| File                              | Contents                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `xgb_classifier.json`             | The primary classifier, loaded by the API                                                                           |
| `xgb_regressor.json`              | The regressor, saved for comparison and analysis                                                                    |
| `random_forest_classifier.joblib` | The Random Forest comparison model                                                                                  |
| `model_metadata.json`             | Features, thresholds, split year, class weight, row counts, the full test metrics table, and the primary model name |
| `beach_catalog.csv`               | Per beach summary: sample count, historical exceedance rate, coordinates, and nearest station id                    |

## 8. How the API uses this

The FastAPI app in `backend/api` loads `xgb_classifier.json` (named as the
primary model in `model_metadata.json`). A caller submits 7 days of daily
rainfall and a month, the app rebuilds the same seven features used in training,
and the classifier returns an unsafe probability for the scenario. `beach_catalog.csv`
backs the `/beaches` endpoint so the app can list known beaches and their
historical exceedance rates.
