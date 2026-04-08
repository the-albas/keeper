from pydantic import BaseModel, Field


class SocialEngagementFeatures(BaseModel):
    """Pre-post features for engagement_rate (matches social_media_engagement_increase.ipynb FEATURES_ENGAGEMENT_MODEL)."""

    caption_length: float = Field(0, ge=0)
    num_hashtags: float = Field(0, ge=0)
    boost_budget_php: float = Field(0, ge=0)
    follower_count_at_post: float = Field(0, ge=0)
    post_hour: int = Field(0, ge=0, le=23)
    has_call_to_action: int = Field(0, ge=0, le=1)
    is_boosted: int = Field(0, ge=0, le=1)
    platform: str = Field("Unknown")
    post_type: str = Field("Unknown")
    media_type: str = Field("Unknown")
    content_topic: str = Field("Unknown")
    sentiment_tone: str = Field("Unknown")
    post_dow: str = Field("Unknown", description="Day name, e.g. Monday (from post timestamp)")
    call_to_action_type: str = Field("Unknown")


class SocialEngagementPrediction(BaseModel):
    predicted_engagement_rate: float = Field(
        ..., description="Model estimate of engagement_rate for the described post"
    )
    features_used: list[str]
