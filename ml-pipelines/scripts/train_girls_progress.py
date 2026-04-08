"""
Standalone training script for the girls progress regression model.

Extracts Phase 3–6 logic from girls_progressing.ipynb so the FastAPI /admin/retrain
endpoint can re-fit the pipeline without running the notebook.

Usage (CLI):
    python scripts/train_girls_progress.py
"""

from __future__ import annotations

import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
    RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.model_selection import KFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# ── Feature / target constants (must match app/services/girls_progress.py) ───
GIRLS_NUMERIC_FEATURES = [
    "safehouse_id",
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
    "n_education_records",
    "n_intervention_plans",
    "n_home_visitations",
    "edu_earliest_progress",
    "edu_mean_attendance_rate",
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
    "edu_latest_education_level",
    "region",
    "province",
    "status",
]
TARGET = "mean_progress"
FEATURE_COLUMNS = GIRLS_NUMERIC_FEATURES + GIRLS_CATEGORICAL_FEATURES

RESIDENT_DROP = {"notes_restricted", "initial_case_assessment", "referring_agency_person"}


def _parse_years_months(value) -> float:
    if pd.isna(value) or not isinstance(value, str):
        return np.nan
    s = value.strip()
    m = re.match(r"(\d+)\s*[Yy]ears?\s*(\d+)\s*[Mm]onths?", s)
    if m:
        return int(m.group(1)) + int(m.group(2)) / 12.0
    m2 = re.match(r"(\d+)\s*[Yy]ears?", s)
    if m2:
        return float(m2.group(1))
    return np.nan


def _build_frame(data_root: Path) -> pd.DataFrame:
    res = pd.read_csv(data_root / "residents.csv")
    edu = pd.read_csv(data_root / "education_records.csv")
    hw = pd.read_csv(data_root / "health_wellbeing_records.csv")
    plans = pd.read_csv(data_root / "intervention_plans.csv")
    visits = pd.read_csv(data_root / "home_visitations.csv")
    houses = pd.read_csv(data_root / "safehouses.csv")

    edu = edu.copy()
    edu["record_date"] = pd.to_datetime(edu["record_date"], errors="coerce")
    edu_sorted = edu.sort_values(["resident_id", "record_date", "education_record_id"])

    mean_prog = (
        edu.groupby("resident_id")["progress_percent"]
        .mean().reset_index().rename(columns={"progress_percent": TARGET})
    )
    earliest_edu = edu_sorted.drop_duplicates(subset=["resident_id"], keep="first")
    earliest_prog = earliest_edu[["resident_id", "progress_percent", "education_level"]].rename(
        columns={"progress_percent": "edu_earliest_progress", "education_level": "edu_latest_education_level"}
    )
    mean_attend = (
        edu.groupby("resident_id")["attendance_rate"]
        .mean().reset_index().rename(columns={"attendance_rate": "edu_mean_attendance_rate"})
    )

    base = res.drop(columns=[c for c in RESIDENT_DROP if c in res.columns], errors="ignore")
    base = base.merge(mean_prog, on="resident_id", how="left")
    base = base.merge(earliest_prog, on="resident_id", how="left")
    base = base.merge(mean_attend, on="resident_id", how="left")

    base["present_age_years"] = base["present_age"].map(_parse_years_months)
    base["length_stay_years"] = base["length_of_stay"].map(_parse_years_months)
    base["age_upon_admission_years"] = base["age_upon_admission"].map(_parse_years_months)

    for c in list(base.columns):
        if base[c].dtype == bool:
            base[c] = base[c].astype(np.int8)

    house_keep = [c for c in ["safehouse_id", "region", "province", "status"] if c in houses.columns]
    base = base.merge(houses[house_keep], on="safehouse_id", how="left")

    hw_num = ["general_health_score", "nutrition_score", "sleep_quality_score", "energy_level_score", "height_cm", "weight_kg", "bmi"]
    hw_bool = ["medical_checkup_done", "dental_checkup_done", "psychological_checkup_done"]
    g = hw.groupby("resident_id", as_index=False)
    agg_num = g[[c for c in hw_num if c in hw.columns]].mean()
    agg_num = agg_num.rename(columns={c: f"hw_mean_{c}" for c in hw_num if c in hw.columns})
    agg_bool = g[[c for c in hw_bool if c in hw.columns]].mean()
    agg_bool = agg_bool.rename(columns={c: f"hw_rate_{c}" for c in hw_bool if c in hw.columns})
    base = base.merge(agg_num, on="resident_id", how="left")
    base = base.merge(agg_bool, on="resident_id", how="left")

    for col, src_df in [("n_education_records", edu), ("n_intervention_plans", plans), ("n_home_visitations", visits)]:
        counts = src_df.groupby("resident_id").size().reset_index(name=col)
        base = base.merge(counts, on="resident_id", how="left")
        base[col] = base[col].fillna(0).astype(int)

    return base


def _clean(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for c in out.columns:
        if c == "resident_id":
            continue
        if pd.api.types.is_object_dtype(out[c]) or pd.api.types.is_string_dtype(out[c]):
            out[c] = out[c].fillna("Unknown").astype(str).str.strip()
            out.loc[out[c] == "", c] = "Unknown"
            out.loc[out[c].str.lower() == "nan", c] = "Unknown"
    for c in ["present_age_years", "length_stay_years", "age_upon_admission_years"]:
        med = out[c].median(skipna=True)
        out[c] = out[c].fillna(float(med or 0.0))
    return out


def _build_preprocessor() -> ColumnTransformer:
    num_pipe = Pipeline([("imp", SimpleImputer(strategy="median")), ("scl", StandardScaler())])
    cat_pipe = Pipeline([
        ("imp", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer([
        ("num", num_pipe, GIRLS_NUMERIC_FEATURES),
        ("cat", cat_pipe, GIRLS_CATEGORICAL_FEATURES),
    ])


def retrain(data_root: Path, artifact_path: Path) -> dict:
    """
    Re-fit the girls progress pipeline from scratch and save to artifact_path.

    Returns a dict: {"model": str, "mae": float, "r2": float, "rows": int}
    """
    raw = _build_frame(data_root)
    df = _clean(raw)
    feature_cols = [c for c in FEATURE_COLUMNS if c in df.columns]
    X = df[feature_cols]
    y = df[TARGET]

    cv = KFold(n_splits=5, shuffle=True, random_state=42)
    candidates = {
        "gradient_boosting": GradientBoostingRegressor(
            random_state=42, max_depth=2, n_estimators=60, learning_rate=0.05,
            subsample=0.7, max_features=0.4, min_samples_leaf=8, min_samples_split=12,
        ),
        "hist_gradient_boosting": HistGradientBoostingRegressor(
            random_state=42, max_depth=3, max_iter=80, learning_rate=0.05,
            min_samples_leaf=10, l2_regularization=2.0,
        ),
        "random_forest": RandomForestRegressor(
            random_state=42, n_estimators=200, max_depth=3, min_samples_leaf=8,
            min_samples_split=16, max_features="sqrt", max_samples=0.8,
        ),
        "ridge": Ridge(alpha=200.0),
    }

    # Rebuild preprocessor using only columns actually present
    def _prep():
        num_feats = [c for c in GIRLS_NUMERIC_FEATURES if c in df.columns]
        cat_feats = [c for c in GIRLS_CATEGORICAL_FEATURES if c in df.columns]
        num_pipe = Pipeline([("imp", SimpleImputer(strategy="median")), ("scl", StandardScaler())])
        cat_pipe = Pipeline([
            ("imp", SimpleImputer(strategy="most_frequent")),
            ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ])
        return ColumnTransformer([("num", num_pipe, num_feats), ("cat", cat_pipe, cat_feats)])

    best_name, best_mae = None, float("inf")
    cv_scores_by_name = {}
    for name, reg in candidates.items():
        pipe = Pipeline([("prep", _prep()), ("reg", clone(reg))])
        scores = cross_validate(pipe, X, y, cv=cv, scoring=["neg_mean_absolute_error", "r2"])
        cv_scores_by_name[name] = scores
        mae = float(-scores["test_neg_mean_absolute_error"].mean())
        if mae < best_mae:
            best_mae, best_name = mae, name

    pipeline = Pipeline([("prep", _prep()), ("reg", clone(candidates[best_name]))])
    pipeline.fit(X, y)

    best = cv_scores_by_name[best_name]
    mae_cv = float(-best["test_neg_mean_absolute_error"].mean())
    r2_cv = float(best["test_r2"].mean())

    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, artifact_path)

    return {"model": best_name, "mae": round(mae_cv, 4), "r2": round(r2_cv, 4), "rows": len(df)}


def _find_repo() -> Path:
    here = Path(__file__).resolve()
    for p in [here, *here.parents]:
        if (p / "Dataset" / "lighthouse_csv_v7").is_dir():
            return p
    raise FileNotFoundError("Could not find Dataset/lighthouse_csv_v7/ from script location.")


if __name__ == "__main__":
    repo = _find_repo()
    data_root = repo / "Dataset" / "lighthouse_csv_v7"
    artifact = repo / "pipelines" / "girls_progress_pipeline_v2.sav"
    metrics = retrain(data_root, artifact)
    print(f"Saved to {artifact}")
    print(f"Model: {metrics['model']} | MAE: {metrics['mae']} | R²: {metrics['r2']} | Rows: {metrics['rows']}")
