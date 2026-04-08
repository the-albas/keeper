"""
Standalone training script for the donor growth regression model.

Extracts Phase 3–6 logic from donor_growth.ipynb so the FastAPI /admin/retrain
endpoint can re-fit the pipeline without running the notebook.

Usage (CLI):
    python scripts/train_growth.py

Returns (when imported):
    retrain(data_root, artifact_path) -> dict with model name and CV metrics
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
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# ── Feature / target constants (must match app/services/growth.py) ────────────
GROWTH_NUMERIC_FEATURES = [
    "recency_days",
    "frequency",
    "social_referral_count",
    "is_recurring_donor",
    "donor_tenure_days",
    # gift_volatility and donation_type_diversity removed: both are computed from the same
    # donation rows that sum to total_monetary_value (the target), making them circular.
    # avg_monetary_value also excluded (= target / frequency exactly — direct reconstruction).
]
GROWTH_CATEGORICAL_FEATURES = [
    "top_program_interest",
    "supporter_type",
    "relationship_type",
    "region",
    "acquisition_channel",
    "status",
]
TARGET = "total_monetary_value"
FEATURE_COLUMNS = GROWTH_NUMERIC_FEATURES + GROWTH_CATEGORICAL_FEATURES


# ── Data loading & feature engineering ────────────────────────────────────────

def _engineer_extra_features(eng_df: pd.DataFrame, data_root: Path) -> pd.DataFrame:
    out = eng_df.copy()

    sup = pd.read_csv(data_root / "supporters.csv", usecols=["supporter_id", "created_at"])
    sup["created_at"] = pd.to_datetime(sup["created_at"], errors="coerce")
    today = pd.Timestamp.today().normalize()
    sup["donor_tenure_days"] = (today - sup["created_at"]).dt.days.clip(lower=0)
    out = out.merge(sup[["supporter_id", "donor_tenure_days"]], on="supporter_id", how="left")

    return out


def _clean(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    max_recency = out["recency_days"].max(skipna=True)
    out.loc[out["recency_days"].isna(), "recency_days"] = float(max_recency or 0.0)
    out["social_referral_count"] = out["social_referral_count"].fillna(0.0)
    out["donor_tenure_days"] = out["donor_tenure_days"].fillna(0.0)
    out["top_program_interest"] = (
        out["top_program_interest"].fillna("Unknown").astype(str).str.strip()
    )
    out.loc[out["top_program_interest"] == "", "top_program_interest"] = "Unknown"
    for col in ["supporter_type", "relationship_type", "region", "acquisition_channel", "status"]:
        out[col] = out[col].fillna("Unknown").astype(str).str.strip()
        out.loc[out[col] == "", col] = "Unknown"
    return out


def _build_preprocessor() -> ColumnTransformer:
    num_pipe = Pipeline([("imp", SimpleImputer(strategy="median")), ("scl", StandardScaler())])
    cat_pipe = Pipeline([
        ("imp", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer([
        ("num", num_pipe, GROWTH_NUMERIC_FEATURES),
        ("cat", cat_pipe, GROWTH_CATEGORICAL_FEATURES),
    ])


# ── Public API ────────────────────────────────────────────────────────────────

def retrain(data_root: Path, artifact_path: Path) -> dict:
    """
    Re-fit the growth pipeline from scratch and save to artifact_path.

    Returns a dict: {"model": str, "mae": float, "r2": float, "rows": int}
    """
    eng_path = (
        data_root / "Created .csv for Pipelines" / "donor_and_potential_growth.csv"
    )
    raw = pd.read_csv(eng_path)
    raw = _engineer_extra_features(raw, data_root)
    df = _clean(raw)

    X = df[FEATURE_COLUMNS]
    y = df[TARGET]

    cv = KFold(n_splits=5, shuffle=True, random_state=42)
    candidates = {
        "hist_gradient_boosting": HistGradientBoostingRegressor(
            random_state=42, max_depth=4, max_iter=200, learning_rate=0.06, min_samples_leaf=3,
        ),
        "gradient_boosting": GradientBoostingRegressor(
            random_state=42, max_depth=3, n_estimators=120, learning_rate=0.08, subsample=0.9,
        ),
        "random_forest": RandomForestRegressor(
            random_state=42, n_estimators=200, max_depth=5, min_samples_leaf=4,
        ),
        "ridge": Ridge(alpha=5.0),
    }

    best_name, best_mae = None, float("inf")
    for name, reg in candidates.items():
        pipe = Pipeline([("prep", _build_preprocessor()), ("reg", clone(reg))])
        scores = cross_validate(pipe, X, y, cv=cv, scoring="neg_mean_absolute_error")
        mae = float(-scores["test_score"].mean())
        if mae < best_mae:
            best_mae, best_name = mae, name

    pipeline = Pipeline([("prep", _build_preprocessor()), ("reg", clone(candidates[best_name]))])
    pipeline.fit(X, y)

    oof = cross_validate(
        Pipeline([("prep", _build_preprocessor()), ("reg", clone(candidates[best_name]))]),
        X, y, cv=cv, scoring=["neg_mean_absolute_error", "r2"],
    )
    mae_cv = float(-oof["test_neg_mean_absolute_error"].mean())
    r2_cv = float(oof["test_r2"].mean())

    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, artifact_path)

    return {"model": best_name, "mae": round(mae_cv, 4), "r2": round(r2_cv, 4), "rows": len(df)}


# ── CLI entry point ───────────────────────────────────────────────────────────

def _find_repo() -> Path:
    here = Path(__file__).resolve()
    for p in [here, *here.parents]:
        if (p / "Dataset" / "lighthouse_csv_v7").is_dir():
            return p
    raise FileNotFoundError("Could not find Dataset/lighthouse_csv_v7/ from script location.")


if __name__ == "__main__":
    repo = _find_repo()
    data_root = repo / "Dataset" / "lighthouse_csv_v7"
    artifact = repo / "pipelines" / "growth_pipeline_v4.sav"
    metrics = retrain(data_root, artifact)
    print(f"Saved to {artifact}")
    print(f"Model: {metrics['model']} | MAE: {metrics['mae']} | R²: {metrics['r2']} | Rows: {metrics['rows']}")
