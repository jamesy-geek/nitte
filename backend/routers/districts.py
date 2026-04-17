"""
routers/districts.py
--------------------
GET /api/districts
  Returns all 30 Karnataka districts with their name, latitude, and longitude
  read from ml/muip_districts.csv.
"""

from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["Districts"])

_CSV_PATH = Path(__file__).resolve().parent.parent / "ml" / "muip_districts.csv"


def _load_districts() -> list[dict]:
    if not _CSV_PATH.exists():
        raise FileNotFoundError(f"Districts CSV not found at {_CSV_PATH}")

    df = pd.read_csv(_CSV_PATH)
    # Keep only the columns required by the contract
    records = (
        df[["district", "lat", "lon"]]
        .dropna(subset=["district"])
        .rename(columns={"district": "name"})
        .to_dict(orient="records")
    )
    return records


@router.get("/districts", summary="List all Karnataka districts")
def get_districts():
    """
    Returns every district in the MUIP dataset with:
    - **name**: district name
    - **lat**: latitude centroid
    - **lon**: longitude centroid
    """
    try:
        districts = _load_districts()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {"count": len(districts), "districts": districts}
