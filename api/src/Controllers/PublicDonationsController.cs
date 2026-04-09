using api.Data;
using api.DTOs;
using api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/public/donations")]
[EnableRateLimiting("public-donations")]
public class PublicDonationsController : ControllerBase
{
    private static readonly string[] ProgramAreas =
    [
        "Education",
        "Transport",
        "Wellbeing",
        "Operations",
        "Outreach",
        "Maintenance",
    ];

    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _config;
    private readonly ILogger<PublicDonationsController> _logger;

    public PublicDonationsController(
        AppDbContext db,
        UserManager<ApplicationUser> userManager,
        IConfiguration config,
        ILogger<PublicDonationsController> logger
    )
    {
        _db = db;
        _userManager = userManager;
        _config = config;
        _logger = logger;
    }

    /// <summary>Records a website monetary donation and one allocation row (random program area and safehouse).</summary>
    [AllowAnonymous]
    [HttpPost]
    public async Task<ActionResult<CreatePublicDonationResponse>> Create(
        [FromBody] CreatePublicDonationRequest body,
        CancellationToken cancellationToken
    )
    {
        var amount = body.Amount;
        if (amount is <= 0m or > 1_000_000m)
        {
            return BadRequest(
                new { error = "Amount must be greater than 0 and at most 1,000,000." }
            );
        }

        var anonymousSupporterId = _config.GetValue("Donations:AnonymousSupporterId", 1);
        var supporterId = anonymousSupporterId;

        if (User.Identity?.IsAuthenticated == true)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user is not null && !string.IsNullOrWhiteSpace(user.Email))
            {
                var linked = await _db
                    .Supporters.AsNoTracking()
                    .Where(s => s.Email == user.Email)
                    .Select(s => (int?)s.SupporterId)
                    .FirstOrDefaultAsync(cancellationToken);
                if (linked.HasValue)
                {
                    supporterId = linked.Value;
                }
            }
        }

        var safehouseIds = await _db
            .Safehouses.AsNoTracking()
            .Select(s => s.SafehouseId)
            .ToListAsync(cancellationToken);

        if (safehouseIds.Count == 0)
        {
            _logger.LogWarning("Cannot record donation: no safehouses in database.");
            return Problem(
                title: "Cannot complete donation",
                detail: "No safehouses are configured.",
                statusCode: StatusCodes.Status503ServiceUnavailable
            );
        }

        var safehouseId = safehouseIds[Random.Shared.Next(safehouseIds.Count)];
        var programArea = ProgramAreas[Random.Shared.Next(ProgramAreas.Length)];
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var donation = new Donation
        {
            SupporterId = supporterId,
            DonationType = "Monetary",
            DonationDate = today,
            IsRecurring = false,
            CampaignName = "Website",
            ChannelSource = "Website",
            CurrencyCode = "USD",
            Amount = amount,
            EstimatedValue = amount,
            ImpactUnit = "dollars",
            Notes = "Online donation (landing page)",
        };

        var allocation = new DonationAllocation
        {
            DonationId = 0,
            SafehouseId = safehouseId,
            ProgramArea = programArea,
            AmountAllocated = amount,
            AllocationDate = today,
            AllocationNotes = null,
        };

        await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // donations.donation_id is not identity; reserve the next key under lock.
            donation.DonationId = await _db
                .Database.SqlQuery<int>(
                    $"""
                    SELECT ISNULL(MAX(donation_id), 0) + 1 AS [Value]
                    FROM donations WITH (UPDLOCK, HOLDLOCK)
                    """
                )
                .SingleAsync(cancellationToken);

            _db.Donations.Add(donation);
            await _db.SaveChangesAsync(cancellationToken);

            allocation.DonationId = donation.DonationId;
            allocation.AllocationId = await _db
                .Database.SqlQuery<int>(
                    $"""
                    SELECT ISNULL(MAX(allocation_id), 0) + 1 AS [Value]
                    FROM donation_allocations WITH (UPDLOCK, HOLDLOCK)
                    """
                )
                .SingleAsync(cancellationToken);
            _db.DonationAllocations.Add(allocation);
            await _db.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Failed to persist public donation.");
            return Problem(
                title: "Donation failed",
                detail: "Could not save your donation. Please try again later.",
                statusCode: StatusCodes.Status500InternalServerError
            );
        }

        return Ok(
            new CreatePublicDonationResponse
            {
                DonationId = donation.DonationId,
                ProgramArea = programArea,
                SafehouseId = safehouseId,
            }
        );
    }
}
