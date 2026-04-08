"""
Standalone training script for the donor retention classifier.

Extracts Phase 3–6 logic from donor_retention.ipynb so the FastAPI /admin/retrain
endpoint can re-fit the pipeline without running the notebook.

Usage (CLI):
    python scripts/train_retention.py
"""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVC

# ── Feature / target constants (must match app/services/retention.py) ─────────
NUMERIC_FEATURES = [
    # recency_days removed: is_retained = (recency_days <= 365) by definition,
    # so including it is perfect target leakage and explains the near-perfect CV scores.
    "frequency",
    "avg_monetary_value",
    "social_referral_count",
    "is_recurring_donor",
]
CATEGORICAL_FEATURES = ["top_program_interest"]
TARGET = "is_retained"
FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def _clean(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    zero_gift = out["frequency"].fillna(0) == 0
    out.loc[out["avg_monetary_value"].isna() & zero_gift, "avg_monetary_value"] = 0.0
    med_avg = out["avg_monetary_value"].median(skipna=True)
    out["avg_monetary_value"] = out["avg_monetary_value"].fillna(float(med_avg or 0.0))
    out["social_referral_count"] = out["social_referral_count"].fillna(0.0)
    out["top_program_interest"] = (
        out["top_program_interest"].fillna("Unknown").astype(str).str.strip()
    )
    out.loc[out["top_program_interest"] == "", "top_program_interest"] = "Unknown"
    return out


def _build_preprocessor() -> ColumnTransformer:
    num_pipe = Pipeline([("imp", SimpleImputer(strategy="median")), ("scl", StandardScaler())])
    cat_pipe = Pipeline([
        ("imp", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer([
        ("num", num_pipe, NUMERIC_FEATURES),
        ("cat", cat_pipe, CATEGORICAL_FEATURES),
    ])


def retrain(data_root: Path, artifact_path: Path) -> dict:
    """
    Re-fit the retention pipeline from scratch and save to artifact_path.

    Returns a dict: {"model": str, "f1_macro": float, "roc_auc": float, "rows": int}
    """
    eng_path = (
        data_root / "Created .csv for Pipelines" / "donor_and_potential_growth.csv"
    )
    df = _clean(pd.read_csv(eng_path))
    X = df[FEATURE_COLUMNS]
    y = df[TARGET]

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    candidates = {
        "hist_gradient_boosting": HistGradientBoostingClassifier(
            max_depth=4, max_iter=150, learning_rate=0.08, class_weight="balanced", random_state=42,
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=150, max_depth=6, min_samples_leaf=2, class_weight="balanced", random_state=42,
        ),
        "logistic_regression": LogisticRegression(
            max_iter=2000, class_weight="balanced", random_state=42,
        ),
        "svc_rbf": SVC(
            kernel="rbf", class_weight="balanced", probability=True, random_state=42,
        ),
    }

    best_name, best_f1 = None, -1.0
    cv_scores_by_name = {}
    for name, clf in candidates.items():
        pipe = Pipeline([("prep", _build_preprocessor()), ("clf", clone(clf))])
        scores = cross_validate(
            pipe, X, y, cv=cv,
            scoring={"f1_macro": "f1_macro", "roc_auc": "roc_auc"},
        )
        cv_scores_by_name[name] = scores
        f1 = float(scores["test_f1_macro"].mean())
        if f1 > best_f1:
            best_f1, best_name = f1, name

    pipeline = Pipeline([("prep", _build_preprocessor()), ("clf", clone(candidates[best_name]))])
    pipeline.fit(X, y)

    best_scores = cv_scores_by_name[best_name]
    f1_cv = float(best_scores["test_f1_macro"].mean())
    roc_cv = float(best_scores["test_roc_auc"].mean())

    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, artifact_path)

    return {"model": best_name, "f1_macro": round(f1_cv, 4), "roc_auc": round(roc_cv, 4), "rows": len(df)}


def _find_repo() -> Path:
    here = Path(__file__).resolve()
    for p in [here, *here.parents]:
        if (p / "Dataset" / "lighthouse_csv_v7").is_dir():
            return p
    raise FileNotFoundError("Could not find Dataset/lighthouse_csv_v7/ from script location.")


if __name__ == "__main__":
    repo = _find_repo()
    data_root = repo / "Dataset" / "lighthouse_csv_v7"
    artifact = repo / "pipelines" / "retention_pipeline_v3.sav"
    metrics = retrain(data_root, artifact)
    print(f"Saved to {artifact}")
    print(f"Model: {metrics['model']} | F1 macro: {metrics['f1_macro']} | ROC-AUC: {metrics['roc_auc']} | Rows: {metrics['rows']}")
