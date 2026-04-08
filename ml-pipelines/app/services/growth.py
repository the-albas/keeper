"""Load growth regression Pipeline and build feature rows (matches donor_growth notebook Phase 3)."""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd

from app.config import growth_pipeline_path, max_recency_fallback

# Must match GROWTH_* columns in donor_growth.ipynb — never include total_monetary_value as input.
# avg_monetary_value is intentionally excluded: it equals total_monetary_value / frequency exactly,
# which allows the model to reconstruct the target from its own components (data leakage).
GROWTH_NUMERIC_FEATURES = [
    "recency_days",
    "frequency",
    "social_referral_count",
    "is_recurring_donor",
    "donor_tenure_days",
    # gift_volatility and donation_type_diversity removed: computed from the same donations
    # as total_monetary_value (the target) — circular features that inflate R².
    # avg_monetary_value also excluded (= target / frequency exactly).
]
GROWTH_CATEGORICAL_FEATURES = [
    "top_program_interest",
    "supporter_type",
    "relationship_type",
    "region",
    "acquisition_channel",
    "status",
]
GROWTH_FEATURE_COLUMNS = GROWTH_NUMERIC_FEATURES + GROWTH_CATEGORICAL_FEATURES


def load_growth_pipeline(path: Path | None = None):
    p = path or growth_pipeline_path()
    if not p.is_file():
        raise FileNotFoundError(
            f"Growth pipeline not found at {p}. "
            "Run donor_growth.ipynb Phase 6 or set GROWTH_PIPELINE_PATH."
        )
    return joblib.load(p)


def clean_growth_row(row: dict, *, recency_fallback: float | None = None) -> pd.DataFrame:
    """Same cleaning rules as the growth notebook for a single API row."""
    fallback = recency_fallback if recency_fallback is not None else max_recency_fallback()

    df = pd.DataFrame([dict(row)])
    out = df.copy()

    if out["recency_days"].isna().any():
        out.loc[out["recency_days"].isna(), "recency_days"] = float(fallback)

    out["frequency"] = out["frequency"].fillna(0.0)
    out["social_referral_count"] = out["social_referral_count"].fillna(0.0)
    out["is_recurring_donor"] = out["is_recurring_donor"].fillna(0).astype(int)
    out["donor_tenure_days"] = out["donor_tenure_days"].fillna(0.0)

    out["top_program_interest"] = (
        out["top_program_interest"].fillna("Unknown").astype(str).str.strip()
    )
    out.loc[out["top_program_interest"] == "", "top_program_interest"] = "Unknown"

    for col in ["supporter_type", "relationship_type", "region", "acquisition_channel", "status"]:
        out[col] = out[col].fillna("Unknown").astype(str).str.strip()
        out.loc[out[col] == "", col] = "Unknown"

    return out[GROWTH_FEATURE_COLUMNS]


def predict_growth(pipeline, row: dict) -> float:
    X = clean_growth_row(row)
    return float(pipeline.predict(X)[0])
