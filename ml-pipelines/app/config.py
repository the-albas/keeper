"""Project paths and environment-driven settings (no extra deps)."""

from __future__ import annotations

import os
from pathlib import Path

# Repository root (parent of the `app` package)
BASE_DIR = Path(__file__).resolve().parent.parent

PIPELINES_DIR = BASE_DIR / "pipelines"
DEFAULT_RETENTION_ARTIFACT = PIPELINES_DIR / "retention_pipeline_v3.sav"
DEFAULT_GROWTH_ARTIFACT = PIPELINES_DIR / "growth_pipeline_v4.sav"
DEFAULT_SOCIAL_ENGAGEMENT_ARTIFACT = PIPELINES_DIR / "social_engagement_pipeline_v2.sav"
DEFAULT_GIRLS_PROGRESS_ARTIFACT = PIPELINES_DIR / "girls_progress_pipeline_v2.sav"
DEFAULT_GIRLS_EDUCATION_TRAJECTORY_ARTIFACT = (
    PIPELINES_DIR / "girls_education_trajectory_pipeline_v1.sav"
)


def retention_pipeline_path() -> Path:
    """Absolute path to the joblib artifact; override with RETENTION_PIPELINE_PATH."""
    env = os.environ.get("RETENTION_PIPELINE_PATH")
    if env:
        return Path(env).expanduser().resolve()
    return DEFAULT_RETENTION_ARTIFACT.resolve()


def growth_pipeline_path() -> Path:
    """Absolute path to growth regression joblib artifact."""
    env = os.environ.get("GROWTH_PIPELINE_PATH")
    if env:
        return Path(env).expanduser().resolve()
    return DEFAULT_GROWTH_ARTIFACT.resolve()


def social_engagement_pipeline_path() -> Path:
    """Absolute path to social engagement-rate regression joblib artifact."""
    env = os.environ.get("SOCIAL_ENGAGEMENT_PIPELINE_PATH")
    if env:
        return Path(env).expanduser().resolve()
    return DEFAULT_SOCIAL_ENGAGEMENT_ARTIFACT.resolve()


def girls_progress_pipeline_path() -> Path:
    """Absolute path to girls education progress regression joblib artifact."""
    env = os.environ.get("GIRLS_PROGRESS_PIPELINE_PATH")
    if env:
        return Path(env).expanduser().resolve()
    return DEFAULT_GIRLS_PROGRESS_ARTIFACT.resolve()


def girls_education_trajectory_pipeline_path() -> Path:
    """Artifact from girls_education_trajectory.ipynb Phase 6 (dict with pipeline + at_risk_threshold)."""
    env = os.environ.get("GIRLS_EDUCATION_TRAJECTORY_PIPELINE_PATH")
    if env:
        return Path(env).expanduser().resolve()
    return DEFAULT_GIRLS_EDUCATION_TRAJECTORY_ARTIFACT.resolve()


def max_recency_fallback() -> float:
    return float(os.environ.get("RETENTION_MAX_RECENCY_FALLBACK", "999"))
