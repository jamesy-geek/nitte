"""
routers/roads.py
----------------
GET /api/roads/{district}

Fetches major road segments from OSM Overpass for the district bounding box,
scores each road by busyness (road type + proximity to hospitals/schools/tourist
spots), and returns a GeoJSON FeatureCollection.

Busyness score 0–10:
  Base by road type: trunk=8, primary=7, secondary=5, tertiary=3
  Proximity bonuses:
    hospital < 1 km  → +2
    hospital 1–3 km  → +1
    school   < 0.5 km → +0.8
    tourist  < 0.5 km → +1

Results are cached in-memory per district (reset on server restart).
"""

import math
from pathlib import Path
from typing import Optional

import httpx
import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["Roads"])

# ---------------------------------------------------------------------------
# District coordinates (reuse the same CSV the predict router uses)
# ---------------------------------------------------------------------------
_CSV_PATH = Path(__file__).resolve().parent.parent / "ml" / "muip_districts.csv"
_district_coords: dict[str, tuple[float, float]] = {}
_road_cache: dict[str, dict] = {}   # district → GeoJSON (session cache)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
BBOX_OFFSET   = 0.25          # ~27 km in each direction from district HQ
MAX_ROADS     = 250           # cap to keep payload reasonable


def _load_coords() -> dict[str, tuple[float, float]]:
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
# Geometry helpers
# ---------------------------------------------------------------------------

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(max(0, min(1, a))))


def _midpoint(coords: list[list[float]]) -> tuple[float, float]:
    """Return the geographic midpoint of a LineString coordinate list [[lon,lat], ...]."""
    lats = [c[1] for c in coords]
    lons = [c[0] for c in coords]
    return sum(lats) / len(lats), sum(lons) / len(lons)


# ---------------------------------------------------------------------------
# Busyness scoring
# ---------------------------------------------------------------------------

BASE_SCORES = {
    "trunk":     8.0,
    "primary":   7.0,
    "secondary": 5.0,
    "tertiary":  3.0,
}


def _busyness_color(score: float) -> str:
    if score >= 8:
        return "#ef4444"   # red
    if score >= 6:
        return "#f97316"   # orange
    if score >= 4:
        return "#eab308"   # yellow
    return "#22c55e"       # green


def _busyness_label(score: float) -> str:
    if score >= 8:
        return "VERY HIGH"
    if score >= 6:
        return "HIGH"
    if score >= 4:
        return "MODERATE"
    return "LOW"


def _score_roads(
    ways: list[dict],
    hospitals: list[tuple[float, float]],
    schools: list[tuple[float, float]],
    tourists: list[tuple[float, float]],
) -> list[dict]:
    """
    Score each way and return a list of GeoJSON Feature dicts, sorted by busyness desc.
    """
    features = []

    for way in ways:
        tags = way.get("tags", {})
        highway = tags.get("highway", "")
        base = BASE_SCORES.get(highway, 2.0)

        # Build coordinate list [[lon, lat], ...] from OSM geometry
        geom_nodes = way.get("geometry", [])
        if len(geom_nodes) < 2:
            continue
        coords = [[n["lon"], n["lat"]] for n in geom_nodes]

        mid_lat, mid_lon = _midpoint(coords)

        bonus = 0.0

        # Hospital proximity
        for h_lat, h_lon in hospitals:
            d = _haversine_km(mid_lat, mid_lon, h_lat, h_lon)
            if d < 1.0:
                bonus += 2.0
                break
            elif d < 3.0:
                bonus += 1.0
                break

        # School proximity
        for s_lat, s_lon in schools:
            if _haversine_km(mid_lat, mid_lon, s_lat, s_lon) < 0.5:
                bonus += 0.8
                break

        # Tourist proximity
        for t_lat, t_lon in tourists:
            if _haversine_km(mid_lat, mid_lon, t_lat, t_lon) < 0.5:
                bonus += 1.0
                break

        score = round(min(10.0, base + bonus), 1)
        name  = tags.get("name") or tags.get("ref") or highway.replace("_", " ").title()

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": coords,
            },
            "properties": {
                "id":        way.get("id"),
                "name":      name,
                "highway":   highway,
                "busyness":  score,
                "color":     _busyness_color(score),
                "label":     _busyness_label(score),
            },
        })

    features.sort(key=lambda f: f["properties"]["busyness"], reverse=True)
    return features[:MAX_ROADS]


# ---------------------------------------------------------------------------
# Overpass fetchers
# ---------------------------------------------------------------------------

async def _fetch_roads(bbox: str) -> list[dict]:
    query = f"""
[out:json][timeout:30];
way["highway"~"^(trunk|primary|secondary|tertiary)$"]({bbox});
out geom;
"""
    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            r = await client.post(OVERPASS_URL, data={"data": query})
            r.raise_for_status()
            return r.json().get("elements", [])
    except Exception:
        return []


async def _fetch_pois(bbox: str) -> tuple[list, list, list]:
    query = f"""
[out:json][timeout:20];
(
  node["amenity"~"^(hospital|clinic)$"]({bbox});
  node["amenity"="school"]({bbox});
  node["tourism"]({bbox});
);
out body;
"""
    hospitals, schools, tourists = [], [], []
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            r = await client.post(OVERPASS_URL, data={"data": query})
            r.raise_for_status()
            for el in r.json().get("elements", []):
                lat, lon = el.get("lat", 0), el.get("lon", 0)
                amenity = el.get("tags", {}).get("amenity", "")
                tourism = el.get("tags", {}).get("tourism", "")
                if amenity in ("hospital", "clinic"):
                    hospitals.append((lat, lon))
                elif amenity == "school":
                    schools.append((lat, lon))
                elif tourism:
                    tourists.append((lat, lon))
    except Exception:
        pass
    return hospitals, schools, tourists


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/roads/{district}", summary="Road busyness GeoJSON for a district")
async def get_road_busyness(district: str):
    """
    Returns a GeoJSON FeatureCollection of major roads in the district,
    each scored 0–10 for busyness based on road type and proximity to
    hospitals, schools, and tourist spots.

    Results are cached per district for the server session.
    """
    # Serve from cache if available
    if district in _road_cache:
        return _road_cache[district]

    coords = _load_coords()
    if district not in coords:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown district '{district}'. Check GET /api/districts.",
        )

    lat, lon = coords[district]
    south = lat - BBOX_OFFSET
    north = lat + BBOX_OFFSET
    west  = lon - BBOX_OFFSET
    east  = lon + BBOX_OFFSET
    bbox  = f"{south},{west},{north},{east}"

    # Fetch roads and POIs concurrently (sequential here — both are fast)
    ways                       = await _fetch_roads(bbox)
    hospitals, schools, tourists = await _fetch_pois(bbox)

    features = _score_roads(ways, hospitals, schools, tourists)

    geojson = {
        "type":     "FeatureCollection",
        "district": district,
        "count":    len(features),
        "features": features,
    }

    _road_cache[district] = geojson
    return geojson
