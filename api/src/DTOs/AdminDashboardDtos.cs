using System.Text.Json.Serialization;

namespace api.DTOs;

/// <summary>Resident row for admin dashboard (snake_case JSON to match the web app).</summary>
public class AdminResidentDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>Derived: Active when <c>date_closed</c> is null; otherwise Closed.</summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("case_status")]
    public string CaseStatus { get; set; } = string.Empty;

    [JsonPropertyName("resident_code")]
    public string ResidentCode { get; set; } = string.Empty;

    [JsonPropertyName("risk_level")]
    public string RiskLevel { get; set; } = string.Empty;
}

/// <summary>Recent donation for admin dashboard (snake_case JSON).</summary>
public class AdminDonationDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("created_date")]
    public string CreatedDate { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("campaign")]
    public string? Campaign { get; set; }

    [JsonPropertyName("allocation")]
    public string? Allocation { get; set; }

    [JsonPropertyName("donor_email")]
    public string? DonorEmail { get; set; }
}

/// <summary>Safehouse row for admin dashboard (snake_case JSON).</summary>
public class AdminSafehouseDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("location")]
    public string Location { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("capacity")]
    public int Capacity { get; set; }

    [JsonPropertyName("current_occupancy")]
    public int CurrentOccupancy { get; set; }
}
