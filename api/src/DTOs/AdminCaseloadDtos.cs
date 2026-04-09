using System.Text.Json.Serialization;

namespace api.DTOs;

/// <summary>Caseload row for <c>/caseload</c> (snake_case JSON). Maps <c>dbo.residents</c> + safehouse name.</summary>
public class AdminCaseloadResidentDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("resident_code")]
    public string ResidentCode { get; set; } = string.Empty;

    [JsonPropertyName("full_name")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("date_of_birth")]
    public string DateOfBirth { get; set; } = string.Empty;

    [JsonPropertyName("sex")]
    public string Sex { get; set; } = string.Empty;

    [JsonPropertyName("civil_status")]
    public string CivilStatus { get; set; } = string.Empty;

    [JsonPropertyName("nationality")]
    public string Nationality { get; set; } = string.Empty;

    [JsonPropertyName("case_status")]
    public string CaseStatus { get; set; } = string.Empty;

    [JsonPropertyName("case_category")]
    public string CaseCategory { get; set; } = string.Empty;

    [JsonPropertyName("case_subcategories")]
    public List<string> CaseSubcategories { get; set; } = [];

    [JsonPropertyName("risk_level")]
    public string RiskLevel { get; set; } = string.Empty;

    [JsonPropertyName("has_disability")]
    public bool HasDisability { get; set; }

    [JsonPropertyName("disability_type")]
    public string DisabilityType { get; set; } = string.Empty;

    [JsonPropertyName("is_4ps_beneficiary")]
    public bool Is4psBeneficiary { get; set; }

    [JsonPropertyName("is_solo_parent")]
    public bool IsSoloParent { get; set; }

    [JsonPropertyName("is_indigenous")]
    public bool IsIndigenous { get; set; }

    [JsonPropertyName("is_informal_settler")]
    public bool IsInformalSettler { get; set; }

    [JsonPropertyName("admission_date")]
    public string AdmissionDate { get; set; } = string.Empty;

    [JsonPropertyName("safehouse_id")]
    public string SafehouseId { get; set; } = string.Empty;

    [JsonPropertyName("safehouse_name")]
    public string SafehouseName { get; set; } = string.Empty;

    [JsonPropertyName("referred_by")]
    public string ReferredBy { get; set; } = string.Empty;

    [JsonPropertyName("referral_source")]
    public string ReferralSource { get; set; } = string.Empty;

    [JsonPropertyName("assigned_social_worker")]
    public string AssignedSocialWorker { get; set; } = string.Empty;

    [JsonPropertyName("reintegration_plan")]
    public string ReintegrationPlan { get; set; } = string.Empty;

    [JsonPropertyName("reintegration_target_date")]
    public string ReintegrationTargetDate { get; set; } = string.Empty;

    [JsonPropertyName("reintegration_status")]
    public string ReintegrationStatus { get; set; } = string.Empty;
}

/// <summary>
/// Per-resident feature payload used by girls-progress and girls-trajectory ML endpoints.
/// Field names intentionally match Python schema keys.
/// </summary>
public class AdminResidentMlFeaturesDto
{
    [JsonPropertyName("resident_id")]
    public string ResidentId { get; set; } = string.Empty;

    [JsonPropertyName("resident_code")]
    public string ResidentCode { get; set; } = string.Empty;

    [JsonPropertyName("present_age_years")]
    public double? PresentAgeYears { get; set; }

    [JsonPropertyName("length_stay_years")]
    public double? LengthStayYears { get; set; }

    [JsonPropertyName("age_upon_admission_years")]
    public double? AgeUponAdmissionYears { get; set; }

    [JsonPropertyName("sub_cat_orphaned")]
    public int? SubCatOrphaned { get; set; }

    [JsonPropertyName("sub_cat_trafficked")]
    public int? SubCatTrafficked { get; set; }

    [JsonPropertyName("sub_cat_child_labor")]
    public int? SubCatChildLabor { get; set; }

    [JsonPropertyName("sub_cat_physical_abuse")]
    public int? SubCatPhysicalAbuse { get; set; }

    [JsonPropertyName("sub_cat_sexual_abuse")]
    public int? SubCatSexualAbuse { get; set; }

    [JsonPropertyName("sub_cat_osaec")]
    public int? SubCatOsaec { get; set; }

    [JsonPropertyName("sub_cat_cicl")]
    public int? SubCatCicl { get; set; }

    [JsonPropertyName("sub_cat_at_risk")]
    public int? SubCatAtRisk { get; set; }

    [JsonPropertyName("sub_cat_street_child")]
    public int? SubCatStreetChild { get; set; }

    [JsonPropertyName("sub_cat_child_with_hiv")]
    public int? SubCatChildWithHiv { get; set; }

    [JsonPropertyName("is_pwd")]
    public int? IsPwd { get; set; }

    [JsonPropertyName("has_special_needs")]
    public int? HasSpecialNeeds { get; set; }

    [JsonPropertyName("family_is_4ps")]
    public int? FamilyIs4ps { get; set; }

    [JsonPropertyName("family_solo_parent")]
    public int? FamilySoloParent { get; set; }

    [JsonPropertyName("family_indigenous")]
    public int? FamilyIndigenous { get; set; }

    [JsonPropertyName("family_parent_pwd")]
    public int? FamilyParentPwd { get; set; }

    [JsonPropertyName("family_informal_settler")]
    public int? FamilyInformalSettler { get; set; }

    [JsonPropertyName("hw_mean_general_health_score")]
    public double? HwMeanGeneralHealthScore { get; set; }

    [JsonPropertyName("hw_mean_nutrition_score")]
    public double? HwMeanNutritionScore { get; set; }

    [JsonPropertyName("hw_mean_sleep_quality_score")]
    public double? HwMeanSleepQualityScore { get; set; }

    [JsonPropertyName("hw_mean_energy_level_score")]
    public double? HwMeanEnergyLevelScore { get; set; }

    [JsonPropertyName("hw_mean_height_cm")]
    public double? HwMeanHeightCm { get; set; }

    [JsonPropertyName("hw_mean_weight_kg")]
    public double? HwMeanWeightKg { get; set; }

    [JsonPropertyName("hw_mean_bmi")]
    public double? HwMeanBmi { get; set; }

    [JsonPropertyName("hw_rate_medical_checkup_done")]
    public double? HwRateMedicalCheckupDone { get; set; }

    [JsonPropertyName("hw_rate_dental_checkup_done")]
    public double? HwRateDentalCheckupDone { get; set; }

    [JsonPropertyName("hw_rate_psychological_checkup_done")]
    public double? HwRatePsychologicalCheckupDone { get; set; }

    [JsonPropertyName("n_intervention_plans")]
    public int? NInterventionPlans { get; set; }

    [JsonPropertyName("n_home_visitations")]
    public int? NHomeVisitations { get; set; }

    [JsonPropertyName("edu_earliest_progress")]
    public double? EduEarliestProgress { get; set; }

    [JsonPropertyName("edu_earliest_attendance_rate")]
    public double? EduEarliestAttendanceRate { get; set; }

    [JsonPropertyName("case_status")]
    public string? CaseStatus { get; set; }

    [JsonPropertyName("sex")]
    public string? Sex { get; set; }

    [JsonPropertyName("birth_status")]
    public string? BirthStatus { get; set; }

    [JsonPropertyName("case_category")]
    public string? CaseCategory { get; set; }

    [JsonPropertyName("referral_source")]
    public string? ReferralSource { get; set; }

    [JsonPropertyName("assigned_social_worker")]
    public string? AssignedSocialWorker { get; set; }

    [JsonPropertyName("reintegration_type")]
    public string? ReintegrationType { get; set; }

    [JsonPropertyName("reintegration_status")]
    public string? ReintegrationStatus { get; set; }

    [JsonPropertyName("initial_risk_level")]
    public string? InitialRiskLevel { get; set; }

    [JsonPropertyName("current_risk_level")]
    public string? CurrentRiskLevel { get; set; }

    [JsonPropertyName("pwd_type")]
    public string? PwdType { get; set; }

    [JsonPropertyName("special_needs_diagnosis")]
    public string? SpecialNeedsDiagnosis { get; set; }

    [JsonPropertyName("edu_earliest_education_level")]
    public string? EduEarliestEducationLevel { get; set; }

    [JsonPropertyName("region")]
    public string? Region { get; set; }

    [JsonPropertyName("province")]
    public string? Province { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("current_progress")]
    public double? CurrentProgress { get; set; }

    [JsonPropertyName("days_since_admission")]
    public double? DaysSinceAdmission { get; set; }

    [JsonPropertyName("n_incidents")]
    public double? NIncidents { get; set; }

    [JsonPropertyName("incident_high_rate")]
    public double? IncidentHighRate { get; set; }

    [JsonPropertyName("incident_unresolved_rate")]
    public double? IncidentUnresolvedRate { get; set; }

    [JsonPropertyName("safety_concern_rate")]
    public double? SafetyConcernRate { get; set; }

    [JsonPropertyName("followup_needed_rate")]
    public double? FollowupNeededRate { get; set; }

    [JsonPropertyName("n_process_sessions")]
    public double? NProcessSessions { get; set; }

    [JsonPropertyName("concerns_flagged_rate")]
    public double? ConcernsFlaggedRate { get; set; }

    [JsonPropertyName("referral_made_rate")]
    public double? ReferralMadeRate { get; set; }

    [JsonPropertyName("occupancy_ratio")]
    public double? OccupancyRatio { get; set; }

    [JsonPropertyName("edu_education_level")]
    public string? EduEducationLevel { get; set; }
}
