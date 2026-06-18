"""Application configuration for the Kaichecks API.

All settings can be overridden with environment variables, which keeps the app
container friendly for Docker and ECS Fargate. Defaults resolve to the local
model artifacts produced by the training notebook so local dev requires no AWS.
"""

import os
from functools import lru_cache


_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.abspath(os.path.join(_THIS_DIR, "..", "..", ".."))

_DEFAULT_MODELS_DIR = os.path.join(
    _PROJECT_ROOT, "backend", "machine_learning", "models"
)


class Settings:
    """Runtime settings, sourced from environment variables when present."""

    def __init__(self) -> None:
        # ── Model artifacts ──────────────────────────────────────────────────
        # Local dev: reads from backend/machine_learning/models/ on disk.
        # AWS (ECS): set KAICHECKS_MODELS_S3_BUCKET and the startup hook in
        # ml.py will pull artifacts from S3 into /tmp/models before loading.
        self.models_dir: str = os.environ.get(
            "KAICHECKS_MODELS_DIR", _DEFAULT_MODELS_DIR
        )
        self.metadata_file: str = "model_metadata.json"
        self.classifier_file: str = "xgb_classifier.json"
        self.regressor_file: str = "xgb_regressor.json"
        self.beach_catalog_file: str = "beach_catalog.csv"

        # ── S3 (model storage) ───────────────────────────────────────────────
        # Set these in the ECS task definition environment variables.
        # Leave blank for local dev - models load from disk instead.
        self.s3_bucket: str = os.environ.get("KAICHECKS_MODELS_S3_BUCKET", "")
        self.s3_prefix: str = os.environ.get("KAICHECKS_MODELS_S3_PREFIX", "models/")

        # ── CORS ─────────────────────────────────────────────────────────────
        # Local: "*" (permissive). AWS: set to your Amplify URL.
        # e.g. KAICHECKS_CORS_ORIGINS=https://main.d1abc123.amplifyapp.com
        origins = os.environ.get("KAICHECKS_CORS_ORIGINS", "*")
        self.cors_origins: list[str] = [o.strip() for o in origins.split(",")]

        # ── AWS ───────────────────────────────────────────────────────────────
        self.aws_region: str = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")

        # ── Secrets Manager (GPT API key) ─────────────────────────────────────
        # ARN of the kaichecks/openai secret in Secrets Manager.
        # Leave blank for local dev - set OPENAI_API_KEY directly instead.
        # AWS: set KAICHECKS_SECRETS_MANAGER_GPT_ARN in the task definition.
        self.secrets_manager_gpt_arn: str = os.environ.get(
            "KAICHECKS_SECRETS_MANAGER_GPT_ARN", ""
        )
        # Resolved at runtime by get_openai_key() below; not stored here.

    @property
    def use_s3(self) -> bool:
        return bool(self.s3_bucket)

    @property
    def use_secrets_manager(self) -> bool:
        return bool(self.secrets_manager_gpt_arn)

    def path(self, filename: str) -> str:
        return os.path.join(self.models_dir, filename)


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_openai_key() -> str:
    """Return the OpenAI key from Secrets Manager (AWS) or env var (local)."""
    settings = get_settings()

    if settings.use_secrets_manager:
        # AWS path: fetch from Secrets Manager at runtime.
        # Requires boto3 in requirements.txt and the task role having
        # secretsmanager:GetSecretValue on the ARN.
        import json
        import boto3  # type: ignore[import]

        client = boto3.client("secretsmanager", region_name=settings.aws_region)
        response = client.get_secret_value(SecretId=settings.secrets_manager_gpt_arn)
        secret = json.loads(response["SecretString"])
        return secret.get("OPENAI_API_KEY", "")

    # Local dev fallback: read directly from environment.
    return os.environ.get("OPENAI_API_KEY", "")
