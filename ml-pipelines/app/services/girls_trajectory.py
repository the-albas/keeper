"""Load girls education trajectory artifact and build rows matching girls_education_trajectory.ipynb Phase 3."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from app.config import girls_education_trajectory_pipeline_path

# Must match TRAJ_* in girls_education_trajectory.ipynb (record-level row).
TRAJ_NUMERIC_FEATURES = [
    "current_progress",
    "days_since_admission",
    # days_to_next_record removed: future information not available at prediction time.
    "present_age_years",
    "age_upon_admission_years",
    "has_special_needs",
    "family_parent_pwd",
    "hw_mean_nutrition_score",
    "hw_mean_energy_level_score",
    "hw_mean_sleep_quality_score",
    "hw_mean_general_health_score",
    "hw_mean_bmi",
    "hw_rate_psychological_checkup_done",
    "n_incidents",
    "incident_high_rate",
    "incident_unresolved_rate",
    "n_home_visitations",
    "safety_concern_rate",
    "followup_needed_rate",
    "n_process_sessions",
    "concerns_flagged_rate",
    "referral_made_rate",
    "n_intervention_plans",
    "occupancy_ratio",
]
TRAJ_CATEGORICAL_FEATURES = [
    "case_status",
    "case_category",
    "initial_risk_level",
    "current_risk_level",
    "referral_source",
    "reintegration_status",
    "edu_education_level",
    "region",
    "province",
]
TRAJ_FEATURE_COLUMNS = TRAJ_NUMERIC_FEATURES + TRAJ_CATEGORICAL_FEATURES


def _float_threshold(v: Any) -> float | None:
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if isinstance(f, float) and (math.isnan(f) or math.isinf(f)):
        return None
    return f


def load_girls_trajectory_artifact(path: Path | None = None) -> dict[str, Any]:
    """
    Phase 6 saves a dict: {"pipeline": sklearn.Pipeline, "at_risk_threshold": float}.
    Plain Pipeline joblib files are accepted with threshold=None.
    """
    p = path or girls_education_trajectory_pipeline_path()
    if not p.is_file():
        raise FileNotFoundError(
            f"Girls education trajectory artifact not found at {p}. "
            "Run girls_education_trajectory.ipynb Phase 6 or set "
            "GIRLS_EDUCATION_TRAJECTORY_PIPELINE_PATH."
        )
    raw = joblib.load(p)
    if isinstance(raw, dict) and "pipeline" in raw:
        return {
            "pipeline": raw["pipeline"],
            "at_risk_threshold": _float_threshold(raw.get("at_risk_threshold")),
        }
    return {"pipeline": raw, "at_risk_threshold": None}


def _is_missing(v) -> bool:
    if v is None:
        return True
    if isinstance(v, float) and np.isnan(v):
        return True
    return False


def clean_girls_trajectory_row(row: dict) -> pd.DataFrame:
    """Single-row frame: numerics coerced; categoricals default to Unknown."""
    data = {k: row.get(k) for k in TRAJ_FEATURE_COLUMNS}
    out = pd.DataFrame([data])

    for c in TRAJ_CATEGORICAL_FEATURES:
        v = out.at[0, c]
        if _is_missing(v):
            out.at[0, c] = "Unknown"
        else:
            s = str(v).strip()
            out.at[0, c] = "Unknown" if s == "" or s.lower() == "nan" else s

    for c in TRAJ_NUMERIC_FEATURES:
        out[c] = pd.to_numeric(out[c], errors="coerce")

    return out[TRAJ_FEATURE_COLUMNS]


def risk_label(predicted_next_progress: float, at_risk_threshold: float | None) -> str | None:
    """Same rule as notebook Phase 5 (None if no threshold bundled)."""
    if at_risk_threshold is None:
        return None
    return "At Risk" if predicted_next_progress <= at_risk_threshold else "On Track"


def predict_girls_trajectory(
    bundle: dict[str, Any],
    row: dict,
) -> tuple[float, str | None, float | None]:
    """
    Returns (predicted_next_progress, risk_label_or_none, at_risk_threshold_or_none).
    """
    pipeline = bundle["pipeline"]
    thr = bundle.get("at_risk_threshold")
    X = clean_girls_trajectory_row(row)
    pred = float(pipeline.predict(X)[0])
    return pred, risk_label(pred, thr), thr
