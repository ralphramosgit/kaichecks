"""Kaichecks FastAPI application.

Loads the trained models at startup and exposes endpoints the frontend uses to
simulate rainfall scenarios and explore Oahu beaches. The model is the XGBoost
classifier chosen during training, with the regressor providing a secondary
continuous risk estimate.
"""

import logging
import sys
from contextlib import asynccontextmanager

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .ml import build_features, get_bundle, load_models, predict
from .schemas import (
    Beach,
    HealthResponse,
    PredictionResponse,
    ScenarioRequest,
)

# Dedicated logger that always writes to stdout, so the real request inputs and
# model outputs appear in `docker compose up` / `docker logs`. This lets you
# confirm every number on the site comes from a live API response, not from any
# hardcoded or fallback data.
logger = logging.getLogger("kaichecks")
if not logger.handlers:
    _handler = logging.StreamHandler(sys.stdout)
    _handler.setFormatter(logging.Formatter("%(levelname)s:     [kaichecks] %(message)s"))
    logger.addHandler(_handler)
logger.setLevel(logging.INFO)
logger.propagate = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the models once when the server starts so requests are fast.
    load_models()
    yield


app = FastAPI(
    title="Kaichecks API",
    description=(
        "Predicts whether an Oahu beach is unsafe for swimming based on "
        "antecedent rainfall."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Liveness check that also confirms the models loaded."""
    try:
        bundle = get_bundle()
        return HealthResponse(
            status="ok",
            models_loaded=True,
            primary_model=bundle.metadata.get("primary_model_for_app"),
            features=bundle.features,
        )
    except Exception:
        return HealthResponse(status="degraded", models_loaded=False)


@app.get("/")
def root() -> dict:
    """Friendly landing payload pointing at the docs."""
    return {
        "name": "Kaichecks API",
        "docs": "/docs",
        "endpoints": ["/health", "/predict", "/beaches", "/metadata"],
    }


@app.get("/metadata")
def metadata() -> dict:
    """Return the training metadata, including features and test metrics."""
    return get_bundle().metadata


@app.post("/predict", response_model=PredictionResponse)
def predict_scenario(request: ScenarioRequest) -> PredictionResponse:
    """Score a rainfall scenario and return the beach safety prediction."""
    features = build_features(request.rainfall_7day, request.month)
    result = predict(features)
    response = PredictionResponse(**result)
    logger.info(
        "POST /predict  IN : month=%s rain_7day=%s",
        request.month,
        request.rainfall_7day,
    )
    logger.info(
        "POST /predict  OUT: unsafe_probability=%.4f unsafe=%s "
        "predicted_enterococcus_cfu=%.1f bav_threshold=%s",
        response.unsafe_probability,
        response.unsafe,
        response.predicted_enterococcus_cfu,
        response.bav_threshold,
    )
    return response


@app.get("/beaches", response_model=list[Beach])
def beaches() -> list[Beach]:
    """Return the Oahu beach catalog for the map, with historical risk."""
    bundle = get_bundle()
    catalog = bundle.beach_catalog
    if catalog.empty:
        raise HTTPException(status_code=404, detail="Beach catalog not available")

    # Collapse any duplicate location ids to one pin, keeping the busiest record.
    catalog = catalog.sort_values("n", ascending=False).drop_duplicates("location_id")

    result = []
    for _, row in catalog.iterrows():
        station = row.get("nearest_station_id")
        result.append(
            Beach(
                location_id=str(row["location_id"]),
                location_name=str(row["location_name"]),
                latitude=float(row["latitude"]),
                longitude=float(row["longitude"]),
                samples=int(row["n"]),
                exceedance_rate=float(row["exceed_rate"]),
                nearest_station_id=None if pd.isna(station) else str(station),
            )
        )
    logger.info(
        "GET /beaches  OUT: %d beaches served from the live catalog "
        "(e.g. %r samples=%s exceedance_rate=%.4f station=%s)",
        len(result),
        result[0].location_name,
        result[0].samples,
        result[0].exceedance_rate,
        result[0].nearest_station_id,
    )
    return result
