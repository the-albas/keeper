# Data Analytics Ideas

Analyses we can build from the Lighthouse CSV data to demonstrate donor impact,
track program effectiveness, and give supporters confidence that their money
is making a real difference.

---

## Cross-Domain Analyses (general)

### 1. Session Frequency vs. Emotional Trajectory
Join `process_recordings` to `residents`. Count each resident's total sessions
and compute their average emotional-improvement score (end state minus start
state on an ordinal scale). **Expected finding:** more sessions correlate with
greater emotional gains.

### 2. Visitation Frequency vs. Reintegration Success
Join `home_visitations` to `residents`. Compare visit counts for residents
whose `reintegration_status` is "Completed" vs. "In Progress" or "On Hold".
**Expected finding:** successful reintegrations had more frequent family visits.

### 3. Intervention Plan Completion vs. Health/Education Scores
Join `intervention_plans` (status = "Completed") to each resident's latest
`health_wellbeing_records` and `education_records`. **Expected finding:**
residents with completed plans show higher health and education scores.

### 4. Donation Amount per Safehouse vs. Education Progress
Join `donation_allocations` (program_area = "Education") by `safehouse_id` to
`safehouse_monthly_metrics.avg_education_progress`. **Expected finding:** more
education funding correlates with better progress percentages.

### 5. Length of Stay vs. Risk Level Reduction
Parse `residents.length_of_stay` into months and compare against the ordinal
gap between `initial_risk_level` and `current_risk_level`. **Expected finding:**
longer stays produce larger drops in risk level.

### 6. Social Media Referrals vs. Donation Spikes
Join `social_media_posts` with `donation_referrals > 0` by date to the
`donations` table. Check whether high-referral post dates precede donation
spikes in the following 1-7 days. **Expected finding:** viral posts generate
measurable donation bumps.

---

## Donor-Impact Analyses

Everything below is designed to answer one question from the donor's
perspective: **"Is my money actually helping?"**

### 7. Cost Per Successful Reintegration
Total monetary donations allocated to a safehouse, divided by the number of
residents at that safehouse whose `reintegration_status` = "Completed".
Present as: *"It costs an average of PHP X,XXX to successfully reintegrate
one girl back into a safe family."*

### 8. Peso-to-Progress Pipeline
Correlate monthly donation totals (from `donations`) with the following
month's `avg_education_progress` and `avg_health_score` in
`safehouse_monthly_metrics` (lagged by one month). This builds a direct
narrative: *"For every PHP 1,000 donated, education progress rose by Y%."*

### 9. Before/After Snapshots by Funding Period
Identify months with above-median vs. below-median donation totals. Compare
average health scores, education progress, and incident counts in the month
that follows each group. Show donors that high-funding months lead to
measurably better outcomes.

### 10. Program Area ROI
For each `program_area` in `donation_allocations` (Education, Wellbeing,
Operations, etc.), correlate total allocated funds with the most relevant
outcome metric:
- **Education** -> `avg_education_progress`
- **Wellbeing** -> `avg_health_score`
- **Operations** -> `incident_count` (inverse — fewer incidents = better)
- **Transport** -> `home_visitation_count`

This lets donors choose where their money goes with data-backed confidence.

### 11. Donor Retention & Lifetime Value
From `donations` joined to `supporters`, compute:
- Retention rate (% of donors who give more than once)
- Average lifetime value per donor
- Average time between first and most recent donation
- Breakdown by `acquisition_channel`

Frame as: *"Recurring donors have contributed X times more than one-time
donors, sustaining long-term care for our girls."*

### 12. Recurring vs. One-Time Donor Impact
Split donors by `is_recurring`. Compare the average outcomes at safehouses
that rely more heavily on recurring revenue vs. one-time spikes. **Expected
finding:** safehouses with stable recurring funding show steadier health and
education improvements.

### 13. Donation Channel Effectiveness
Group donations by `channel_source` (Campaign, Event, Direct, SocialMedia,
PartnerReferral). For each channel, compute average donation size, total
volume, and recurring rate. Show donors which channels are most effective
so they can amplify the best ones.

### 14. Impact Per Donor Dollar by Safehouse
Join `donation_allocations` to `safehouse_monthly_metrics`. For each
safehouse, compute a composite "impact score" (weighted blend of education
progress, health score improvement, and reintegration completions) divided by
total funds allocated. Show donors which safehouses deliver the most impact
per peso — and which ones need more support.

### 15. Donor Cohort Outcomes Over Time
Group donors by the quarter they first donated. Track how each cohort's
continued giving correlates with improving resident outcomes over subsequent
quarters. Visualize as a cohort chart: *"Donors who joined in Q1 2023 have
collectively funded X reintegrations and Y% average health improvement."*

### 16. In-Kind Donation Impact
Join `in_kind_donation_items` to `donation_allocations` and resident outcomes.
Show non-monetary donors that their contributions (supplies, goods) have
measurable effects. *"In-kind donations covered X% of safehouse operational
needs, freeing PHP Y for direct resident care."*

### 17. Time/Skills Volunteer Impact
Filter `donations` for `donation_type` = "Time" or "Skills". Correlate
volunteer hours with `process_recording_count` and `home_visitation_count`
from monthly metrics. **Expected finding:** more volunteer hours correlate
with more counselling sessions and family visits.

### 18. Donor-Funded Checkup Completion
Correlate monthly Wellbeing-allocated funds with checkup completion rates
(`medical_checkup_done`, `dental_checkup_done`, `psychological_checkup_done`
from `health_wellbeing_records`). *"Months with higher wellbeing funding saw
X% more medical checkups completed."*

### 19. Campaign-Specific Impact Reports
For each `campaign_name` in `donations`, aggregate total raised, number of
donors, and the outcome metrics during and after the campaign window.
Build per-campaign impact summaries: *"The Year-End Hope campaign raised
PHP X and directly supported Y girls during that quarter."*

### 20. Social Media Advocacy ROI
Join `social_media_posts` engagement metrics to `donations` where
`donation_type` = "SocialMedia". Show advocacy donors that their shares
and engagement translate into reach, impressions, and downstream monetary
donations from referrals.

---

## Presentation Notes

When surfacing these to donors, prioritize:
- **Plain language** over statistical jargon (say "strong link" not "r = 0.56")
- **Per-unit framing** ("PHP 500 funds one month of education" not "total was 67K")
- **Before/after contrasts** (risk level at admission vs. now)
- **Individual anonymized stories** backed by the aggregate data
- **Visual trends** (line charts showing improvement over time)
