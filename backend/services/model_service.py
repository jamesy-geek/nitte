"""
model_service.py
----------------
Loads all MUIP joblib artefacts once at application startup and exposes
a single `run_predictions(features_dict)` function that returns a dict
with predictions from every available model.

Joblib files expected in  ./ml/ (relative to backend/):
  - muip_models.joblib          → dict mapping model_name → fitted estimator
  - muip_features.joblib        → list of feature column names (in order)
  - muip_district_encoder.joblib → LabelEncoder for the 'district' column
  - muip_scenario_encoder.joblib → LabelEncoder for the 'scenario' column
"""

import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_ML_DIR = Path(__file__).resolve().parent.parent / "ml"

_MODELS_PATH   = _ML_DIR / "muip_models.joblib"
_FEATURES_PATH = _ML_DIR / "muip_features.joblib"
_DISTRICT_ENC  = _ML_DIR / "muip_district_encoder.joblib"
_SCENARIO_ENC  = _ML_DIR / "muip_scenario_encoder.joblib"

# ---------------------------------------------------------------------------
# Module-level state (populated by load_models())
# ---------------------------------------------------------------------------
_models: dict           = {}
_feature_names: list    = []
_district_encoder       = None
_scenario_encoder       = None
_loaded: bool           = False


def load_models() -> None:
    """
    Load all joblib artefacts into module-level variables.
    Called once from main.py lifespan startup.
    """
    global _models, _feature_names, _district_encoder, _scenario_encoder, _loaded

    if _loaded:
        return

    if not _MODELS_PATH.exists():
        raise FileNotFoundError(f"muip_models.joblib not found at {_MODELS_PATH}")

    _models           = joblib.load(_MODELS_PATH)
    _feature_names    = joblib.load(_FEATURES_PATH)
    _district_encoder = joblib.load(_DISTRICT_ENC)
    _scenario_encoder = joblib.load(_SCENARIO_ENC)

    _loaded = True
    print(f"[model_service] Loaded {len(_models)} model(s): {list(_models.keys())}")
    print(f"[model_service] Feature columns ({len(_feature_names)}): {_feature_names}")


# ---------------------------------------------------------------------------
# Prediction helper
# ---------------------------------------------------------------------------

def _encode_input(raw: dict) -> pd.DataFrame:
    """
    Encode a raw input dict into a single-row DataFrame aligned to
    _feature_names, applying LabelEncoders for categorical fields.
    """
    row = dict(raw)  # shallow copy

    # Encode categoricals
    district_val = row.get("district", "")
    scenario_val = row.get("scenario", "")

    try:
        row["district"] = int(
            _district_encoder.transform([district_val])[0]
        )
    except Exception:
        row["district"] = 0  # fallback: unknown district → 0

    try:
        row["scenario"] = int(
            _scenario_encoder.transform([scenario_val])[0]
        )
    except Exception:
        row["scenario"] = 0  # fallback: unknown scenario → 0

    # Build DataFrame with expected column order; missing cols default to 0
    data = {col: [row.get(col, 0)] for col in _feature_names}
    return pd.DataFrame(data)


def run_predictions(features: dict) -> dict:
    """
    Run inference across all loaded models and return a dict of
    {model_name: prediction_value}.

    `features` is a raw dict with string district/scenario names plus
    numeric fields.
    """
    if not _loaded:
        raise RuntimeError("Models are not loaded. Call load_models() first.")

    X = _encode_input(features)

    results: dict = {}
    for model_name, model in _models.items():
        try:
            pred = model.predict(X)
            value = pred[0]
            # Convert numpy scalars to native Python types for JSON serialisation
            if hasattr(value, "item"):
                value = value.item()
            results[model_name] = value
        except Exception as exc:
            results[model_name] = f"error: {exc}"

    return results
