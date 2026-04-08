from pydantic import BaseModel, Field


class RetentionFeatures(BaseModel):
    recency_days: float | None = Field(None, description="Days since last gift; null uses fallback")
    frequency: float = Field(0, ge=0)
    avg_monetary_value: float | None = None
    social_referral_count: float = Field(0, ge=0)
    is_recurring_donor: int = Field(0, ge=0, le=1)
    top_program_interest: str | None = None


class RetentionPrediction(BaseModel):
    predicted_class: int = Field(..., description="0 = lapsed, 1 = retained (model convention)")
    label: str
    probability_lapsed: float
    probability_retained: float
    features_used: list[str]
