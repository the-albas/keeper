"""
Standalone training script for the social media engagement regression model.

Extracts Phase 3–6 logic from social_media_engagement_increase.ipynb so the
FastAPI /admin/retrain endpoint can re-fit the pipeline without running the notebook.

Usage (CLI):
    python scripts/train_social_engagement.py
"""

from __future__ import annotations

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

# ── Feature / target constants (must match app/services/social_engagement.py) ─
SOCIAL_NUMERIC_FEATURES = [
    "caption_length",
    "num_hashtags",
    "boost_budget_php",
    "follower_count_at_post",
    "post_hour",
    "has_call_to_action",
    "is_boosted",
]
SOCIAL_CATEGORICAL_FEATURES = [
    "platform",
    "post_type",
    "media_type",
    "content_topic",
    "sentiment_tone",
    "post_dow",
    "call_to_action_type",
]
TARGET = "engagement_rate"
FEATURE_COLUMNS = SOCIAL_NUMERIC_FEATURES + SOCIAL_CATEGORICAL_FEATURES


def _load_and_clean(data_root: Path) -> pd.DataFrame:
    posts = pd.read_csv(data_root / "social_media_posts.csv", low_memory=False)

    posts["created_at"] = pd.to_datetime(posts["created_at"], errors="coerce")
    posts["post_hour"] = posts["created_at"].dt.hour.fillna(0).astype(int)
    posts["post_dow"] = posts["created_at"].dt.day_name().astype("string").fillna("Unknown")

    for col in SOCIAL_CATEGORICAL_FEATURES:
        if col in posts.columns:
            posts[col] = posts[col].astype("string").fillna("Unknown").replace("", "Unknown")
        else:
            posts[col] = "Unknown"

    for col in SOCIAL_NUMERIC_FEATURES:
        if col in posts.columns:
            posts[col] = pd.to_numeric(posts[col], errors="coerce").fillna(0.0)
        else:
            posts[col] = 0.0

    for col in ("has_call_to_action", "is_boosted"):
        posts[col] = posts[col].clip(0, 1).round().astype(int)
    posts["post_hour"] = posts["post_hour"].clip(0, 23).astype(int)

    posts["engagement_rate"] = pd.to_numeric(posts.get("engagement_rate"), errors="coerce")
    return posts.dropna(subset=[TARGET]).copy()


def _build_preprocessor() -> ColumnTransformer:
    num_pipe = Pipeline([("imp", SimpleImputer(strategy="median")), ("scl", StandardScaler())])
    cat_pipe = Pipeline([
        ("imp", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer([
        ("num", num_pipe, SOCIAL_NUMERIC_FEATURES),
        ("cat", cat_pipe, SOCIAL_CATEGORICAL_FEATURES),
    ])


def retrain(data_root: Path, artifact_path: Path) -> dict:
    """
    Re-fit the social engagement pipeline from scratch and save to artifact_path.

    Returns a dict: {"model": str, "mae": float, "r2": float, "rows": int}
    """
    df = _load_and_clean(data_root)
    X = df[FEATURE_COLUMNS]
    y = df[TARGET]

    cv = KFold(n_splits=5, shuffle=True, random_state=42)
    candidates = {
        "hist_gradient_boosting": HistGradientBoostingRegressor(
            random_state=42, max_depth=4, max_iter=150, learning_rate=0.06,
            min_samples_leaf=5, l2_regularization=0.1,
        ),
        "gradient_boosting": GradientBoostingRegressor(
            random_state=42, max_depth=3, n_estimators=80, learning_rate=0.08,
            subsample=0.8, min_samples_leaf=5,
        ),
        "random_forest": RandomForestRegressor(
            random_state=42, n_estimators=200, max_depth=6, min_samples_leaf=5,
        ),
        "ridge": Ridge(alpha=1.0),
    }

    best_name, best_mae = None, float("inf")
    cv_scores_by_name = {}
    for name, reg in candidates.items():
        pipe = Pipeline([("prep", _build_preprocessor()), ("reg", clone(reg))])
        scores = cross_validate(
            pipe, X, y, cv=cv,
            scoring=["neg_mean_absolute_error", "r2"],
        )
        cv_scores_by_name[name] = scores
        mae = float(-scores["test_neg_mean_absolute_error"].mean())
        if mae < best_mae:
            best_mae, best_name = mae, name

    pipeline = Pipeline([("prep", _build_preprocessor()), ("reg", clone(candidates[best_name]))])
    pipeline.fit(X, y)

    best = cv_scores_by_name[best_name]
    mae_cv = float(-best["test_neg_mean_absolute_error"].mean())
    r2_cv = float(best["test_r2"].mean())

    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, artifact_path)

    return {"model": best_name, "mae": round(mae_cv, 6), "r2": round(r2_cv, 4), "rows": len(df)}


def _find_repo() -> Path:
    here = Path(__file__).resolve()
    for p in [here, *here.parents]:
        if (p / "Dataset" / "lighthouse_csv_v7").is_dir():
            return p
    raise FileNotFoundError("Could not find Dataset/lighthouse_csv_v7/ from script location.")


if __name__ == "__main__":
    repo = _find_repo()
    data_root = repo / "Dataset" / "lighthouse_csv_v7"
    artifact = repo / "pipelines" / "social_engagement_pipeline_v2.sav"
    metrics = retrain(data_root, artifact)
    print(f"Saved to {artifact}")
    print(f"Model: {metrics['model']} | MAE: {metrics['mae']} | R²: {metrics['r2']} | Rows: {metrics['rows']}")
