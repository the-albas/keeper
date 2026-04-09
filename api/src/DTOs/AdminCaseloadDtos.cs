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
