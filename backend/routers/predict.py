"""
routers/predict.py
------------------
POST /api/predict

Accepts scenario inputs, auto-fetches geo data (rainfall + hospital count)
from geo_service, encodes the full feature vector, runs all loaded models,
and returns their predictions in a single response.
"""

from pathlib import Path
from typing import Literal, Optional

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services import geo_service, model_service

router = APIRouter(tags=["Predict"])

_CSV_PATH = Path(__file__).resolve().parent.parent / "ml" / "muip_districts.csv"

# Cache the district → (lat, lon) lookup once
_district_coords: dict[str, tuple[float, float]] = {}


def _get_district_coords() -> dict[str, tuple[float, float]]:
    global _district_coords
    if _district_coords:
        return _district_coords
    df = pd.read_csv(_CSV_PATH).dropna(subset=["district"])
    _district_coords = {
        row["district"]: (row["lat"], row["lon"])
        for _, row in df.iterrows()
    }
    return _district_coords


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class PredictRequest(BaseModel):
    district: str = Field(..., description="Karnataka district name")
    scenario: str = Field(
        ...,
        description="Risk scenario, e.g. 'flood', 'traffic_surge', 'power_outage'"
    )
    roads_affected: int = Field(..., ge=0, description="Number of roads affected")
    time_of_day: int = Field(..., ge=0, le=23, description="Hour of day (0–23)")
    is_festival: int = Field(..., ge=0, le=1, description="1 if a festival is active")
    crowd_count: int = Field(..., ge=0, description="Estimated crowd count")
    is_construction: int = Field(..., ge=0, le=1, description="1 if construction is ongoing")
    is_bus_disruption: int = Field(..., ge=0, le=1, description="1 if bus service is disrupted")
    is_elec_failure: int = Field(..., ge=0, le=1, description="1 if electricity failure is active")
    is_mobile_stress: int = Field(..., ge=0, le=1, description="1 if mobile network is stressed")


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/predict", summary="Run MUIP multi-model prediction")
async def predict(payload: PredictRequest):
    """
    Runs all MUIP ML models and returns their predictions.

    **Auto-fetched fields** (you do NOT need to provide):
    - `rainfall_mm` — current precipitation at the district centroid (Open-Meteo)
    - `hospital_count` — number of hospitals within 10 km (OSM Overpass)

    All other fields are taken directly from the request body.
    """
    # 1. Resolve district coordinates
    coords = _get_district_coords()
    if payload.district not in coords:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown district '{payload.district}'. "
                   f"Check GET /api/districts for valid names."
        )
    lat, lon = coords[payload.district]

    # 2. Fetch live geo data
    rainfall_mm, hospital_count = await geo_service.get_current_rainfall(
        lat, lon
    ), await geo_service.get_hospital_count(lat, lon)
    # Note: we run sequentially here (both are fast and rate-limit friendly)
    # For true parallelism, use asyncio.gather instead.

    # 3. Build the feature dict (matches training column names)
    features = {
        "district":         payload.district,
        "scenario":         payload.scenario,
        "roads_affected":   payload.roads_affected,
        "time_of_day":      payload.time_of_day,
        "is_festival":      payload.is_festival,
        "crowd_count":      payload.crowd_count,
        "is_construction":  payload.is_construction,
        "is_bus_disruption": payload.is_bus_disruption,
        "is_elec_failure":  payload.is_elec_failure,
        "is_mobile_stress": payload.is_mobile_stress,
        "rainfall_mm":      rainfall_mm,
        "hospital_count":   hospital_count,
    }

    # 4. Run inference
    try:
        predictions = model_service.run_predictions(features)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return {
        "district": payload.district,
        "scenario": payload.scenario,
        "geo_fetched": {
            "lat": lat,
            "lon": lon,
            "rainfall_mm": rainfall_mm,
            "hospital_count": hospital_count,
        },
        "predictions": predictions,
    }
