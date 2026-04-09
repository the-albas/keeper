using System.Globalization;
using api.Data;
using api.DTOs;
using api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Staff}")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<AdminController> _logger;

    public AdminController(AppDbContext db, ILogger<AdminController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>Residents for dashboard metrics and case lists (maps <c>dbo.residents</c>).</summary>
    [HttpGet("residents")]
    public async Task<ActionResult<IReadOnlyList<AdminResidentDto>>> GetResidents(
        CancellationToken cancellationToken
    )
    {
        try
        {
            var rows = await _db
                .Database.SqlQuery<ResidentRow>(
                    $"""
                    SELECT
                        CAST(resident_id AS NVARCHAR(32)) AS Id,
                        CASE WHEN date_closed IS NULL THEN N'Active' ELSE N'Closed' END AS Status,
                        ISNULL(case_status, N'') AS CaseStatus,
                        ISNULL(
                            NULLIF(LTRIM(RTRIM(internal_code)), N''),
                            ISNULL(
                                NULLIF(LTRIM(RTRIM(case_control_no)), N''),
                                CAST(resident_id AS NVARCHAR(32))
                            )
                        ) AS ResidentCode,
                        ISNULL(
                            NULLIF(LTRIM(RTRIM(current_risk_level)), N''),
                            ISNULL(NULLIF(LTRIM(RTRIM(initial_risk_level)), N''), N'Low')
                        ) AS RiskLevel
                    FROM dbo.residents
                    ORDER BY resident_id
                    """
                )
                .ToListAsync(cancellationToken);

            var dtos = rows
                .Select(r => new AdminResidentDto
                {
                    Id = r.Id,
                    Status = r.Status,
                    CaseStatus = r.CaseStatus,
                    ResidentCode = r.ResidentCode,
                    RiskLevel = TitleCaseRisk(r.RiskLevel),
                })
                .ToList();

            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed loading admin residents from dbo.residents.");
            return Ok(Array.Empty<AdminResidentDto>());
        }
    }

    /// <summary>Most recent donations (default 30) for totals and trends chart.</summary>
    [HttpGet("donations/recent")]
    public async Task<ActionResult<IReadOnlyList<AdminDonationDto>>> GetRecentDonations(
        [FromQuery] int take = 500,
        CancellationToken cancellationToken = default
    )
    {
        take = Math.Clamp(take, 1, 500);

        var donations = await _db
            .Donations.AsNoTracking()
            .OrderByDescending(d => d.DonationDate)
            .ThenByDescending(d => d.DonationId)
            .Take(take)
            .Select(d => new
            {
                d.DonationId,
                d.Amount,
                d.DonationDate,
                d.DonationType,
                d.CampaignName,
                d.SupporterId,
            })
            .ToListAsync(cancellationToken);

        if (donations.Count == 0)
        {
            return Ok(Array.Empty<AdminDonationDto>());
        }

        var supporterIds = donations.Select(d => d.SupporterId).Distinct().ToArray();
        var emails = await _db
            .Supporters.AsNoTracking()
            .Where(s => supporterIds.Contains(s.SupporterId))
            .Select(s => new { s.SupporterId, s.Email })
            .ToDictionaryAsync(x => x.SupporterId, x => x.Email, cancellationToken);

        var donationIds = donations.Select(d => d.DonationId).ToArray();
        var allocationRows = await _db
            .DonationAllocations.AsNoTracking()
            .Where(a => donationIds.Contains(a.DonationId))
            .Select(a => new { a.DonationId, a.AllocationId, a.ProgramArea })
            .ToListAsync(cancellationToken);

        var firstAllocationByDonation = allocationRows
            .GroupBy(a => a.DonationId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(x => x.AllocationId).First().ProgramArea
            );

        var result = new List<AdminDonationDto>(donations.Count);
        foreach (var d in donations)
        {
            emails.TryGetValue(d.SupporterId, out var email);
            firstAllocationByDonation.TryGetValue(d.DonationId, out var allocation);

            result.Add(
                new AdminDonationDto
                {
                    Id = d.DonationId.ToString(CultureInfo.InvariantCulture),
                    Amount = d.Amount,
                    CreatedDate = d.DonationDate.ToString(
                        "yyyy-MM-dd",
                        CultureInfo.InvariantCulture
                    ),
                    Type = d.DonationType,
                    Campaign = d.CampaignName,
                    Allocation = allocation,
                    DonorEmail = email,
                }
            );
        }

        return Ok(result);
    }

    /// <summary>All safehouses for occupancy and active counts.</summary>
    [HttpGet("safehouses")]
    public async Task<ActionResult<IReadOnlyList<AdminSafehouseDto>>> GetSafehouses(
        CancellationToken cancellationToken
    )
    {
        var list = await _db
            .Safehouses.AsNoTracking()
            .OrderBy(s => s.SafehouseId)
            .Select(s => new AdminSafehouseDto
            {
                Id = s.SafehouseId.ToString(CultureInfo.InvariantCulture),
                Name = s.Name,
                Location = BuildLocation(s.City, s.Region, s.Province, s.Country),
                Status = s.Status,
                Capacity = s.CapacityGirls ?? 0,
                CurrentOccupancy = s.CurrentOccupancy ?? 0,
            })
            .ToListAsync(cancellationToken);

        return Ok(list);
    }

    /// <summary>All supporters for Donors & Contributions (read-only Phase 1).</summary>
    [HttpGet("supporters")]
    public async Task<ActionResult<IReadOnlyList<AdminSupporterListDto>>> GetSupporters(
        CancellationToken cancellationToken
    )
    {
        var list = await AdminDonorQueries.ListSupportersAsync(_db, cancellationToken);
        return Ok(list);
    }

    /// <summary>Enriched donation rows for the Contributions tab (amounts in PHP).</summary>
    [HttpGet("contributions")]
    public async Task<ActionResult<IReadOnlyList<AdminContributionListDto>>> GetContributions(
        [FromQuery] int take = 5000,
        CancellationToken cancellationToken = default
    )
    {
        var list = await AdminDonorQueries.ListContributionsAsync(_db, take, cancellationToken);
        return Ok(list);
    }

    /// <summary>Safehouse ids/names, distinct program areas, and distinct campaign names.</summary>
    [HttpGet("lookups/donor-ui")]
    public async Task<ActionResult<AdminDonorUiLookupsDto>> GetDonorUiLookups(
        CancellationToken cancellationToken
    )
    {
        var dto = await AdminDonorQueries.GetDonorUiLookupsAsync(_db, cancellationToken);
        return Ok(dto);
    }

    /// <summary>Full caseload rows for <c>/caseload</c> (read-only). Does not expose restricted notes.</summary>
    [HttpGet("caseload/residents")]
    public async Task<ActionResult<IReadOnlyList<AdminCaseloadResidentDto>>> GetCaseloadResidents(
        [FromQuery] int take = 5000,
        CancellationToken cancellationToken = default
    )
    {
        var list = await AdminCaseloadQueries.ListResidentsAsync(
            _db,
            take,
            _logger,
            cancellationToken
        );
        return Ok(list);
    }

    private static string BuildLocation(string? city, string? region, string? province, string? country)
    {
        var parts = new[] { city, region, province, country }
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => p!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        return parts.Length > 0 ? string.Join(", ", parts) : string.Empty;
    }

    private static string TitleCaseRisk(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return "Low";
        }

        var t = raw.Trim();
        if (t.Length == 1)
        {
            return t.ToUpperInvariant();
        }

        return char.ToUpperInvariant(t[0]) + t.Substring(1).ToLowerInvariant();
    }

    private sealed class ResidentRow
    {
        public string Id { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string CaseStatus { get; set; } = string.Empty;
        public string ResidentCode { get; set; } = string.Empty;
        public string RiskLevel { get; set; } = string.Empty;
    }
}
