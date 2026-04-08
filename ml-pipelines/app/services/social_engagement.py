"""Load social engagement regression Pipeline; row shape matches social_media_engagement_increase.ipynb Phase 3 (pre-post features only)."""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd

from app.config import social_engagement_pipeline_path

# Must match FEATURES_ENGAGEMENT_MODEL in social_media_engagement_increase.ipynb
# (not FEATURES_REFERRAL_MODEL — no impressions/likes/reach; those would leak the target.)
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
SOCIAL_FEATURE_COLUMNS = SOCIAL_NUMERIC_FEATURES + SOCIAL_CATEGORICAL_FEATURES


def load_social_engagement_pipeline(path: Path | None = None):
    p = path or social_engagement_pipeline_path()
    if not p.is_file():
        raise FileNotFoundError(
            f"Social engagement pipeline not found at {p}. "
            "Run social_media_engagement_increase.ipynb Phase 6 or set SOCIAL_ENGAGEMENT_PIPELINE_PATH."
        )
    return joblib.load(p)


def clean_social_engagement_row(row: dict) -> pd.DataFrame:
    """Align single-row inference with notebook Phase 3 defaults (0 / Unknown)."""
    df = pd.DataFrame([dict(row)])
    out = df.copy()

    for col in SOCIAL_NUMERIC_FEATURES:
        if col not in out.columns:
            out[col] = 0.0
        out[col] = pd.to_numeric(out[col], errors="coerce").fillna(0.0)

    for col in SOCIAL_CATEGORICAL_FEATURES:
        if col not in out.columns:
            out[col] = "Unknown"
        out[col] = out[col].astype("string").fillna("Unknown").replace("", "Unknown")

    for col in ("has_call_to_action", "is_boosted"):
        out[col] = out[col].clip(0, 1).round().astype(int)

    out["post_hour"] = out["post_hour"].clip(0, 23).round().astype(int)

    return out[SOCIAL_FEATURE_COLUMNS]


def predict_social_engagement(pipeline, row: dict) -> float:
    X = clean_social_engagement_row(row)
    return float(pipeline.predict(X)[0])
