"""
Standalone training script for the girls education trajectory regression model.

Extracts Phase 3–6 logic from girls_education_trajectory.ipynb so the FastAPI
/admin/retrain endpoint can re-fit the pipeline without running the notebook.

Usage (CLI):
    python scripts/train_girls_trajectory.py
"""

from __future__ import annotations

import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import make_scorer, mean_absolute_error, r2_score
from sklearn.model_selection import GroupKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# ── Feature / target constants (must match app/services/girls_trajectory.py) ─
TRAJ_NUMERIC_FEATURES = [
    "current_progress",
    "days_since_admission",
    "days_to_next_record",
    "present_age_years",
    "age_upon_admission_years",
    "has_special_needs",
    "family_parent_pwd",
    "hw_mean_nutrition_score",
    "hw_mean_energy_level_score",
    "hw_mean_sleep_quality_score",
    "hw_mean_general_health_score",
    "hw_mean_bmi",
    "hw_rate_psychological_checkup_done",
    "n_incidents",
    "incident_high_rate",
    "incident_unresolved_rate",
    "n_home_visitations",
    "safety_concern_rate",
    "followup_needed_rate",
    "n_process_sessions",
    "concerns_flagged_rate",
    "referral_made_rate",
    "n_intervention_plans",
    "occupancy_ratio",
]
TRAJ_CATEGORICAL_FEATURES = [
    "case_status",
    "case_category",
    "initial_risk_level",
    "current_risk_level",
    "referral_source",
    "reintegration_status",
    "edu_education_level",
    "region",
    "province",
]
TARGET = "next_progress"

RESIDENT_DROP = ["notes_restricted", "initial_case_assessment", "referring_agency_person"]


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


def _build_frame(data_root: Path) -> tuple[pd.DataFrame, np.ndarray]:
    """Returns (frame, groups) where groups is the resident_id array for GroupKFold."""
    res = pd.read_csv(data_root / "residents.csv")
    edu = pd.read_csv(data_root / "education_records.csv")
    hw = pd.read_csv(data_root / "health_wellbeing_records.csv")
    plans = pd.read_csv(data_root / "intervention_plans.csv")
    visits = pd.read_csv(data_root / "home_visitations.csv")
    incidents = pd.read_csv(data_root / "incident_reports.csv")
    proc = pd.read_csv(data_root / "process_recordings.csv")
    safehouses = pd.read_csv(data_root / "safehouses.csv")

    # Consecutive education-record pairs
    edu2 = edu.copy()
    edu2["record_date"] = pd.to_datetime(edu2["record_date"], errors="coerce")
    edu2["progress_percent"] = pd.to_numeric(edu2["progress_percent"], errors="coerce")
    edu2 = edu2.dropna(subset=["record_date", "progress_percent"])
    edu2 = edu2.sort_values(["resident_id", "record_date", "education_record_id"]).reset_index(drop=True)

    pair_rows = []
    for rid, grp in edu2.groupby("resident_id", sort=False):
        grp = grp.sort_values("record_date").reset_index(drop=True)
        for i in range(len(grp) - 1):
            pair_rows.append({
                "resident_id": rid,
                "record_date": grp.loc[i, "record_date"],
                "current_progress": grp.loc[i, "progress_percent"],
                "edu_education_level": grp.loc[i, "education_level"],
                TARGET: grp.loc[i + 1, "progress_percent"],
                "days_to_next_record": (grp.loc[i + 1, "record_date"] - grp.loc[i, "record_date"]).days,
            })
    frame = pd.DataFrame(pair_rows)

    # Static resident features
    res2 = res.drop(columns=[c for c in RESIDENT_DROP if c in res.columns], errors="ignore").copy()
    res2["present_age_years"] = res2["present_age"].map(_parse_years_months)
    res2["age_upon_admission_years"] = res2["age_upon_admission"].map(_parse_years_months)
    res2["date_of_admission"] = pd.to_datetime(res2["date_of_admission"], errors="coerce")

    static_cols = [c for c in [
        "resident_id", "date_of_admission", "present_age_years", "age_upon_admission_years",
        "has_special_needs", "family_parent_pwd", "case_status", "case_category",
        "initial_risk_level", "current_risk_level", "referral_source", "reintegration_status", "safehouse_id",
    ] if c in res2.columns]
    frame = frame.merge(res2[static_cols], on="resident_id", how="left")
    frame["days_since_admission"] = (
        frame["record_date"] - frame["date_of_admission"]
    ).dt.days.clip(lower=0)

    # Temporally windowed health aggregates
    hw2 = hw.copy()
    hw2["hw_date"] = pd.to_datetime(hw2["record_date"], errors="coerce")
    hw_num = [c for c in ["general_health_score", "nutrition_score", "sleep_quality_score", "energy_level_score", "bmi"] if c in hw2.columns]
    hw_bool = [c for c in ["medical_checkup_done", "dental_checkup_done", "psychological_checkup_done"] if c in hw2.columns]
    hw_cross = (
        frame[["resident_id", "record_date"]]
        .merge(hw2[["resident_id", "hw_date"] + hw_num + hw_bool], on="resident_id", how="left")
    )
    hw_cross = hw_cross[hw_cross["hw_date"] <= hw_cross["record_date"]]
    hw_agg_num = hw_cross.groupby(["resident_id", "record_date"])[hw_num].mean().rename(columns={c: f"hw_mean_{c}" for c in hw_num})
    hw_agg_bool = hw_cross.groupby(["resident_id", "record_date"])[hw_bool].mean().rename(columns={c: f"hw_rate_{c}" for c in hw_bool})
    frame = frame.merge(hw_agg_num.reset_index(), on=["resident_id", "record_date"], how="left")
    frame = frame.merge(hw_agg_bool.reset_index(), on=["resident_id", "record_date"], how="left")

    # Temporally windowed incident aggregates
    inc2 = incidents.copy()
    inc2["inc_date"] = pd.to_datetime(inc2["incident_date"], errors="coerce")
    inc2["is_high_sev"] = inc2["severity"].astype(str).str.lower().isin(["high", "critical", "severe"]).astype(int)
    inc2["is_unresolved"] = (~inc2["resolved"].fillna(False).astype(bool)).astype(int)
    inc_cross = frame[["resident_id", "record_date"]].merge(
        inc2[["resident_id", "inc_date", "is_high_sev", "is_unresolved"]], on="resident_id", how="left"
    )
    inc_cross = inc_cross[inc_cross["inc_date"] <= inc_cross["record_date"]]
    inc_agg = inc_cross.groupby(["resident_id", "record_date"]).agg(
        n_incidents=("is_high_sev", "count"), incident_high_rate=("is_high_sev", "mean"), incident_unresolved_rate=("is_unresolved", "mean"),
    )
    frame = frame.merge(inc_agg.reset_index(), on=["resident_id", "record_date"], how="left")
    for col in ["n_incidents", "incident_high_rate", "incident_unresolved_rate"]:
        frame[col] = frame[col].fillna(0.0)

    # Temporally windowed visit aggregates
    vis2 = visits.copy()
    vis2["vis_date"] = pd.to_datetime(vis2["visit_date"], errors="coerce")
    vis2["safety_concern"] = vis2["safety_concerns_noted"].fillna(False).astype(bool).astype(int)
    vis2["followup"] = vis2["follow_up_needed"].fillna(False).astype(bool).astype(int)
    vis_cross = frame[["resident_id", "record_date"]].merge(
        vis2[["resident_id", "vis_date", "safety_concern", "followup"]], on="resident_id", how="left"
    )
    vis_cross = vis_cross[vis_cross["vis_date"] <= vis_cross["record_date"]]
    vis_agg = vis_cross.groupby(["resident_id", "record_date"]).agg(
        n_home_visitations=("safety_concern", "count"), safety_concern_rate=("safety_concern", "mean"), followup_needed_rate=("followup", "mean"),
    )
    frame = frame.merge(vis_agg.reset_index(), on=["resident_id", "record_date"], how="left")
    for col in ["n_home_visitations", "safety_concern_rate", "followup_needed_rate"]:
        frame[col] = frame[col].fillna(0.0)

    # Process sessions
    proc2 = proc.copy()
    proc2["proc_date"] = pd.to_datetime(proc2["session_date"], errors="coerce")
    proc2["concern"] = proc2["concerns_flagged"].fillna(False).astype(bool).astype(int)
    proc2["referral"] = proc2["referral_made"].fillna(False).astype(bool).astype(int)
    proc_cross = frame[["resident_id", "record_date"]].merge(
        proc2[["resident_id", "proc_date", "concern", "referral"]], on="resident_id", how="left"
    )
    proc_cross = proc_cross[proc_cross["proc_date"] <= proc_cross["record_date"]]
    proc_agg = proc_cross.groupby(["resident_id", "record_date"]).agg(
        n_process_sessions=("concern", "count"), concerns_flagged_rate=("concern", "mean"), referral_made_rate=("referral", "mean"),
    )
    frame = frame.merge(proc_agg.reset_index(), on=["resident_id", "record_date"], how="left")
    for col in ["n_process_sessions", "concerns_flagged_rate", "referral_made_rate"]:
        frame[col] = frame[col].fillna(0.0)

    # Intervention plans (windowed)
    plans2 = plans.copy()
    plans2["plan_date"] = pd.to_datetime(plans2["updated_at"], errors="coerce")
    plan_cross = frame[["resident_id", "record_date"]].merge(
        plans2[["resident_id", "plan_date"]], on="resident_id", how="left"
    )
    plan_cross = plan_cross[plan_cross["plan_date"] <= plan_cross["record_date"]]
    plan_agg = plan_cross.groupby(["resident_id", "record_date"]).size().reset_index(name="n_intervention_plans")
    frame = frame.merge(plan_agg, on=["resident_id", "record_date"], how="left")
    frame["n_intervention_plans"] = frame["n_intervention_plans"].fillna(0)

    # Safehouse context
    safe_keep = [c for c in ["safehouse_id", "region", "province", "capacity_girls", "current_occupancy"] if c in safehouses.columns]
    frame = frame.merge(safehouses[safe_keep], on="safehouse_id", how="left", suffixes=("", "_sh"))
    if "capacity_girls" in frame.columns and "current_occupancy" in frame.columns:
        frame["occupancy_ratio"] = frame["current_occupancy"] / frame["capacity_girls"].replace(0, np.nan)
    else:
        frame["occupancy_ratio"] = 0.0

    # Clean categoricals
    for c in TRAJ_CATEGORICAL_FEATURES:
        if c in frame.columns:
            frame[c] = frame[c].fillna("Unknown").astype(str).str.strip()
            frame.loc[frame[c] == "", c] = "Unknown"
            frame.loc[frame[c].str.lower() == "nan", c] = "Unknown"
        else:
            frame[c] = "Unknown"

    groups = frame["resident_id"].values
    return frame, groups


def _build_preprocessor(num_feats: list, cat_feats: list) -> ColumnTransformer:
    num_pipe = Pipeline([("imp", SimpleImputer(strategy="median")), ("scl", StandardScaler())])
    cat_pipe = Pipeline([
        ("imp", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer([("num", num_pipe, num_feats), ("cat", cat_pipe, cat_feats)])


def retrain(data_root: Path, artifact_path: Path) -> dict:
    """
    Re-fit the girls trajectory pipeline from scratch and save to artifact_path.
    Saves a dict {"pipeline": ..., "at_risk_threshold": float} to match the service loader.

    Returns a dict: {"model": str, "mae": float, "r2": float, "at_risk_threshold": float, "rows": int}
    """
    frame, groups = _build_frame(data_root)

    num_feats = [c for c in TRAJ_NUMERIC_FEATURES if c in frame.columns]
    cat_feats = [c for c in TRAJ_CATEGORICAL_FEATURES if c in frame.columns]
    feature_cols = num_feats + cat_feats

    X = frame[feature_cols].copy()
    y = frame[TARGET].copy()

    gkf = GroupKFold(n_splits=5)
    cv_splits = list(gkf.split(X, y, groups=groups))

    neg_mae = make_scorer(mean_absolute_error, greater_is_better=False)
    r2 = make_scorer(r2_score)

    candidates = {
        "ridge": Ridge(alpha=10.0),
        "random_forest": RandomForestRegressor(
            random_state=42, n_estimators=300, max_depth=3, min_samples_leaf=5,
        ),
        "gradient_boosting": GradientBoostingRegressor(
            random_state=42, max_depth=2, n_estimators=100, learning_rate=0.05,
            min_samples_leaf=5, subsample=0.8,
        ),
    }

    best_name, best_mae_val = None, float("inf")
    cv_scores_by_name = {}
    for name, reg in candidates.items():
        pipe = Pipeline([("prep", _build_preprocessor(num_feats, cat_feats)), ("reg", clone(reg))])
        scores = cross_validate(pipe, X, y, cv=cv_splits, scoring={"neg_mae": neg_mae, "r2": r2})
        cv_scores_by_name[name] = scores
        mae_val = float(-scores["test_neg_mae"].mean())
        if mae_val < best_mae_val:
            best_mae_val, best_name = mae_val, name

    pipeline = Pipeline([
        ("prep", _build_preprocessor(num_feats, cat_feats)),
        ("reg", clone(candidates[best_name])),
    ])
    pipeline.fit(X, y)

    # Compute at_risk_threshold (bottom quartile of per-resident mean predicted next progress)
    from sklearn.model_selection import cross_val_predict
    oof_pred = cross_val_predict(
        Pipeline([("prep", _build_preprocessor(num_feats, cat_feats)), ("reg", clone(candidates[best_name]))]),
        X, y, cv=cv_splits,
    )
    per_res = (
        pd.DataFrame({"resident_id": groups, "pred": oof_pred})
        .groupby("resident_id")["pred"].mean()
    )
    at_risk_threshold = float(per_res.quantile(0.25))

    best = cv_scores_by_name[best_name]
    mae_cv = float(-best["test_neg_mae"].mean())
    r2_cv = float(best["test_r2"].mean())

    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipeline, "at_risk_threshold": at_risk_threshold}, artifact_path)

    return {
        "model": best_name,
        "mae": round(mae_cv, 4),
        "r2": round(r2_cv, 4),
        "at_risk_threshold": round(at_risk_threshold, 4),
        "rows": len(frame),
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
    artifact = repo / "pipelines" / "girls_education_trajectory_pipeline_v1.sav"
    metrics = retrain(data_root, artifact)
    print(f"Saved to {artifact}")
    print(f"Model: {metrics['model']} | MAE: {metrics['mae']} | R²: {metrics['r2']} | Rows: {metrics['rows']}")
    print(f"At-risk threshold: {metrics['at_risk_threshold']}")
