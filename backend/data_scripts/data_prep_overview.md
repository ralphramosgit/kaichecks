# Kaimaemae Data Preparation Overview

This document explains the data pipeline that runs before the machine learning
stage: how the raw files were combined, what was removed during cleaning, what was
prepared, and how the two clean datasets were merged into the final training table.

The pipeline has four notebooks, run in this order:

1. [merge_hcdp_data.script.ipynb](merge_hcdp_data.script.ipynb) - combine the raw rainfall files.
2. [rainfall_data.clean.ipynb](rainfall_data.clean.ipynb) - clean the rainfall.
3. [water_quality_data.clean.ipynb](water_quality_data.clean.ipynb) - clean the water quality samples.
4. [merge_clean_wq_rainfall.ipynb](merge_clean_wq_rainfall.ipynb) - merge into the master dataset.

The flow of row counts end to end:

| Stage                 | File                                      | Rows      | Entities              |
| --------------------- | ----------------------------------------- | --------- | --------------------- |
| Combined raw rainfall | `raw_data/rainfall_data.csv`              | 1,482,457 | 175 stations          |
| Clean rainfall        | `clean_data/clean_rainfall_data.csv`      | 1,463,821 | 165 stations          |
| Clean water quality   | `clean_data/clean_water_quality_data.csv` | 45,553    | 107 beaches           |
| Master dataset        | `clean_data/master_dataset.csv`           | 32,620    | 84 beaches, 35 gauges |

## 1. Combining the raw rainfall (merge_hcdp_data)

The HCDP rainfall arrives as **436 separate monthly CSV files**, one per month from
1990 onward, buried in a deep folder tree
(`raw_data/HCDP_rainfall_data/.../station_data/YYYY/MM/`). Each file is in a wide
format: one row per station, and one column per day of that month (columns named
like `X1990.01.01`).

What this notebook does:

- **Reads and stacks all 436 monthly files** into one frame.
- **Filters to Oahu** by keeping only rows where `Island == "OA"`.
- **Melts the wide format to long format**: the per day columns are unpivoted so
  each row becomes one station on one date with one rainfall value. The date column
  names are parsed back into real `YYYY-MM-DD` dates.
- Keeps the station metadata (id, name, island, lat, lon, elevation).

Output: `raw_data/rainfall_data.csv`, **1,482,457 rows** across **175 Oahu stations**,
with columns `date, station_id, station_name, island, lat, lon, elevation_m,
rainfall_mm`. This is a combination step, not a cleaning step, so nothing is
removed for quality yet.

## 2. Cleaning the rainfall (rainfall_data.clean)

Input: `raw_data/rainfall_data.csv`. Output: `clean_data/clean_rainfall_data.csv`.
Two tuning knobs control the cleaning:

- `MAX_STATION_MISSING_FRACTION = 0.5` - drop any gauge missing more than half its days.
- `MAX_GAP_DAYS = 2` - only fill gaps of 1 to 2 missing days.

Steps, in order:

1. **Re-filter to Oahu** (`island == "OA"`) as a safety check.
2. **Force rainfall numeric and null impossible values.** `rainfall_mm` is coerced
   to numeric so any stray text becomes a blank (a real gap). **Negative rainfall
   is physically impossible**, so any negative reading is set to blank and treated
   as a gap. Rainfall is already in millimeters, so no unit conversion is needed.
3. **Drop sparse stations.** For each station the fraction of missing days is
   measured, and **any station missing more than 50 percent of its days is dropped**
   entirely, because a gauge with that many holes cannot be trusted as a beach's
   nearest gauge. This is the step that takes stations from 175 down to **165**.
4. **Build a complete daily grid per station.** Each surviving station is reindexed
   to one row per calendar day from its first to its last date. Days that were never
   recorded become explicit blank rows, which is what the gap step then works on.
   The constant station metadata (name, lat, lon, elevation) is set aside and
   reattached at the end.
5. **Interpolate short gaps, drop long gaps.** Runs of **1 to 2 missing days are
   linearly interpolated** between real readings (`limit=2`, `limit_area="inside"`
   so it never extends past the ends of a record). Any blank that remains belongs to
   a **longer gap and is dropped**, because inventing several days of rainfall would
   pollute the lag features.
6. **Reattach metadata and finalize** the column order and `YYYY-MM-DD` date format.

Output: **1,463,821 rows** across **165 stations**, with **zero missing rainfall
values**. Columns: `date, station_id, station_name, island, lat, lon, elevation_m,
rainfall_mm`.

What was removed: non-Oahu rows, negative readings, 10 overly sparse stations, and
the long missing gaps. What was prepared: a gap free, one row per station per day
series ready for rolling window features.

## 3. Cleaning the water quality (water_quality_data.clean)

Input: `raw_data/water_quality_cwb.csv` (Clean Water Branch samples). Output:
`clean_data/clean_water_quality_data.csv`. Key constants:

- Oahu bounding box: latitude 21.2 to 21.7, longitude -158.3 to -157.6.
- `BAV_THRESHOLD = 130` - the EPA Beach Action Value.
- `MIN_SAMPLES_PER_BEACH = 50` - minimum history a beach must have.

Steps, in order:

1. **Drop the units row.** The raw CSV's first data row is a units descriptor
   (UTC, degrees_north, 1/(100-mL), ...) rather than a real sample, so it is skipped
   (`skiprows=[1]`) while the real header is kept.
2. **Convert the timestamp to a plain date.** The raw `time` column is a full UTC
   timestamp; the model only needs the calendar date, which is also the join key to
   rainfall, so it is reduced to `YYYY-MM-DD`.
3. **Filter to Oahu sites** using the latitude/longitude bounding box, so cleaning
   is self contained even if the raw file is re-exported with a wider extent.
4. **Drop rows with missing enterococcus.** Enterococcus is both the target and the
   basis for the safe/unsafe label, so the column is coerced to numeric and **any
   row without a reading is dropped** (it cannot be labelled).
5. **Collapse same day duplicate samples.** A beach can be sampled several times on
   one day. For a safety model the **most conservative (highest) reading is kept**,
   so for each beach and date the samples are sorted by enterococcus and only the
   single highest value is kept.
6. **Keep only beaches with enough history.** Samples are counted per beach and
   **any beach with fewer than 50 samples is dropped**, because the model cannot
   learn a beach's behaviour from too few points. This trims the beach count down.
7. **Add the label and month feature.** `unsafe = 1` when `enterococcus > 130` else
   0, and `month` is taken from the date as a wet/dry season proxy.

Output: **45,553 rows** across **107 beaches**, unsafe rate about 3.33 percent.
Columns: `date, location_id, location_name, latitude, longitude, enterococcus,
unsafe, month`.

What was removed: the units row, non-Oahu sites, samples with no reading, duplicate
same day samples, and low history beaches. What was prepared: a deduplicated, one
row per beach per day table already carrying the `unsafe` label.

## 4. Merging into the master dataset (merge_clean_wq_rainfall)

Inputs: `clean_water_quality_data.csv` and `clean_rainfall_data.csv`. Output:
`clean_data/master_dataset.csv`. This step joins rainfall context onto every water
sample and engineers the antecedent features.

Steps, in order:

1. **Match each beach to its nearest rain gauge.** Each beach has one fixed
   coordinate. Using the **haversine (great circle) distance**, every beach is
   assigned the single closest gauge, stored as `nearest_station_id`. Great circle
   distance is used because a plain latitude/longitude subtraction distorts distance
   on the curved earth. Of the 165 clean gauges, **35** end up being some beach's
   nearest gauge.
2. **Build a continuous daily grid per gauge** (one row per calendar day) so the
   rolling windows line up with real days.
3. **Shift rainfall by one day (the leakage guard).** Within each gauge the rainfall
   is shifted forward one day into an antecedent series, so the value lined up with
   sample date D is the rain from D-1 and earlier. **The sample day's own rain is
   never used as an input.**
4. **Engineer the antecedent features** from that series:
   - `rain_24hr` = yesterday's rain.
   - `rain_48hr` = rolling 2 day sum.
   - `rain_72hr` = rolling 3 day sum.
   - `rain_7day` = rolling 7 day sum.
   - `max_rain_3day` = heaviest single day in the prior 3 days.
   - `days_since_rain` = consecutive dry days before the sample.
     Every window requires the full span of days to be present, otherwise the value is
     blank and the row is later dropped.
5. **Left join beach samples to their gauge's features** on
   (`nearest_station_id`, `date`), keeping every sample and pulling in the matching
   rainfall context.
6. **Drop incomplete windows.** Samples whose lag window was incomplete, or that
   fall before 7 days of gauge history exist, have blank features and are **dropped**
   so the model never sees a fabricated value.

Output: **32,620 rows** across **84 beaches**, unsafe rate about 3.73 percent.
Columns: `date, location_id, location_name, latitude, longitude, enterococcus,
unsafe, nearest_station_id, rain_24hr, rain_48hr, rain_72hr, rain_7day,
days_since_rain, max_rain_3day, month`.

What was removed: samples whose nearest gauge had no data for that date or an
incomplete lag window (which is what trims 107 beaches down to 84). What was merged:
each beach sample with the antecedent rainfall from its nearest gauge. This master
dataset is the single file the machine learning stage trains on. See
[ml_overview.md](../machine_learning/ml_overview.md) for what happens next.
