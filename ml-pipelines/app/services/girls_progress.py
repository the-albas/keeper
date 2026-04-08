"""Load girls progress regression Pipeline and build feature rows (matches girls_progressing.ipynb Phase 3)."""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.config import girls_progress_pipeline_path

# Must match GIRLS_* in girls_progressing.ipynb — never include mean_progress as input.
GIRLS_NUMERIC_FEATURES = [
    "present_age_years",
    "length_stay_years",
    "age_upon_admission_years",
    "sub_cat_orphaned",
    "sub_cat_trafficked",
    "sub_cat_child_labor",
    "sub_cat_physical_abuse",
    "sub_cat_sexual_abuse",
    "sub_cat_osaec",
    "sub_cat_cicl",
    "sub_cat_at_risk",
    "sub_cat_street_child",
    "sub_cat_child_with_hiv",
    "is_pwd",
    "has_special_needs",
    "family_is_4ps",
    "family_solo_parent",
    "family_indigenous",
    "family_parent_pwd",
    "family_informal_settler",
    "hw_mean_general_health_score",
    "hw_mean_nutrition_score",
    "hw_mean_sleep_quality_score",
    "hw_mean_energy_level_score",
    "hw_mean_height_cm",
    "hw_mean_weight_kg",
    "hw_mean_bmi",
    "hw_rate_medical_checkup_done",
    "hw_rate_dental_checkup_done",
    "hw_rate_psychological_checkup_done",
    "n_intervention_plans",
    "n_home_visitations",
    "edu_earliest_progress",
    "edu_earliest_attendance_rate",
]
GIRLS_CATEGORICAL_FEATURES = [
    "case_status",
    "sex",
    "birth_status",
    "case_category",
    "referral_source",
    "assigned_social_worker",
    "reintegration_type",
    "reintegration_status",
    "initial_risk_level",
    "current_risk_level",
    "pwd_type",
    "special_needs_diagnosis",
    "edu_earliest_education_level",
    "region",
    "province",
    "status",
]
GIRLS_FEATURE_COLUMNS = GIRLS_NUMERIC_FEATURES + GIRLS_CATEGORICAL_FEATURES

_AGE_FLOAT_COLS = ("present_age_years", "length_stay_years", "age_upon_admission_years")


def load_girls_progress_pipeline(path: Path | None = None):
    p = path or girls_progress_pipeline_path()
    if not p.is_file():
        raise FileNotFoundError(
            f"Girls progress pipeline not found at {p}. "
            "Train girls_progressing.ipynb Phase 6 or set GIRLS_PROGRESS_PIPELINE_PATH."
        )
    return joblib.load(p)


def _is_missing(v) -> bool:
    if v is None:
        return True
    if isinstance(v, float) and np.isnan(v):
        return True
    return False


def clean_girls_progress_row(row: dict) -> pd.DataFrame:
    """Align with notebook cleaning: categoricals → Unknown; age floats median-filled (single-row safe)."""
    data = {k: row.get(k) for k in GIRLS_FEATURE_COLUMNS}
    out = pd.DataFrame([data])

    for c in GIRLS_CATEGORICAL_FEATURES:
        v = out.at[0, c]
        if _is_missing(v):
            out.at[0, c] = "Unknown"
        else:
            s = str(v).strip()
            out.at[0, c] = "Unknown" if s == "" or s.lower() == "nan" else s

    for c in GIRLS_NUMERIC_FEATURES:
        if c in _AGE_FLOAT_COLS:
            continue
        out[c] = pd.to_numeric(out[c], errors="coerce")

    for c in _AGE_FLOAT_COLS:
        out[c] = pd.to_numeric(out[c], errors="coerce")
        med = float(out[c].median(skipna=True))
        if np.isnan(med):
            med = 0.0
        out[c] = out[c].fillna(med)

    return out[GIRLS_FEATURE_COLUMNS]


def predict_girls_progress(pipeline, row: dict) -> float:
    X = clean_girls_progress_row(row)
    return float(pipeline.predict(X)[0])
