namespace api.DTOs;

public class CreatePublicDonationRequest
{
    public decimal Amount { get; set; }
}

public class CreatePublicDonationResponse
{
    public int DonationId { get; set; }
    public string ProgramArea { get; set; } = string.Empty;
    public int SafehouseId { get; set; }
}
