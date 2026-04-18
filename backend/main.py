"""
main.py
-------
MUIP — Karnataka Urban Digital Twin
FastAPI application entry-point.

Startup:
  - Loads all ML models via model_service.load_models()
  - Mounts routers at /api prefix

CORS:
  - Allowed for all origins (required by browser-based dashboards)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import districts, predict, reports, roads
from services import model_service


# ---------------------------------------------------------------------------
# Lifespan: load heavy artefacts once at startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models before the first request is served."""
    print("[MUIP] Loading ML models…")
    model_service.load_models()
    print("[MUIP] Models ready. Server is up.")
    yield
    # (optional teardown goes here)
    print("[MUIP] Shutting down.")


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="MUIP — Karnataka Urban Digital Twin",
    description=(
        "Multi-model Urban Intelligence Platform for Karnataka. "
        "Provides district data, real-time geo enrichment, "
        "ML-based scenario predictions, and citizen report ingestion."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow all origins (required for browser dashboards on any port)
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Mount routers
# ---------------------------------------------------------------------------

app.include_router(districts.router, prefix="/api")
app.include_router(predict.router,   prefix="/api")
app.include_router(reports.router,   prefix="/api")
app.include_router(roads.router,     prefix="/api")


# ---------------------------------------------------------------------------
# Health-check (root)
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
def root():
    return {
        "service": "MUIP Backend",
        "status": "running",
        "docs": "/docs",
    }


# ---------------------------------------------------------------------------
# Dev entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)