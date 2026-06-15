"""Application configuration for the Kaimaemae API.

All settings can be overridden with environment variables, which keeps the app
container friendly for the later Docker step. The defaults resolve the model
artifacts produced by the training notebook relative to this file.
"""

import os
from functools import lru_cache


# This file lives at backend/api/app/config.py.
# backend/api/app -> backend/api -> backend -> project root.
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.abspath(os.path.join(_THIS_DIR, "..", "..", ".."))

# Default location of the trained model artifacts from the ML notebook.
_DEFAULT_MODELS_DIR = os.path.join(
    _PROJECT_ROOT, "backend", "machine_learning", "models"
)


class Settings:
    """Runtime settings, sourced from environment variables when present."""

    def __init__(self) -> None:
        self.models_dir: str = os.environ.get(
            "KAIMAEMAE_MODELS_DIR", _DEFAULT_MODELS_DIR
        )
        self.metadata_file: str = "model_metadata.json"
        self.classifier_file: str = "xgb_classifier.json"
        self.regressor_file: str = "xgb_regressor.json"
        self.beach_catalog_file: str = "beach_catalog.csv"

        # Comma separated list of allowed CORS origins for the frontend.
        # Defaults to a permissive value for local development.
        origins = os.environ.get("KAIMAEMAE_CORS_ORIGINS", "*")
        self.cors_origins: list[str] = [o.strip() for o in origins.split(",")]

    def path(self, filename: str) -> str:
        return os.path.join(self.models_dir, filename)


@lru_cache
def get_settings() -> Settings:
    return Settings()
