using api.Data;
using api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using api.Models;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DonorController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public DonorController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    /// <summary>Donation rows for the current user, resolved via <c>supporters.email</c> → <c>supporter_id</c>.</summary>
    [HttpGet("donations")]
    public async Task<ActionResult<IReadOnlyList<DonorDonationDto>>> GetMyDonations(CancellationToken cancellationToken)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null || string.IsNullOrWhiteSpace(user.Email))
        {
            return Unauthorized();
        }

        var supporterId = await _db.Supporters.AsNoTracking()
            .Where(s => s.Email == user.Email)
            .Select(s => (int?)s.SupporterId)
            .FirstOrDefaultAsync(cancellationToken);

        if (!supporterId.HasValue)
        {
            return Ok(Array.Empty<DonorDonationDto>());
        }

        var donations = await _db.Donations.AsNoTracking()
            .Where(d => d.SupporterId == supporterId.Value)
            .OrderByDescending(d => d.DonationDate)
            .ThenByDescending(d => d.DonationId)
            .Select(d => new DonorDonationDto
            {
                Id = d.DonationId.ToString(),
                Amount = d.Amount,
                CreatedDate = d.DonationDate.ToString("yyyy-MM-dd"),
                Type = d.DonationType,
                Campaign = d.CampaignName,
                Allocation = _db.DonationAllocations
                    .Where(a => a.DonationId == d.DonationId)
                    .OrderBy(a => a.AllocationId)
                    .Select(a => a.ProgramArea)
                    .FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        return Ok(donations);
    }
}
