"""Model loading and prediction logic for the Kaichecks API.

This module loads the trained artifacts once at startup and exposes helpers to
turn a rainfall scenario into the engineered features the models expect, then
into a safety prediction.

The feature engineering here mirrors exactly how the master dataset was built in
the merge notebook, so the inputs the API feeds the model match how the model was
trained. The input rainfall array is ordered oldest day first and most recent day
last, representing the days strictly before the sample date.
"""

import json
import os
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier, XGBRegressor

from .config import get_settings


class ModelBundle:
    """Holds the loaded models, metadata, and beach catalog."""

    def __init__(self) -> None:
        settings = get_settings()

        with open(settings.path(settings.metadata_file)) as fh:
            self.metadata = json.load(fh)

        # The training feature order. Inputs must be built in this exact order.
        self.features: list[str] = self.metadata["features"]
        self.bav_threshold: float = float(self.metadata["bav_threshold"])

        self.classifier = XGBClassifier()
        self.classifier.load_model(settings.path(settings.classifier_file))

        self.regressor = XGBRegressor()
        self.regressor.load_model(settings.path(settings.regressor_file))

        catalog_path = settings.path(settings.beach_catalog_file)
        if os.path.exists(catalog_path):
            self.beach_catalog = pd.read_csv(
                catalog_path, dtype={"location_id": str, "nearest_station_id": str}
            )
        else:
            self.beach_catalog = pd.DataFrame()


# Loaded once and shared across requests.
_bundle: Optional[ModelBundle] = None


def _sync_models_from_s3() -> None:
    """Pull model artifacts from S3 when KAICHECKS_MODELS_S3_BUCKET is set.

    No-ops in local dev (bucket not set → models load from disk as normal).
    On ECS Fargate: set KAICHECKS_MODELS_S3_BUCKET + KAICHECKS_MODELS_S3_PREFIX
    in the task definition environment variables, and attach a task role with
    s3:GetObject on the bucket.
    Requires boto3 in requirements.txt (already included).
    """
    settings = get_settings()
    if not settings.use_s3:
        return  # local dev - use models already on disk

    import boto3  # type: ignore[import]

    os.makedirs(settings.models_dir, exist_ok=True)
    s3 = boto3.client("s3", region_name=settings.aws_region)
    for filename in (
        settings.metadata_file,
        settings.classifier_file,
        settings.regressor_file,
        settings.beach_catalog_file,
    ):
        dest = settings.path(filename)
        if not os.path.exists(dest):
            s3.download_file(
                settings.s3_bucket,
                f"{settings.s3_prefix}{filename}",
                dest,
            )


def load_models() -> ModelBundle:
    """Load the model bundle into the module level cache. Called at startup."""
    global _bundle
    if _bundle is None:
        # _sync_models_from_s3()  # AWS (later): hydrate models from S3 first
        _bundle = ModelBundle()
    return _bundle


def get_bundle() -> ModelBundle:
    if _bundle is None:
        return load_models()
    return _bundle


def build_features(rainfall_7day: list[float], month: int) -> dict[str, float]:
    """Turn a 7 day rainfall scenario into the engineered model features.

    rainfall_7day is 7 daily totals in millimeters ordered oldest first, so the
    last element is the rain on the day before the sample. The derived features
    match the definitions used when the master dataset was built.
    """
    arr = np.asarray(rainfall_7day, dtype=float)

    rain_24hr = float(arr[-1])
    rain_48hr = float(arr[-2:].sum())
    rain_72hr = float(arr[-3:].sum())
    rain_7day = float(arr.sum())
    max_rain_3day = float(arr[-3:].max())

    # days_since_rain: consecutive dry days counting back from the most recent day.
    days_since_rain = 0
    for value in arr[::-1]:
        if value <= 0:
            days_since_rain += 1
        else:
            break

    return {
        "rain_24hr": rain_24hr,
        "rain_48hr": rain_48hr,
        "rain_72hr": rain_72hr,
        "rain_7day": rain_7day,
        "days_since_rain": float(days_since_rain),
        "max_rain_3day": max_rain_3day,
        "month": float(month),
    }


def predict(features: dict[str, float]) -> dict:
    """Run the models on a single engineered feature dict and return a verdict."""
    bundle = get_bundle()

    # Build a one row frame in the exact trained feature order to avoid any
    # column ordering or naming mismatch.
    row = pd.DataFrame([[features[name] for name in bundle.features]],
                       columns=bundle.features)

    unsafe_proba = float(bundle.classifier.predict_proba(row)[:, 1][0])

    # Secondary continuous risk score from the regressor, inverted from log space
    # back to a bacteria estimate in CFU per 100 mL.
    predicted_log = float(bundle.regressor.predict(row)[0])
    predicted_cfu = float(np.expm1(predicted_log))

    return {
        "unsafe_probability": unsafe_proba,
        "unsafe": bool(unsafe_proba >= 0.5),
        "predicted_enterococcus_cfu": predicted_cfu,
        "bav_threshold": bundle.bav_threshold,
        "features_used": features,
    }
