"""
routers/reports.py
------------------
POST /api/reports — Submit a new citizen report (stored in-memory)
GET  /api/reports — Retrieve all submitted reports
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(tags=["Reports"])

# In-memory store (resets on server restart)
_reports: List[dict] = []


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ReportCreate(BaseModel):
    category: str = Field(..., description="Type of issue, e.g. 'flood', 'road_damage'")
    description: str = Field(..., description="Free-text description of the issue")
    lat: float = Field(..., description="Latitude where the issue was observed")
    lon: float = Field(..., description="Longitude where the issue was observed")
    district: str = Field(..., description="District name where the issue occurred")


class ReportResponse(BaseModel):
    id: str
    category: str
    description: str
    lat: float
    lon: float
    district: str
    submitted_at: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/reports", response_model=ReportResponse, status_code=201,
             summary="Submit a new citizen report")
def create_report(payload: ReportCreate):
    """
    Accepts a citizen-submitted urban issue report and stores it in memory.

    Fields:
    - **category** – issue type (e.g. 'flood', 'pothole', 'power_outage')
    - **description** – human-readable description
    - **lat / lon** – GPS coordinates of the issue
    - **district** – Karnataka district name
    """
    report = {
        "id": str(uuid.uuid4()),
        "category": payload.category,
        "description": payload.description,
        "lat": payload.lat,
        "lon": payload.lon,
        "district": payload.district,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    _reports.append(report)
    return report


@router.get("/reports", response_model=List[ReportResponse],
            summary="Get all submitted reports")
def get_reports():
    """
    Returns every citizen report that has been submitted since server startup.
    """
    return _reports
