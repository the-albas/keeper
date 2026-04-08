from pydantic import BaseModel, Field


class GirlsProgressFeatures(BaseModel):
    """Resident-level features for education progress regression (no mean_progress — that is the target)."""

    # safehouse_id removed: opaque integer ID; region/province/status already carry location signal
    present_age_years: float | None = None
    length_stay_years: float | None = None
    age_upon_admission_years: float | None = None
    sub_cat_orphaned: int | None = Field(None, ge=0, le=1)
    sub_cat_trafficked: int | None = Field(None, ge=0, le=1)
    sub_cat_child_labor: int | None = Field(None, ge=0, le=1)
    sub_cat_physical_abuse: int | None = Field(None, ge=0, le=1)
    sub_cat_sexual_abuse: int | None = Field(None, ge=0, le=1)
    sub_cat_osaec: int | None = Field(None, ge=0, le=1)
    sub_cat_cicl: int | None = Field(None, ge=0, le=1)
    sub_cat_at_risk: int | None = Field(None, ge=0, le=1)
    sub_cat_street_child: int | None = Field(None, ge=0, le=1)
    sub_cat_child_with_hiv: int | None = Field(None, ge=0, le=1)
    is_pwd: int | None = Field(None, ge=0, le=1)
    has_special_needs: int | None = Field(None, ge=0, le=1)
    family_is_4ps: int | None = Field(None, ge=0, le=1)
    family_solo_parent: int | None = Field(None, ge=0, le=1)
    family_indigenous: int | None = Field(None, ge=0, le=1)
    family_parent_pwd: int | None = Field(None, ge=0, le=1)
    family_informal_settler: int | None = Field(None, ge=0, le=1)
    hw_mean_general_health_score: float | None = None
    hw_mean_nutrition_score: float | None = None
    hw_mean_sleep_quality_score: float | None = None
    hw_mean_energy_level_score: float | None = None
    hw_mean_height_cm: float | None = None
    hw_mean_weight_kg: float | None = None
    hw_mean_bmi: float | None = None
    hw_rate_medical_checkup_done: float | None = None
    hw_rate_dental_checkup_done: float | None = None
    hw_rate_psychological_checkup_done: float | None = None
    # n_education_records removed: full-history count shares temporal scope with target
    n_intervention_plans: int | None = Field(None, ge=0)
    n_home_visitations: int | None = Field(None, ge=0)
    edu_earliest_progress: float | None = Field(None, description="Progress percent from first (admission) education record")
    edu_earliest_attendance_rate: float | None = Field(None, ge=0.0, le=1.0, description="Attendance rate from the first education record (leakage-free)")
    case_status: str | None = None
    sex: str | None = None
    birth_status: str | None = None
    case_category: str | None = None
    referral_source: str | None = None
    assigned_social_worker: str | None = None
    reintegration_type: str | None = None
    reintegration_status: str | None = None
    initial_risk_level: str | None = None
    current_risk_level: str | None = None
    pwd_type: str | None = None
    special_needs_diagnosis: str | None = None
    edu_earliest_education_level: str | None = None
    region: str | None = None
    province: str | None = None
    status: str | None = Field(None, description="Safehouse status")


class GirlsProgressPrediction(BaseModel):
    predicted_mean_progress: float = Field(
        ..., description="Model estimate of mean education progress across all records (0–100 scale)"
    )
    features_used: list[str]
