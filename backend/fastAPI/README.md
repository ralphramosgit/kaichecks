# Kaimaemae API

FastAPI service that predicts whether an Oahu beach is unsafe for swimming based
on antecedent rainfall. It loads the models trained in
`backend/machine_learning/machine_learning.script.ipynb`.

## Layout

```
backend/api/
  app/
    __init__.py
    config.py     paths and settings, overridable via environment variables
    ml.py         model loading, feature engineering, prediction
    schemas.py    request and response models
    main.py       FastAPI app and endpoints
  requirements.txt
```

## Run locally

From the `backend/api` folder:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Then open http://localhost:8000/docs for the interactive API docs.

By default the app loads model artifacts from
`backend/machine_learning/models`. Override with the `KAIMAEMAE_MODELS_DIR`
environment variable if needed (this is the hook the future Docker image will
use to point at a copied models folder).

## Endpoints

- `GET /health` liveness check and confirmation that models loaded.
- `GET /metadata` training metadata, feature order, and test metrics.
- `POST /predict` score a rainfall scenario.
- `GET /beaches` Oahu beach catalog with historical exceedance rates for the map.

## Predict request

`rainfall_7day` is seven daily rainfall totals in millimeters, ordered oldest day
first and most recent day last. `month` is the calendar month of the simulated
sample. The server derives the same engineered features the model was trained on
(rain_24hr, rain_48hr, rain_72hr, rain_7day, days_since_rain, max_rain_3day,
month).

```json
{
  "rainfall_7day": [0, 0, 5, 12, 30, 8, 2],
  "month": 12
}
```

Response:

```json
{
  "unsafe_probability": 0.31,
  "unsafe": false,
  "predicted_enterococcus_cfu": 12.4,
  "bav_threshold": 130,
  "features_used": { "...": 0 }
}
```

The `unsafe_probability` from the classifier is the primary output. The
`predicted_enterococcus_cfu` from the regressor is a secondary continuous risk
estimate. As noted in the training summary, this is a screening signal that shifts
the odds, not a precise guarantee.
