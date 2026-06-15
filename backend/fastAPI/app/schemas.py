"""Pydantic request and response schemas for the Kaimaemae API."""

from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ScenarioRequest(BaseModel):
    """A rainfall scenario to score.

    rainfall_7day holds 7 daily rainfall totals in millimeters, ordered oldest
    day first and most recent day last. month is the calendar month of the
    simulated sample date and captures the wet versus dry season effect.
    """

    rainfall_7day: list[float] = Field(
        ...,
        description="Seven daily rainfall totals in mm, oldest first, newest last.",
    )
    month: int = Field(
        ..., ge=1, le=12, description="Calendar month of the sample, 1 to 12."
    )

    @field_validator("rainfall_7day")
    @classmethod
    def check_length_and_sign(cls, value: list[float]) -> list[float]:
        if len(value) != 7:
            raise ValueError("rainfall_7day must contain exactly 7 daily values")
        if any(v < 0 for v in value):
            raise ValueError("rainfall values cannot be negative")
        return value


class PredictionResponse(BaseModel):
    unsafe_probability: float
    unsafe: bool
    predicted_enterococcus_cfu: float
    bav_threshold: float
    features_used: dict[str, float]


class Beach(BaseModel):
    location_id: str
    location_name: str
    latitude: float
    longitude: float
    samples: int
    exceedance_rate: float
    nearest_station_id: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    primary_model: Optional[str] = None
    features: list[str] = []
