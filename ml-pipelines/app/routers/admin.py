"""
Admin router — model retraining endpoint.

POST /admin/retrain/{model}

Runs the matching training script inline (N≈60 rows, completes in ~1–2 s),
overwrites the .sav artifact, and hot-reloads app.state — no service restart needed.

Auth: FastAPI is internal-only. All external callers must go through ASP.NET
      (POST /api/ml/retrain/{model}), which enforces the Admin JWT role.
"""

from __future__ import annotations

import threading
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from app.config import (
    girls_education_trajectory_pipeline_path,
    girls_progress_pipeline_path,
    growth_pipeline_path,
    retention_pipeline_path,
    social_engagement_pipeline_path,
)
from app.services.girls_progress import load_girls_progress_pipeline
from app.services.girls_trajectory import load_girls_trajectory_artifact
from app.services.growth import load_growth_pipeline
from app.services.retention import load_retention_pipeline
from app.services.social_engagement import load_social_engagement_pipeline

router = APIRouter(prefix="/admin", tags=["admin"])

# Supported models and their wiring
_MODEL_CONFIG: dict[str, dict] = {
    "growth": {
        "script": "scripts.train_growth",
        "artifact_fn": growth_pipeline_path,
        "load_fn": load_growth_pipeline,
        "state_key": "growth_pipeline",
    },
    "retention": {
        "script": "scripts.train_retention",
        "artifact_fn": retention_pipeline_path,
        "load_fn": load_retention_pipeline,
        "state_key": "retention_pipeline",
    },
    "social_engagement": {
        "script": "scripts.train_social_engagement",
        "artifact_fn": social_engagement_pipeline_path,
        "load_fn": load_social_engagement_pipeline,
        "state_key": "social_engagement_pipeline",
    },
    "girls_progress": {
        "script": "scripts.train_girls_progress",
        "artifact_fn": girls_progress_pipeline_path,
        "load_fn": load_girls_progress_pipeline,
        "state_key": "girls_progress_pipeline",
    },
    "girls_trajectory": {
        "script": "scripts.train_girls_trajectory",
        "artifact_fn": girls_education_trajectory_pipeline_path,
        "load_fn": load_girls_trajectory_artifact,
        "state_key": "girls_trajectory_artifact",
    },
}

_SUPPORTED = sorted(_MODEL_CONFIG.keys())


def _find_data_root() -> Path:
    """Locate Dataset/lighthouse_csv_v7/ from the ml-pipelines root."""
    here = Path(__file__).resolve()
    for p in [here, *here.parents]:
        candidate = p / "Dataset" / "lighthouse_csv_v7"
        if candidate.is_dir():
            return candidate
    raise FileNotFoundError(
        "Could not locate Dataset/lighthouse_csv_v7/. "
        "Ensure the data directory is present relative to the ml-pipelines root."
    )


@router.post("/retrain/{model}")
def retrain_model(model: str, request: Request):
    """
    Re-train the specified model pipeline and hot-reload it into memory.

    - Returns 404 for unknown model names.
    - Returns 409 if a retrain is already in progress.
    - Returns 200 with metrics on success.
    """
    if model not in _MODEL_CONFIG:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown model '{model}'. Supported: {_SUPPORTED}",
        )

    lock: threading.Lock = getattr(request.app.state, "retraining_lock", None)
    if lock is None:
        raise HTTPException(status_code=503, detail="Retraining lock not initialised. Restart the service.")

    acquired = lock.acquire(blocking=False)
    if not acquired:
        raise HTTPException(status_code=409, detail="A retrain is already in progress. Try again shortly.")

    try:
        cfg = _MODEL_CONFIG[model]

        # Dynamically import the training script module
        import importlib
        train_module = importlib.import_module(cfg["script"])

        data_root = _find_data_root()
        artifact_path: Path = cfg["artifact_fn"]()

        metrics = train_module.retrain(data_root, artifact_path)

        # Hot-reload into app.state
        new_pipeline = cfg["load_fn"](artifact_path)
        setattr(request.app.state, cfg["state_key"], new_pipeline)

        return {
            "status": "ok",
            "model": model,
            "artifact": str(artifact_path),
            "metrics": metrics,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Retrain failed: {exc}") from exc
    finally:
        lock.release()


@router.get("/models")
def list_models():
    """List all models that support retraining via this endpoint."""
    return {"supported_models": _SUPPORTED}
