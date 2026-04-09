namespace api.Models;

public class PartnerAssignment
{
    public int AssignmentId { get; set; }
    public int PartnerId { get; set; }

    /// <summary>When null, the partner serves in this program area without a specific safehouse (e.g. org-wide).</summary>
    public int? SafehouseId { get; set; }
    public string? ProgramArea { get; set; }
    public DateOnly AssignmentStart { get; set; }
    public DateOnly? AssignmentEnd { get; set; }
    public string? ResponsibilityNotes { get; set; }
    public bool IsPrimary { get; set; }
    public string? Status { get; set; }
}
