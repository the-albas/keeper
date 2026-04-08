from pydantic import BaseModel, Field


class GirlsTrajectoryFeatures(BaseModel):
    """
    One check-in row (record-level) — same columns as girls_education_trajectory.ipynb TRAJ_FEATURE_COLUMNS.
    """

    current_progress: float | None = None
    days_since_admission: float | None = None
    # days_to_next_record removed: future information not available at prediction time
    present_age_years: float | None = None
    age_upon_admission_years: float | None = None
    has_special_needs: int | None = Field(None, ge=0, le=1)
    family_parent_pwd: int | None = Field(None, ge=0, le=1)
    hw_mean_nutrition_score: float | None = None
    hw_mean_energy_level_score: float | None = None
    hw_mean_sleep_quality_score: float | None = None
    hw_mean_general_health_score: float | None = None
    hw_mean_bmi: float | None = None
    hw_rate_psychological_checkup_done: float | None = None
    n_incidents: float | None = Field(None, ge=0)
    incident_high_rate: float | None = None
    incident_unresolved_rate: float | None = None
    n_home_visitations: float | None = Field(None, ge=0)
    safety_concern_rate: float | None = None
    followup_needed_rate: float | None = None
    n_process_sessions: float | None = Field(None, ge=0)
    concerns_flagged_rate: float | None = None
    referral_made_rate: float | None = None
    n_intervention_plans: float | None = Field(None, ge=0)
    occupancy_ratio: float | None = None
    case_status: str | None = None
    case_category: str | None = None
    initial_risk_level: str | None = None
    current_risk_level: str | None = None
    referral_source: str | None = None
    reintegration_status: str | None = None
    edu_education_level: str | None = None
    region: str | None = None
    province: str | None = None


class GirlsTrajectoryPrediction(BaseModel):
    predicted_next_progress: float = Field(
        ..., description="Predicted progress_percent at the next education check-in (0–100)"
    )
    risk_label: str | None = Field(
        None,
        description="At Risk / On Track vs bundled cohort threshold; null if artifact has no threshold",
    )
    at_risk_threshold: float | None = Field(
        None, description="Threshold from training artifact (bottom quartile of mean predicted next progress)"
    )
    features_used: list[str]
