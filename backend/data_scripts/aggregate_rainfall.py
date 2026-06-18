"""
Reads the clean rainfall CSV and produces a compact summary JSON for the
Data Explorer frontend. The full CSV is ~80MB and can't be loaded in a browser,
so this script pre-aggregates it into a ~100KB JSON that the Rainfall tab fetches.

Run from anywhere:
    python backend/data_scripts/aggregate_rainfall.py

Output: ui/public/data/rainfall_summary.json
"""

import json
import os
import sys

import pandas as pd

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CSV_PATH = os.path.join(PROJECT_ROOT, "resources", "clean_data", "clean_rainfall_data.csv")
OUT_DIR = os.path.join(PROJECT_ROOT, "ui", "public", "data")
OUT_PATH = os.path.join(OUT_DIR, "rainfall_summary.json")

MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

def main():
    if not os.path.exists(CSV_PATH):
        print(f"ERROR: CSV not found at {CSV_PATH}", file=sys.stderr)
        sys.exit(1)

    print(f"Reading {CSV_PATH} …")
    df = pd.read_csv(
        CSV_PATH,
        dtype={"station_id": str},
        parse_dates=["date"],
    )
    print(f"  {len(df):,} rows, {df['station_id'].nunique()} stations")

    df["month"] = df["date"].dt.month
    df["year"] = df["date"].dt.year

    # --- Summary ---
    summary = {
        "clean_stations": int(df["station_id"].nunique()),
        "clean_rows": int(len(df)),
        "date_range": {
            "start": str(df["date"].min().date()),
            "end": str(df["date"].max().date()),
        },
    }

    # --- Island-wide monthly average (12 data points) ---
    monthly_island = (
        df.groupby("month")["rainfall_mm"]
        .mean()
        .reset_index()
        .rename(columns={"rainfall_mm": "avg_mm"})
    )
    monthly_island["month_label"] = monthly_island["month"].apply(
        lambda m: MONTH_LABELS[m - 1]
    )
    monthly_island["avg_mm"] = monthly_island["avg_mm"].round(2)
    monthly_island_list = monthly_island[["month", "month_label", "avg_mm"]].to_dict(
        orient="records"
    )

    # --- Wet vs dry season split (rainy = Nov-Mar on Oahu) ---
    wet_months = {11, 12, 1, 2, 3}
    wet = df[df["month"].isin(wet_months)]["rainfall_mm"].mean()
    dry = df[~df["month"].isin(wet_months)]["rainfall_mm"].mean()
    season_split = {
        "wet_avg_mm": round(float(wet), 2),
        "dry_avg_mm": round(float(dry), 2),
        "wet_months": "Nov – Mar",
        "dry_months": "Apr – Oct",
    }

    # --- Per-station metadata + summary stats ---
    station_meta = (
        df.groupby("station_id")
        .agg(
            station_name=("station_name", "first"),
            lat=("lat", "first"),
            lon=("lon", "first"),
            elevation_m=("elevation_m", "first"),
            days=("date", "count"),
            avg_mm=("rainfall_mm", "mean"),
            max_mm=("rainfall_mm", "max"),
        )
        .reset_index()
    )
    station_meta["avg_mm"] = station_meta["avg_mm"].round(2)
    station_meta["max_mm"] = station_meta["max_mm"].round(1)
    station_meta["lat"] = station_meta["lat"].round(5)
    station_meta["lon"] = station_meta["lon"].round(5)
    stations_list = station_meta.to_dict(orient="records")

    # --- Monthly average rainfall by station (165 × 12 = ~2000 rows) ---
    monthly_by_station = (
        df.groupby(["station_id", "month"])["rainfall_mm"]
        .mean()
        .round(2)
        .reset_index()
        .rename(columns={"rainfall_mm": "avg_mm"})
    )
    monthly_by_station_list = monthly_by_station.to_dict(orient="records")

    # --- Yearly island-wide average (for trend chart) ---
    yearly = (
        df.groupby("year")["rainfall_mm"]
        .mean()
        .round(2)
        .reset_index()
        .rename(columns={"rainfall_mm": "avg_mm"})
    )
    yearly_list = yearly.to_dict(orient="records")

    # --- Top 15 wettest stations ---
    top_wet = (
        station_meta.nlargest(15, "avg_mm")[
            ["station_id", "station_name", "avg_mm", "elevation_m"]
        ]
        .to_dict(orient="records")
    )

    out = {
        "summary": summary,
        "season_split": season_split,
        "monthly_island": monthly_island_list,
        "yearly": yearly_list,
        "stations": stations_list,
        "monthly_by_station": monthly_by_station_list,
        "top_wettest_stations": top_wet,
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))

    size_kb = os.path.getsize(OUT_PATH) / 1024
    print(f"  Wrote {OUT_PATH}  ({size_kb:.1f} KB)")
    print("Done.")


if __name__ == "__main__":
    main()
