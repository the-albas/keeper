using System.Text.Json.Serialization;

namespace api.DTOs;

/// <summary>Supporter row for Donors & Contributions page (snake_case JSON, PHP site-wide).</summary>
public class AdminSupporterListDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("phone")]
    public string Phone { get; set; } = string.Empty;

    [JsonPropertyName("supporter_type")]
    public string SupporterType { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("organization")]
    public string Organization { get; set; } = string.Empty;

    [JsonPropertyName("is_anonymous")]
    public bool IsAnonymous { get; set; }

    [JsonPropertyName("joined_date")]
    public string JoinedDate { get; set; } = string.Empty;

    [JsonPropertyName("notes")]
    public string Notes { get; set; } = string.Empty;
}

/// <summary>Enriched donation row for the Contributions tab (snake_case JSON; amounts in PHP).</summary>
public class AdminContributionListDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("supporter_id")]
    public string SupporterId { get; set; } = string.Empty;

    [JsonPropertyName("supporter_name")]
    public string SupporterName { get; set; } = string.Empty;

    [JsonPropertyName("contribution_type")]
    public string ContributionType { get; set; } = string.Empty;

    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "PHP";

    [JsonPropertyName("payment_method")]
    public string PaymentMethod { get; set; } = string.Empty;

    [JsonPropertyName("campaign")]
    public string Campaign { get; set; } = string.Empty;

    [JsonPropertyName("item_description")]
    public string ItemDescription { get; set; } = string.Empty;

    [JsonPropertyName("estimated_value")]
    public decimal EstimatedValue { get; set; }

    [JsonPropertyName("hours")]
    public decimal Hours { get; set; }

    [JsonPropertyName("skill_description")]
    public string SkillDescription { get; set; } = string.Empty;

    [JsonPropertyName("platform")]
    public string Platform { get; set; } = string.Empty;

    [JsonPropertyName("reach")]
    public string Reach { get; set; } = string.Empty;

    [JsonPropertyName("allocation_safehouse")]
    public string AllocationSafehouse { get; set; } = string.Empty;

    [JsonPropertyName("allocation_program")]
    public string AllocationProgram { get; set; } = string.Empty;

    [JsonPropertyName("receipt_number")]
    public string ReceiptNumber { get; set; } = string.Empty;

    [JsonPropertyName("notes")]
    public string Notes { get; set; } = string.Empty;
}

/// <summary>Dropdown and filter options for the Donors & Contributions UI.</summary>
public class AdminDonorUiLookupsDto
{
    [JsonPropertyName("safehouses")]
    public IReadOnlyList<AdminLookupSafehouseDto> Safehouses { get; set; } =
        Array.Empty<AdminLookupSafehouseDto>();

    [JsonPropertyName("programs")]
    public IReadOnlyList<string> Programs { get; set; } = Array.Empty<string>();

    [JsonPropertyName("campaigns")]
    public IReadOnlyList<string> Campaigns { get; set; } = Array.Empty<string>();
}

public class AdminLookupSafehouseDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}
