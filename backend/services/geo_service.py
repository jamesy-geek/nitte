"""
geo_service.py
--------------
Provides two async helpers:
  - get_hospital_count(lat, lon)  — queries OSM Overpass API for nearby hospitals
  - get_current_rainfall(lat, lon) — queries Open-Meteo API for current precipitation
"""

import httpx

# Radius (metres) to search for hospitals around the given coordinate
HOSPITAL_SEARCH_RADIUS_M = 10_000

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


async def get_hospital_count(lat: float, lon: float) -> int:
    """
    Returns the number of hospitals/clinics within HOSPITAL_SEARCH_RADIUS_M metres
    of (lat, lon) using the OSM Overpass API.
    Falls back to 0 on any network / parse error.
    """
    query = f"""
[out:json][timeout:15];
(
  node["amenity"="hospital"](around:{HOSPITAL_SEARCH_RADIUS_M},{lat},{lon});
  way["amenity"="hospital"](around:{HOSPITAL_SEARCH_RADIUS_M},{lat},{lon});
  node["amenity"="clinic"](around:{HOSPITAL_SEARCH_RADIUS_M},{lat},{lon});
);
out count;
"""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(OVERPASS_URL, data={"data": query})
            response.raise_for_status()
            data = response.json()
            # Overpass returns {"elements": [{"type":"count","id":0,"tags":{"total":"N"}}]}
            elements = data.get("elements", [])
            if elements:
                total = elements[0].get("tags", {}).get("total", "0")
                return int(total)
            return 0
    except Exception:
        return 0


async def get_current_rainfall(lat: float, lon: float) -> float:
    """
    Returns current hourly precipitation (mm) from the Open-Meteo API for
    the given (lat, lon).  Falls back to 0.0 on any error.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "precipitation",
        "forecast_days": 1,
        "timezone": "Asia/Kolkata",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(OPEN_METEO_URL, params=params)
            response.raise_for_status()
            data = response.json()
            # hourly.precipitation is a list of 24 floats; take the latest non-None value
            precip_list = data.get("hourly", {}).get("precipitation", [])
            # Filter out None values and return the last available value
            valid = [p for p in precip_list if p is not None]
            return float(valid[-1]) if valid else 0.0
    except Exception:
        return 0.0
