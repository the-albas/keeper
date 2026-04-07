from pydantic import BaseModel, Field


class GrowthFeatures(BaseModel):
    """Input features for growth regression (no total_monetary_value — that is what we predict).

    Note: avg_monetary_value is intentionally absent. It equals total_monetary_value / frequency
    by construction and would constitute data leakage if included as an input.
    """

    recency_days: float | None = Field(None, description="Days since last gift; null uses fallback")
    frequency: float = Field(0, ge=0)
    social_referral_count: float = Field(0, ge=0)
    is_recurring_donor: int = Field(0, ge=0, le=1)

    # Engineered from raw CSVs (caller should compute; defaults to 0 if unknown)
    donor_tenure_days: float = Field(0, ge=0, description="Days since supporter was created")
    gift_volatility: float = Field(0, ge=0, description="Coefficient of variation of gift amounts (std/mean); 0 for <=1 gift")
    donation_type_diversity: float = Field(0, ge=0, description="Count of distinct donation types made by this supporter")

    # Supporter demographics — already in prepared CSV
    top_program_interest: str | None = None
    supporter_type: str | None = None
    relationship_type: str | None = None
    region: str | None = None
    acquisition_channel: str | None = None
    status: str | None = None


class GrowthPrediction(BaseModel):
    predicted_total_monetary_value: float = Field(
        ..., description="Model estimate of supporter total giving scale"
    )
    features_used: list[str]
