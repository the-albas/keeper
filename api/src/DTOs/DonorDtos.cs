namespace api.DTOs;

/// <summary>Single donation row for the signed-in donor dashboard (camelCase JSON).</summary>
public class DonorDonationDto
{
    public string Id { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string CreatedDate { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? Campaign { get; set; }
    public string? Allocation { get; set; }
}
