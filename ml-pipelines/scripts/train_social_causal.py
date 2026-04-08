"""
Standalone training script for the social media causal boost T-Learner.

Extracts Phase 3–6 logic from social_media_causal_boost.ipynb so the FastAPI
/admin/retrain endpoint can re-fit the pipeline without running the notebook.

Usage (CLI):
    python scripts/train_social_causal.py
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# ── Feature / target constants (must match app/services/social_causal.py) ─────
CAUSAL_NUMERIC_FEATURES = [
    "caption_length",
    "num_hashtags",
    "follower_count_at_post",
    "post_hour",
    "has_call_to_action",
    "boost_budget_php",
]
CAUSAL_CATEGORICAL_FEATURES = [
    "platform",
    "post_type",
    "media_type",
    "content_topic",
    "sentiment_tone",
    "post_dow",
    "call_to_action_type",
]
CAUSAL_FEATURE_COLUMNS = CAUSAL_NUMERIC_FEATURES + CAUSAL_CATEGORICAL_FEATURES
TREATMENT = "is_boosted"
TARGET = "has_referred_gift"


def _build_preprocessor() -> ColumnTransformer:
    num_pipe = Pipeline([
        ("imp", SimpleImputer(strategy="median")),
        ("scl", StandardScaler()),
    ])
    cat_pipe = Pipeline([
        ("imp", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer([
        ("num", num_pipe, CAUSAL_NUMERIC_FEATURES),
        ("cat", cat_pipe, CAUSAL_CATEGORICAL_FEATURES),
    ])


def _clean(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for col in CAUSAL_NUMERIC_FEATURES:
        if col not in out.columns:
            out[col] = 0.0
        out[col] = pd.to_numeric(out[col], errors="coerce").fillna(0.0)
    for col in CAUSAL_CATEGORICAL_FEATURES:
        default = "None" if col == "call_to_action_type" else "Unknown"
        if col not in out.columns:
            out[col] = default
        out[col] = out[col].astype(str).fillna(default).replace("", default)
    out["has_call_to_action"] = out["has_call_to_action"].clip(0, 1).round().astype(int)
    out["boost_budget_php"] = out["boost_budget_php"].clip(lower=0)
    out["post_hour"] = out["post_hour"].clip(0, 23).round().astype(int)
    return out


def _build_outcome_pipeline() -> Pipeline:
    return Pipeline([
        ("prep", _build_preprocessor()),
        ("clf", GradientBoostingClassifier(
            n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42,
        )),
    ])


def _build_propensity_pipeline() -> Pipeline:
    return Pipeline([
        ("prep", _build_preprocessor()),
        ("clf", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)),
    ])


def retrain(data_root: Path, artifact_path: Path) -> dict:
    """
    Re-fit the T-Learner causal boost artifact from scratch and save to artifact_path.

    Artifact saved as a dict:
        {
            "control_pipeline":   Pipeline fit on T==0 rows
            "treatment_pipeline": Pipeline fit on T==1 rows
            "propensity_pipeline": Pipeline fit on all rows
            "ate":       float
            "ate_lower": float
            "ate_upper": float
            "n_control": int
            "n_treated": int
        }

    Returns metrics dict.
    """
    posts = pd.read_csv(data_root / "social_media_posts.csv", low_memory=False)
    posts = _clean(posts)

    required = CAUSAL_FEATURE_COLUMNS + [TREATMENT, TARGET]
    posts = posts.dropna(subset=[TREATMENT, TARGET])
    posts[TREATMENT] = posts[TREATMENT].astype(int)
    posts[TARGET] = posts[TARGET].astype(int)

    X = posts[CAUSAL_FEATURE_COLUMNS]
    T = posts[TREATMENT]
    Y = posts[TARGET]

    control_mask = T == 0
    treatment_mask = T == 1

    # T-Learner: separate outcome models per arm
    control_pipeline = _build_outcome_pipeline()
    control_pipeline.fit(X[control_mask], Y[control_mask])

    treatment_pipeline = _build_outcome_pipeline()
    treatment_pipeline.fit(X[treatment_mask], Y[treatment_mask])

    # Propensity model on full data
    propensity_pipeline = _build_propensity_pipeline()
    propensity_pipeline.fit(X, T)

    # Estimate ATE via bootstrap (n=200) for CI
    p1 = treatment_pipeline.predict_proba(X)[:, 1]
    p0 = control_pipeline.predict_proba(X)[:, 1]
    ite_all = p1 - p0
    ate = float(np.mean(ite_all))

    rng = np.random.default_rng(42)
    bootstrap_ates = []
    n = len(ite_all)
    for _ in range(200):
        idx = rng.integers(0, n, size=n)
        bootstrap_ates.append(float(np.mean(ite_all[idx])))
    ate_lower = float(np.percentile(bootstrap_ates, 2.5))
    ate_upper = float(np.percentile(bootstrap_ates, 97.5))

    artifact = {
        "control_pipeline": control_pipeline,
        "treatment_pipeline": treatment_pipeline,
        "propensity_pipeline": propensity_pipeline,
        "ate": ate,
        "ate_lower": ate_lower,
        "ate_upper": ate_upper,
        "n_control": int(control_mask.sum()),
        "n_treated": int(treatment_mask.sum()),
    }

    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, artifact_path)

    return {
        "ate": round(ate, 4),
        "ate_lower": round(ate_lower, 4),
        "ate_upper": round(ate_upper, 4),
        "n_control": artifact["n_control"],
        "n_treated": artifact["n_treated"],
        "rows": len(posts),
    }


def _find_repo() -> Path:
    here = Path(__file__).resolve()
    for p in [here, *here.parents]:
        if (p / "Dataset" / "lighthouse_csv_v7").is_dir():
            return p
    raise FileNotFoundError("Could not find Dataset/lighthouse_csv_v7/ from script location.")


if __name__ == "__main__":
    repo = _find_repo()
    data_root = repo / "Dataset" / "lighthouse_csv_v7"
    artifact = repo / "pipelines" / "social_causal_boost_pipeline_v1.sav"
    metrics = retrain(data_root, artifact)
    print(f"Saved to {artifact}")
    print(
        f"ATE: {metrics['ate']} [{metrics['ate_lower']}, {metrics['ate_upper']}] "
        f"| Control: {metrics['n_control']} | Treated: {metrics['n_treated']} | Rows: {metrics['rows']}"
    )
