"""
Lighthouse Sanctuary Data Analytics
Produces descriptive statistics, cross-tabulations, and statistical tests
across all major entity CSVs in lighthouse_csv_v7/.
"""

import pathlib
import pandas as pd
import numpy as np
from scipy import stats

DATA_DIR = pathlib.Path(__file__).resolve().parent.parent / "lighthouse_csv_v7"

# ---------------------------------------------------------------------------
# Load helpers
# ---------------------------------------------------------------------------

def load(name: str) -> pd.DataFrame:
    return pd.read_csv(DATA_DIR / f"{name}.csv", parse_dates=True)


def section(title: str):
    print(f"\n{'=' * 72}")
    print(f"  {title}")
    print('=' * 72)


# ---------------------------------------------------------------------------
# 1  Resident demographics & case profiles
# ---------------------------------------------------------------------------

def resident_demographics(residents: pd.DataFrame):
    section("Resident Demographics & Case Profiles")

    print(f"\nTotal residents: {len(residents)}")
    print(f"\nCase status breakdown:\n{residents['case_status'].value_counts().to_string()}")
    print(f"\nCase category breakdown:\n{residents['case_category'].value_counts().to_string()}")
    print(f"\nReligion distribution:\n{residents['religion'].value_counts().to_string()}")
    print(f"\nReferral source:\n{residents['referral_source'].value_counts().to_string()}")

    sub_cats = [c for c in residents.columns if c.startswith("sub_cat_")]
    sub_counts = residents[sub_cats].apply(lambda col: col.sum()).sort_values(ascending=False)
    print(f"\nSub-category flag counts:\n{sub_counts.to_string()}")

    risk = pd.crosstab(residents["initial_risk_level"], residents["current_risk_level"])
    print(f"\nRisk level transition (initial -> current):\n{risk.to_string()}")

    reint = pd.crosstab(residents["reintegration_type"], residents["reintegration_status"])
    print(f"\nReintegration type x status:\n{reint.to_string()}")


# ---------------------------------------------------------------------------
# 2  Safehouse capacity & utilisation
# ---------------------------------------------------------------------------

def safehouse_utilisation(safehouses: pd.DataFrame, metrics: pd.DataFrame):
    section("Safehouse Capacity & Utilisation")

    safehouses["utilisation_pct"] = (
        safehouses["current_occupancy"] / safehouses["capacity_girls"] * 100
    )
    print(f"\nCurrent snapshot:\n{safehouses[['safehouse_code', 'name', 'capacity_girls', 'current_occupancy', 'utilisation_pct']].to_string(index=False)}")

    monthly = metrics.merge(safehouses[["safehouse_id", "capacity_girls"]], on="safehouse_id")
    monthly["occupancy_pct"] = monthly["active_residents"] / monthly["capacity_girls"] * 100
    avg_occ = monthly.groupby("safehouse_id")["occupancy_pct"].mean()
    print(f"\nAverage monthly occupancy % by safehouse:\n{avg_occ.to_string()}")


# ---------------------------------------------------------------------------
# 3  Donation analysis
# ---------------------------------------------------------------------------

def donation_analysis(donations: pd.DataFrame, allocations: pd.DataFrame):
    section("Donation Analysis")

    monetary = donations[donations["donation_type"] == "Monetary"]
    print(f"\nTotal donations: {len(donations)}")
    print(f"Monetary donations: {len(monetary)}")
    print(f"Total monetary amount (PHP): {monetary['amount'].sum():,.2f}")
    print(f"\nMonetary donation stats:\n{monetary['amount'].describe().to_string()}")

    print(f"\nDonation type breakdown:\n{donations['donation_type'].value_counts().to_string()}")
    print(f"\nChannel source breakdown:\n{donations['channel_source'].value_counts().to_string()}")
    print(f"Recurring donations: {donations['is_recurring'].sum()} / {len(donations)}")

    donations["donation_date"] = pd.to_datetime(donations["donation_date"])
    monthly_totals = (
        monetary
        .assign(month=lambda d: pd.to_datetime(d["donation_date"]).dt.to_period("M"))
        .groupby("month")["amount"]
        .agg(["sum", "count", "mean"])
    )
    print(f"\nMonthly monetary donation trends:\n{monthly_totals.to_string()}")

    prog = allocations.groupby("program_area")["amount_allocated"].agg(["sum", "count", "mean"])
    print(f"\nAllocation by program area:\n{prog.sort_values('sum', ascending=False).to_string()}")


# ---------------------------------------------------------------------------
# 4  Education outcomes
# ---------------------------------------------------------------------------

def education_outcomes(edu: pd.DataFrame):
    section("Education Outcomes")

    print(f"\nTotal education records: {len(edu)}")
    print(f"\nProgress % stats:\n{edu['progress_percent'].describe().to_string()}")
    print(f"\nAttendance rate stats:\n{edu['attendance_rate'].describe().to_string()}")
    print(f"\nCompletion status:\n{edu['completion_status'].value_counts().to_string()}")
    print(f"\nEducation level:\n{edu['education_level'].value_counts().to_string()}")

    corr, p = stats.pearsonr(edu["attendance_rate"], edu["progress_percent"])
    print(f"\nPearson r (attendance vs progress): {corr:.4f}  (p = {p:.4e})")

    level_progress = edu.groupby("education_level")["progress_percent"].agg(["mean", "std", "count"])
    print(f"\nProgress by education level:\n{level_progress.to_string()}")

    groups = [g["progress_percent"].values for _, g in edu.groupby("education_level")]
    if len(groups) >= 2:
        f_stat, p_val = stats.f_oneway(*groups)
        print(f"One-way ANOVA (progress ~ education level): F = {f_stat:.4f}, p = {p_val:.4e}")


# ---------------------------------------------------------------------------
# 5  Health & wellbeing
# ---------------------------------------------------------------------------

def health_analysis(health: pd.DataFrame):
    section("Health & Wellbeing")

    score_cols = ["general_health_score", "nutrition_score", "sleep_quality_score", "energy_level_score"]
    print(f"\nTotal health records: {len(health)}")
    print(f"\nScore summary stats:")
    print(health[score_cols].describe().to_string())

    print(f"\nBMI stats:\n{health['bmi'].describe().to_string()}")

    health["record_date"] = pd.to_datetime(health["record_date"])
    monthly_avg = health.set_index("record_date")[score_cols].resample("ME").mean()
    print(f"\nMonthly average scores (last 6 months):\n{monthly_avg.tail(6).to_string()}")

    checkup_cols = ["medical_checkup_done", "dental_checkup_done", "psychological_checkup_done"]
    checkup_rates = health[checkup_cols].mean() * 100
    print(f"\nCheckup completion rates (%):\n{checkup_rates.to_string()}")

    corr_matrix = health[score_cols + ["bmi"]].corr()
    print(f"\nCorrelation matrix (scores + BMI):\n{corr_matrix.round(3).to_string()}")


# ---------------------------------------------------------------------------
# 6  Incident analysis
# ---------------------------------------------------------------------------

def incident_analysis(incidents: pd.DataFrame):
    section("Incident Reports")

    print(f"\nTotal incidents: {len(incidents)}")
    print(f"\nIncident type:\n{incidents['incident_type'].value_counts().to_string()}")
    print(f"\nSeverity:\n{incidents['severity'].value_counts().to_string()}")
    print(f"Resolution rate: {incidents['resolved'].mean() * 100:.1f}%")

    ct = pd.crosstab(incidents["incident_type"], incidents["severity"])
    print(f"\nIncident type x severity:\n{ct.to_string()}")

    chi2, p, dof, _ = stats.chi2_contingency(ct)
    print(f"Chi-squared test (type vs severity): X2 = {chi2:.4f}, p = {p:.4e}, dof = {dof}")

    per_safehouse = incidents.groupby("safehouse_id").size().sort_values(ascending=False)
    print(f"\nIncidents per safehouse:\n{per_safehouse.to_string()}")


# ---------------------------------------------------------------------------
# 7  Counselling sessions (process recordings)
# ---------------------------------------------------------------------------

def session_analysis(sessions: pd.DataFrame):
    section("Counselling Sessions (Process Recordings)")

    print(f"\nTotal sessions: {len(sessions)}")
    print(f"\nSession type breakdown:\n{sessions['session_type'].value_counts().to_string()}")
    print(f"\nDuration stats (minutes):\n{sessions['session_duration_minutes'].describe().to_string()}")

    print(f"\nEmotional state at start:\n{sessions['emotional_state_observed'].value_counts().to_string()}")
    print(f"\nEmotional state at end:\n{sessions['emotional_state_end'].value_counts().to_string()}")

    emo_order = ["Distressed", "Angry", "Anxious", "Withdrawn", "Sad", "Neutral", "Calm", "Hopeful", "Happy"]
    emo_rank = {e: i for i, e in enumerate(emo_order)}
    mapped_start = sessions["emotional_state_observed"].map(emo_rank)
    mapped_end = sessions["emotional_state_end"].map(emo_rank)
    valid = mapped_start.notna() & mapped_end.notna()
    if valid.any():
        diff = (mapped_end[valid] - mapped_start[valid])
        print(f"\nEmotional improvement score (higher = better):")
        print(f"  Mean: {diff.mean():.3f}  Median: {diff.median():.1f}  Std: {diff.std():.3f}")
        t, p = stats.ttest_1samp(diff, 0)
        print(f"  One-sample t-test (improvement != 0): t = {t:.4f}, p = {p:.4e}")

    transition = pd.crosstab(sessions["emotional_state_observed"], sessions["emotional_state_end"])
    print(f"\nEmotional state transition matrix:\n{transition.to_string()}")


# ---------------------------------------------------------------------------
# 8  Home visitations
# ---------------------------------------------------------------------------

def visitation_analysis(visits: pd.DataFrame):
    section("Home Visitations")

    print(f"\nTotal visitations: {len(visits)}")
    print(f"\nVisit type:\n{visits['visit_type'].value_counts().to_string()}")
    print(f"\nVisit outcome:\n{visits['visit_outcome'].value_counts().to_string()}")
    print(f"\nFamily cooperation level:\n{visits['family_cooperation_level'].value_counts().to_string()}")
    print(f"Safety concerns noted: {visits['safety_concerns_noted'].sum()} / {len(visits)} ({visits['safety_concerns_noted'].mean() * 100:.1f}%)")
    print(f"Follow-up needed: {visits['follow_up_needed'].sum()} / {len(visits)} ({visits['follow_up_needed'].mean() * 100:.1f}%)")

    ct = pd.crosstab(visits["family_cooperation_level"], visits["visit_outcome"])
    print(f"\nCooperation x outcome:\n{ct.to_string()}")

    chi2, p, dof, _ = stats.chi2_contingency(ct)
    print(f"Chi-squared test (cooperation vs outcome): X2 = {chi2:.4f}, p = {p:.4e}, dof = {dof}")


# ---------------------------------------------------------------------------
# 9  Social media engagement
# ---------------------------------------------------------------------------

def social_media_analysis(posts: pd.DataFrame):
    section("Social Media Engagement")

    print(f"\nTotal posts: {len(posts)}")
    print(f"\nPlatform breakdown:\n{posts['platform'].value_counts().to_string()}")
    print(f"\nPost type breakdown:\n{posts['post_type'].value_counts().to_string()}")

    engagement_cols = ["impressions", "reach", "likes", "comments", "shares", "saves", "engagement_rate"]
    print(f"\nEngagement stats:\n{posts[engagement_cols].describe().round(2).to_string()}")

    platform_eng = posts.groupby("platform")["engagement_rate"].agg(["mean", "median", "std", "count"])
    print(f"\nEngagement rate by platform:\n{platform_eng.round(4).to_string()}")

    type_eng = posts.groupby("post_type")["engagement_rate"].agg(["mean", "median", "count"]).sort_values("mean", ascending=False)
    print(f"\nEngagement rate by post type:\n{type_eng.round(4).to_string()}")

    topic_eng = posts.groupby("content_topic")["engagement_rate"].agg(["mean", "count"]).sort_values("mean", ascending=False)
    print(f"\nEngagement rate by content topic:\n{topic_eng.round(4).to_string()}")

    posts["donation_referrals"] = pd.to_numeric(posts["donation_referrals"], errors="coerce")
    has_cta = posts.groupby("has_call_to_action")["donation_referrals"].mean()
    print(f"\nAvg donation referrals by call-to-action presence:\n{has_cta.to_string()}")

    groups = [g["engagement_rate"].dropna().values for _, g in posts.groupby("platform")]
    if len(groups) >= 2:
        h_stat, p_val = stats.kruskal(*groups)
        print(f"\nKruskal-Wallis (engagement ~ platform): H = {h_stat:.4f}, p = {p_val:.4e}")


# ---------------------------------------------------------------------------
# 10  Supporter profiles
# ---------------------------------------------------------------------------

def supporter_analysis(supporters: pd.DataFrame, donations: pd.DataFrame):
    section("Supporter Profiles")

    print(f"\nTotal supporters: {len(supporters)}")
    print(f"\nSupporter type:\n{supporters['supporter_type'].value_counts().to_string()}")
    print(f"\nAcquisition channel:\n{supporters['acquisition_channel'].value_counts().to_string()}")
    print(f"\nRegion:\n{supporters['region'].value_counts().to_string()}")
    print(f"\nStatus:\n{supporters['status'].value_counts().to_string()}")

    donor_totals = (
        donations[donations["donation_type"] == "Monetary"]
        .groupby("supporter_id")["amount"]
        .agg(["sum", "count", "mean"])
        .rename(columns={"sum": "lifetime_total", "count": "num_donations", "mean": "avg_donation"})
    )
    print(f"\nTop 10 monetary donors by lifetime total:")
    top = donor_totals.sort_values("lifetime_total", ascending=False).head(10)
    print(top.to_string())


# ---------------------------------------------------------------------------
# 11  Cross-domain correlations
# ---------------------------------------------------------------------------

def cross_domain(metrics: pd.DataFrame):
    section("Cross-Domain Correlations (Monthly Metrics)")

    numeric_cols = [
        "active_residents", "avg_education_progress", "avg_health_score",
        "process_recording_count", "home_visitation_count", "incident_count",
    ]
    valid = metrics[numeric_cols].dropna()
    if len(valid) > 10:
        corr = valid.corr()
        print(f"\nCorrelation matrix across monthly metrics:\n{corr.round(3).to_string()}")

        for col_a, col_b in [
            ("process_recording_count", "avg_health_score"),
            ("home_visitation_count", "avg_education_progress"),
            ("incident_count", "avg_health_score"),
        ]:
            subset = valid[[col_a, col_b]].dropna()
            if len(subset) > 5:
                r, p = stats.pearsonr(subset[col_a], subset[col_b])
                print(f"  Pearson r ({col_a} vs {col_b}): {r:.4f}  (p = {p:.4e})")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("Loading data from", DATA_DIR)

    residents = load("residents")
    safehouses = load("safehouses")
    donations = load("donations")
    allocations = load("donation_allocations")
    edu = load("education_records")
    health = load("health_wellbeing_records")
    incidents = load("incident_reports")
    sessions = load("process_recordings")
    visits = load("home_visitations")
    metrics = load("safehouse_monthly_metrics")
    posts = load("social_media_posts")
    supporters = load("supporters")

    resident_demographics(residents)
    safehouse_utilisation(safehouses, metrics)
    donation_analysis(donations, allocations)
    education_outcomes(edu)
    health_analysis(health)
    incident_analysis(incidents)
    session_analysis(sessions)
    visitation_analysis(visits)
    social_media_analysis(posts)
    supporter_analysis(supporters, donations)
    cross_domain(metrics)

    section("Done")
    print("\nAll analyses complete.\n")


if __name__ == "__main__":
    main()
