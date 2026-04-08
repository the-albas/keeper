"""Load retention sklearn Pipeline and build feature rows matching notebook Phase 3."""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd

from app.config import max_recency_fallback, retention_pipeline_path

NUMERIC_FEATURES = [
    "recency_days",
    "frequency",
    "avg_monetary_value",       # total_monetary_value dropped (≈ freq × avg, redundant)
    "social_referral_count",
    "is_recurring_donor",
]
CATEGORICAL_FEATURES = ["top_program_interest"]
FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def load_retention_pipeline(path: Path | None = None):
    p = path or retention_pipeline_path()
    if not p.is_file():
        raise FileNotFoundError(
            f"Retention pipeline not found at {p}. "
            "Run donor_retention.ipynb Phase 6 or set RETENTION_PIPELINE_PATH."
        )
    return joblib.load(p)


def clean_engineered_row(row: dict, *, recency_fallback: float | None = None) -> pd.DataFrame:
    """
    Mirror notebook cleaning for one engineered supporter row.
    NaN recency uses recency_fallback (default from config / env).
    """
    fallback = recency_fallback if recency_fallback is not None else max_recency_fallback()

    df = pd.DataFrame([dict(row)])
    out = df.copy()

    if out["recency_days"].isna().any():
        out.loc[out["recency_days"].isna(), "recency_days"] = float(fallback)

    out["frequency"] = out["frequency"].fillna(0.0)
    zero_gift = out["frequency"] == 0
    out.loc[out["avg_monetary_value"].isna() & zero_gift, "avg_monetary_value"] = 0.0
    med_avg = out["avg_monetary_value"].median(skipna=True)
    if pd.isna(med_avg):
        med_avg = 0.0
    out["avg_monetary_value"] = out["avg_monetary_value"].fillna(med_avg)

    out["social_referral_count"] = out["social_referral_count"].fillna(0.0)
    out["is_recurring_donor"] = out["is_recurring_donor"].fillna(0).astype(int)

    out["top_program_interest"] = (
        out["top_program_interest"].fillna("Unknown").astype(str).str.strip()
    )
    out.loc[out["top_program_interest"] == "", "top_program_interest"] = "Unknown"

    return out[FEATURE_COLUMNS]


def predict_retention(pipeline, row: dict) -> tuple[int, list[float]]:
    X = clean_engineered_row(row)
    pred = int(pipeline.predict(X)[0])
    proba = pipeline.predict_proba(X)[0].tolist()
    return pred, proba
