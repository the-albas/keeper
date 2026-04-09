using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json.Serialization;
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

            var dtos = rows.Select(r => new AdminResidentDto
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

        var supporterIds = donations
            .Select(d => d.SupporterId)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToArray();
        var emails = await _db
            .Supporters.AsNoTracking()
            .Where(s => supporterIds.Contains(s.SupporterId))
            .Select(s => new { s.SupporterId, s.Email })
            .ToDictionaryAsync(x => x.SupporterId, x => x.Email, cancellationToken);

        var donationIds = donations.Select(d => d.DonationId).ToArray();
        var allocationRows = await _db
            .DonationAllocations.AsNoTracking()
            .Where(a => donationIds.Contains(a.DonationId))
            .Select(a => new
            {
                a.DonationId,
                a.AllocationId,
                a.ProgramArea,
            })
            .ToListAsync(cancellationToken);

        var firstAllocationByDonation = allocationRows
            .GroupBy(a => a.DonationId)
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.AllocationId).First().ProgramArea);

        var result = new List<AdminDonationDto>(donations.Count);
        foreach (var d in donations)
        {
            var email =
                d.SupporterId.HasValue && emails.TryGetValue(d.SupporterId.Value, out var matched)
                    ? matched
                    : null;
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

    /// <summary>Create a supporter row used by the Donors &amp; Contributions page.</summary>
    [HttpPost("supporters")]
    public async Task<ActionResult<object>> CreateSupporter(
        [FromBody] SupporterUpsertRequest body,
        CancellationToken cancellationToken
    )
    {
        if (string.IsNullOrWhiteSpace(body.Name))
        {
            return BadRequest(new { error = "name is required." });
        }

        DateTime? createdAt = null;
        if (!string.IsNullOrWhiteSpace(body.JoinedDate))
        {
            if (!DateOnly.TryParse(body.JoinedDate, out var joined))
            {
                return BadRequest(new { error = "joined_date must be a valid yyyy-MM-dd date." });
            }
            createdAt = joined.ToDateTime(TimeOnly.MinValue);
        }

        var dbSupporterType = MapSupporterTypeForDb(body.SupporterType);

        var displayName = body.IsAnonymous ? "Anonymous Donor" : body.Name.Trim();
        var status = string.IsNullOrWhiteSpace(body.Status) ? "Active" : body.Status.Trim();

        var insertedIdRows = await _db
            .Database.SqlQuery<int>(
                $"""
                DECLARE @new_ids TABLE (id int);

                ;WITH next_id AS (
                    SELECT ISNULL(MAX(s.supporter_id), 0) + 1 AS supporter_id
                    FROM dbo.supporters s WITH (UPDLOCK, HOLDLOCK)
                )
                INSERT INTO dbo.supporters
                (
                    supporter_id,
                    supporter_type,
                    display_name,
                    organization_name,
                    first_name,
                    last_name,
                    relationship_type,
                    region,
                    country,
                    email,
                    phone,
                    status,
                    created_at,
                    first_donation_date,
                    acquisition_channel
                )
                OUTPUT inserted.supporter_id INTO @new_ids(id)
                SELECT
                    n.supporter_id,
                    {dbSupporterType},
                    {displayName},
                    {NullIfWhiteSpace(body.Organization)},
                    {string.Empty},
                    {string.Empty},
                    {string.Empty},
                    {string.Empty},
                    {string.Empty},
                    {NullIfWhiteSpace(body.Email)},
                    {NullIfWhiteSpace(body.Phone)},
                    {status},
                    {createdAt},
                    {null},
                    {string.Empty}
                FROM next_id n;

                SELECT TOP (1) id AS Value FROM @new_ids;
                """
            )
            .ToListAsync(cancellationToken);

        var insertedId = insertedIdRows.FirstOrDefault();
        return Created(
            $"/api/admin/supporters/{insertedId}",
            new { id = insertedId.ToString(CultureInfo.InvariantCulture) }
        );
    }

    /// <summary>Update a supporter row used by the Donors &amp; Contributions page.</summary>
    [HttpPut("supporters/{supporterId:int}")]
    public async Task<IActionResult> UpdateSupporter(
        int supporterId,
        [FromBody] SupporterUpsertRequest body,
        CancellationToken cancellationToken
    )
    {
        if (string.IsNullOrWhiteSpace(body.Name))
        {
            return BadRequest(new { error = "name is required." });
        }

        DateTime? createdAt = null;
        if (!string.IsNullOrWhiteSpace(body.JoinedDate))
        {
            if (!DateOnly.TryParse(body.JoinedDate, out var joined))
            {
                return BadRequest(new { error = "joined_date must be a valid yyyy-MM-dd date." });
            }
            createdAt = joined.ToDateTime(TimeOnly.MinValue);
        }

        var dbSupporterType = MapSupporterTypeForDb(body.SupporterType);
        var displayName = body.IsAnonymous ? "Anonymous Donor" : body.Name.Trim();
        var status = string.IsNullOrWhiteSpace(body.Status) ? "Active" : body.Status.Trim();

        var affected = await _db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE dbo.supporters
            SET
                supporter_type = {dbSupporterType},
                display_name = {displayName},
                organization_name = {NullIfWhiteSpace(body.Organization)},
                email = {NullIfWhiteSpace(body.Email)},
                phone = {NullIfWhiteSpace(body.Phone)},
                status = {status},
                created_at = {createdAt}
            WHERE supporter_id = {supporterId};
            """,
            cancellationToken
        );

        if (affected == 0)
        {
            return NotFound(new { error = "Supporter not found." });
        }

        return NoContent();
    }

    /// <summary>Delete a supporter row used by the Donors &amp; Contributions page.</summary>
    [HttpDelete("supporters/{supporterId:int}")]
    public async Task<IActionResult> DeleteSupporter(
        int supporterId,
        CancellationToken cancellationToken
    )
    {
        var affected = await _db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            DELETE FROM dbo.supporters
            WHERE supporter_id = {supporterId};
            """,
            cancellationToken
        );

        if (affected == 0)
        {
            return NotFound(new { error = "Supporter not found." });
        }

        return NoContent();
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

    /// <summary>
    /// Donor-level ML feature payloads used by retention and growth models.
    /// </summary>
    [HttpGet("ml/donor-features")]
    public async Task<ActionResult<IReadOnlyList<AdminDonorMlFeaturesDto>>> GetDonorMlFeatures(
        [FromQuery] int take = 5000,
        CancellationToken cancellationToken = default
    )
    {
        take = Math.Clamp(take, 1, 20_000);

        var supporters = await _db
            .Supporters.AsNoTracking()
            .OrderBy(s => s.SupporterId)
            .Take(take)
            .Select(s => new
            {
                s.SupporterId,
                s.DisplayName,
                s.OrganizationName,
                s.FirstName,
                s.LastName,
                s.CreatedAt,
                s.FirstDonationDate,
                s.SupporterType,
                s.RelationshipType,
                s.Region,
                s.AcquisitionChannel,
                s.Status,
            })
            .ToListAsync(cancellationToken);

        if (supporters.Count == 0)
        {
            return Ok(Array.Empty<AdminDonorMlFeaturesDto>());
        }

        var supporterIds = supporters.Select(s => s.SupporterId).ToArray();

        var donationStats = await _db
            .Donations.AsNoTracking()
            .Where(d => d.SupporterId.HasValue && supporterIds.Contains(d.SupporterId.Value))
            .GroupBy(d => d.SupporterId!.Value)
            .Select(g => new
            {
                SupporterId = g.Key,
                Frequency = g.Count(),
                AvgMonetaryValue = g.Average(x => (decimal?)x.Amount),
                SocialReferralCount = g.Count(x => x.ReferralPostId != null),
                IsRecurringDonor = g.Any(x => x.IsRecurring),
                LastDonationDate = g.Max(x => (DateOnly?)x.DonationDate),
                FirstDonationDate = g.Min(x => (DateOnly?)x.DonationDate),
            })
            .ToDictionaryAsync(x => x.SupporterId, cancellationToken);

        var topProgramRows = await (
            from d in _db.Donations.AsNoTracking()
            join a in _db.DonationAllocations.AsNoTracking() on d.DonationId equals a.DonationId
            where d.SupporterId.HasValue && supporterIds.Contains(d.SupporterId.Value)
            where a.ProgramArea != null && a.ProgramArea != ""
            group a by new { SupporterId = d.SupporterId!.Value, ProgramArea = a.ProgramArea! } into g
            select new
            {
                g.Key.SupporterId,
                g.Key.ProgramArea,
                Count = g.Count(),
            }
        ).ToListAsync(cancellationToken);

        var topProgramBySupporter = topProgramRows
            .GroupBy(x => x.SupporterId)
            .ToDictionary(
                g => g.Key,
                g => g
                    .OrderByDescending(x => x.Count)
                    .ThenBy(x => x.ProgramArea)
                    .Select(x => x.ProgramArea)
                    .FirstOrDefault()
            );

        var utcToday = DateOnly.FromDateTime(DateTime.UtcNow);
        var result = new List<AdminDonorMlFeaturesDto>(supporters.Count);

        foreach (var s in supporters)
        {
            donationStats.TryGetValue(s.SupporterId, out var stats);
            topProgramBySupporter.TryGetValue(s.SupporterId, out var topProgram);

            var anchorDate = s.CreatedAt.HasValue
                ? DateOnly.FromDateTime(s.CreatedAt.Value)
                : s.FirstDonationDate ?? stats?.FirstDonationDate;
            var donorTenureDays = anchorDate.HasValue
                ? Math.Max(0, utcToday.DayNumber - anchorDate.Value.DayNumber)
                : 0;
            float? recencyDays = stats?.LastDonationDate.HasValue == true
                ? Math.Max(0, utcToday.DayNumber - stats.LastDonationDate.Value.DayNumber)
                : null;

            result.Add(
                new AdminDonorMlFeaturesDto
                {
                    SupporterId = s.SupporterId.ToString(CultureInfo.InvariantCulture),
                    SupporterName = ResolveSupporterName(
                        s.DisplayName,
                        s.OrganizationName,
                        s.FirstName,
                        s.LastName,
                        s.SupporterId
                    ),
                    Frequency = stats?.Frequency ?? 0,
                    AvgMonetaryValue = stats?.AvgMonetaryValue is decimal avg ? (float)avg : null,
                    SocialReferralCount = stats?.SocialReferralCount ?? 0,
                    IsRecurringDonor = stats?.IsRecurringDonor == true ? 1 : 0,
                    TopProgramInterest = topProgram,
                    RecencyDays = recencyDays,
                    DonorTenureDays = donorTenureDays,
                    SupporterType = s.SupporterType,
                    RelationshipType = s.RelationshipType,
                    Region = s.Region,
                    AcquisitionChannel = s.AcquisitionChannel,
                    Status = s.Status,
                }
            );
        }

        return Ok(result);
    }

    /// <summary>
    /// Resident-level ML feature payloads used by girls-progress and girls-trajectory models.
    /// </summary>
    [HttpGet("ml/resident-features")]
    public async Task<ActionResult<IReadOnlyList<AdminResidentMlFeaturesDto>>> GetResidentMlFeatures(
        [FromQuery] int take = 5000,
        CancellationToken cancellationToken = default
    )
    {
        take = Math.Clamp(take, 1, 20_000);

        var rows = await _db
            .Database.SqlQuery<ResidentMlRow>(
                $"""
                WITH base_residents AS (
                    SELECT TOP ({take})
                        r.resident_id AS ResidentId,
                        ISNULL(NULLIF(LTRIM(RTRIM(r.internal_code)), ''), CAST(r.resident_id AS varchar(20))) AS ResidentCode,
                        CAST(DATEDIFF(day, r.date_of_birth, GETUTCDATE()) / 365.25 AS float) AS PresentAgeYears,
                        CAST(DATEDIFF(day, r.date_of_admission, GETUTCDATE()) / 365.25 AS float) AS LengthStayYears,
                        CAST(DATEDIFF(day, r.date_of_birth, r.date_of_admission) / 365.25 AS float) AS AgeUponAdmissionYears,
                        CAST(r.sub_cat_orphaned AS int) AS SubCatOrphaned,
                        CAST(r.sub_cat_trafficked AS int) AS SubCatTrafficked,
                        CAST(r.sub_cat_child_labor AS int) AS SubCatChildLabor,
                        CAST(r.sub_cat_physical_abuse AS int) AS SubCatPhysicalAbuse,
                        CAST(r.sub_cat_sexual_abuse AS int) AS SubCatSexualAbuse,
                        CAST(r.sub_cat_osaec AS int) AS SubCatOsaec,
                        CAST(r.sub_cat_cicl AS int) AS SubCatCicl,
                        CAST(r.sub_cat_at_risk AS int) AS SubCatAtRisk,
                        CAST(r.sub_cat_street_child AS int) AS SubCatStreetChild,
                        CAST(r.sub_cat_child_with_hiv AS int) AS SubCatChildWithHiv,
                        CAST(r.is_pwd AS int) AS IsPwd,
                        CAST(r.has_special_needs AS int) AS HasSpecialNeeds,
                        CAST(r.family_is_4ps AS int) AS FamilyIs4ps,
                        CAST(r.family_solo_parent AS int) AS FamilySoloParent,
                        CAST(r.family_indigenous AS int) AS FamilyIndigenous,
                        CAST(r.family_parent_pwd AS int) AS FamilyParentPwd,
                        CAST(r.family_informal_settler AS int) AS FamilyInformalSettler,
                        ISNULL(r.case_status, '') AS CaseStatus,
                        ISNULL(r.sex, '') AS Sex,
                        ISNULL(r.birth_status, '') AS BirthStatus,
                        ISNULL(r.case_category, '') AS CaseCategory,
                        ISNULL(r.referral_source, '') AS ReferralSource,
                        ISNULL(r.assigned_social_worker, '') AS AssignedSocialWorker,
                        ISNULL(r.reintegration_type, '') AS ReintegrationType,
                        ISNULL(r.reintegration_status, '') AS ReintegrationStatus,
                        ISNULL(r.initial_risk_level, '') AS InitialRiskLevel,
                        ISNULL(r.current_risk_level, '') AS CurrentRiskLevel,
                        ISNULL(r.pwd_type, '') AS PwdType,
                        ISNULL(r.special_needs_diagnosis, '') AS SpecialNeedsDiagnosis,
                        sh.region AS Region,
                        sh.province AS Province,
                        sh.status AS SafehouseStatus,
                        CAST(
                            CASE
                                WHEN ISNULL(sh.capacity_girls, 0) > 0
                                    THEN CAST(ISNULL(sh.current_occupancy, 0) AS float) / CAST(sh.capacity_girls AS float)
                                ELSE NULL
                            END AS float
                        ) AS OccupancyRatio,
                        CAST(DATEDIFF(day, r.date_of_admission, GETUTCDATE()) AS float) AS DaysSinceAdmission
                    FROM dbo.residents r
                    LEFT JOIN dbo.safehouses sh ON sh.safehouse_id = r.safehouse_id
                    ORDER BY r.resident_id
                ),
                hw AS (
                    SELECT
                        h.resident_id AS ResidentId,
                        CAST(AVG(CAST(h.general_health_score AS float)) AS float) AS HwMeanGeneralHealthScore,
                        CAST(AVG(CAST(h.nutrition_score AS float)) AS float) AS HwMeanNutritionScore,
                        CAST(AVG(CAST(h.sleep_quality_score AS float)) AS float) AS HwMeanSleepQualityScore,
                        CAST(AVG(CAST(h.energy_level_score AS float)) AS float) AS HwMeanEnergyLevelScore
                    FROM dbo.health_wellbeing_records h
                    GROUP BY h.resident_id
                ),
                edu_earliest AS (
                    SELECT
                        x.resident_id AS ResidentId,
                        CAST(x.progress_percent AS float) AS EduEarliestProgress,
                        CAST(x.attendance_rate AS float) AS EduEarliestAttendanceRate,
                        CAST(x.progress_percent AS float) AS CurrentProgress
                    FROM (
                        SELECT
                            er.resident_id,
                            er.progress_percent,
                            er.attendance_rate,
                            ROW_NUMBER() OVER (
                                PARTITION BY er.resident_id
                                ORDER BY er.record_date ASC, er.education_record_id ASC
                            ) AS rn
                        FROM dbo.education_records er
                    ) x
                    WHERE x.rn = 1
                ),
                edu_latest AS (
                    SELECT
                        x.resident_id AS ResidentId,
                        CAST(x.progress_percent AS float) AS CurrentProgressLatest
                    FROM (
                        SELECT
                            er.resident_id,
                            er.progress_percent,
                            ROW_NUMBER() OVER (
                                PARTITION BY er.resident_id
                                ORDER BY er.record_date DESC, er.education_record_id DESC
                            ) AS rn
                        FROM dbo.education_records er
                    ) x
                    WHERE x.rn = 1
                ),
                incidents AS (
                    SELECT
                        i.resident_id AS ResidentId,
                        CAST(COUNT(1) AS float) AS NIncidents,
                        CAST(AVG(CASE WHEN LOWER(ISNULL(i.incident_type, '')) LIKE '%high%' THEN 1.0 ELSE 0.0 END) AS float) AS IncidentHighRate,
                        CAST(AVG(CASE WHEN ISNULL(i.resolved, 0) = 0 THEN 1.0 ELSE 0.0 END) AS float) AS IncidentUnresolvedRate
                    FROM dbo.incident_reports i
                    GROUP BY i.resident_id
                ),
                visitations AS (
                    SELECT
                        hv.resident_id AS ResidentId,
                        CAST(COUNT(1) AS int) AS NHomeVisitations,
                        CAST(AVG(CASE WHEN ISNULL(hv.safety_concerns_noted, 0) = 1 THEN 1.0 ELSE 0.0 END) AS float) AS SafetyConcernRate,
                        CAST(AVG(CASE WHEN ISNULL(hv.follow_up_needed, 0) = 1 THEN 1.0 ELSE 0.0 END) AS float) AS FollowupNeededRate
                    FROM dbo.home_visitations hv
                    GROUP BY hv.resident_id
                ),
                process_sessions AS (
                    SELECT
                        pr.resident_id AS ResidentId,
                        CAST(COUNT(1) AS float) AS NProcessSessions
                    FROM dbo.process_recordings pr
                    GROUP BY pr.resident_id
                ),
                interventions AS (
                    SELECT
                        ip.resident_id AS ResidentId,
                        CAST(COUNT(1) AS int) AS NInterventionPlans
                    FROM dbo.intervention_plans ip
                    GROUP BY ip.resident_id
                )
                SELECT
                    b.ResidentId,
                    b.ResidentCode,
                    b.PresentAgeYears,
                    b.LengthStayYears,
                    b.AgeUponAdmissionYears,
                    b.SubCatOrphaned,
                    b.SubCatTrafficked,
                    b.SubCatChildLabor,
                    b.SubCatPhysicalAbuse,
                    b.SubCatSexualAbuse,
                    b.SubCatOsaec,
                    b.SubCatCicl,
                    b.SubCatAtRisk,
                    b.SubCatStreetChild,
                    b.SubCatChildWithHiv,
                    b.IsPwd,
                    b.HasSpecialNeeds,
                    b.FamilyIs4ps,
                    b.FamilySoloParent,
                    b.FamilyIndigenous,
                    b.FamilyParentPwd,
                    b.FamilyInformalSettler,
                    hw.HwMeanGeneralHealthScore,
                    hw.HwMeanNutritionScore,
                    hw.HwMeanSleepQualityScore,
                    hw.HwMeanEnergyLevelScore,
                    CAST(NULL AS float) AS HwMeanHeightCm,
                    CAST(NULL AS float) AS HwMeanWeightKg,
                    CAST(NULL AS float) AS HwMeanBmi,
                    CAST(NULL AS float) AS HwRateMedicalCheckupDone,
                    CAST(NULL AS float) AS HwRateDentalCheckupDone,
                    CAST(NULL AS float) AS HwRatePsychologicalCheckupDone,
                    iv.NInterventionPlans,
                    vs.NHomeVisitations,
                    ee.EduEarliestProgress,
                    ee.EduEarliestAttendanceRate,
                    b.CaseStatus,
                    b.Sex,
                    b.BirthStatus,
                    b.CaseCategory,
                    b.ReferralSource,
                    b.AssignedSocialWorker,
                    b.ReintegrationType,
                    b.ReintegrationStatus,
                    b.InitialRiskLevel,
                    b.CurrentRiskLevel,
                    b.PwdType,
                    b.SpecialNeedsDiagnosis,
                    CAST(NULL AS varchar(100)) AS EduEarliestEducationLevel,
                    b.Region,
                    b.Province,
                    b.SafehouseStatus,
                    ISNULL(el.CurrentProgressLatest, ee.CurrentProgress) AS CurrentProgress,
                    b.DaysSinceAdmission,
                    ic.NIncidents,
                    ic.IncidentHighRate,
                    ic.IncidentUnresolvedRate,
                    vs.SafetyConcernRate,
                    vs.FollowupNeededRate,
                    ps.NProcessSessions,
                    CAST(NULL AS float) AS ConcernsFlaggedRate,
                    CAST(NULL AS float) AS ReferralMadeRate,
                    b.OccupancyRatio,
                    CAST(NULL AS varchar(100)) AS EduEducationLevel
                FROM base_residents b
                LEFT JOIN hw ON hw.ResidentId = b.ResidentId
                LEFT JOIN edu_earliest ee ON ee.ResidentId = b.ResidentId
                LEFT JOIN edu_latest el ON el.ResidentId = b.ResidentId
                LEFT JOIN incidents ic ON ic.ResidentId = b.ResidentId
                LEFT JOIN visitations vs ON vs.ResidentId = b.ResidentId
                LEFT JOIN process_sessions ps ON ps.ResidentId = b.ResidentId
                LEFT JOIN interventions iv ON iv.ResidentId = b.ResidentId
                ORDER BY b.ResidentId
                """
            )
            .ToListAsync(cancellationToken);

        var result = rows
            .Select(r => new AdminResidentMlFeaturesDto
            {
                ResidentId = r.ResidentId.ToString(CultureInfo.InvariantCulture),
                ResidentCode = r.ResidentCode ?? string.Empty,
                PresentAgeYears = r.PresentAgeYears,
                LengthStayYears = r.LengthStayYears,
                AgeUponAdmissionYears = r.AgeUponAdmissionYears,
                SubCatOrphaned = r.SubCatOrphaned,
                SubCatTrafficked = r.SubCatTrafficked,
                SubCatChildLabor = r.SubCatChildLabor,
                SubCatPhysicalAbuse = r.SubCatPhysicalAbuse,
                SubCatSexualAbuse = r.SubCatSexualAbuse,
                SubCatOsaec = r.SubCatOsaec,
                SubCatCicl = r.SubCatCicl,
                SubCatAtRisk = r.SubCatAtRisk,
                SubCatStreetChild = r.SubCatStreetChild,
                SubCatChildWithHiv = r.SubCatChildWithHiv,
                IsPwd = r.IsPwd,
                HasSpecialNeeds = r.HasSpecialNeeds,
                FamilyIs4ps = r.FamilyIs4ps,
                FamilySoloParent = r.FamilySoloParent,
                FamilyIndigenous = r.FamilyIndigenous,
                FamilyParentPwd = r.FamilyParentPwd,
                FamilyInformalSettler = r.FamilyInformalSettler,
                HwMeanGeneralHealthScore = r.HwMeanGeneralHealthScore,
                HwMeanNutritionScore = r.HwMeanNutritionScore,
                HwMeanSleepQualityScore = r.HwMeanSleepQualityScore,
                HwMeanEnergyLevelScore = r.HwMeanEnergyLevelScore,
                HwMeanHeightCm = r.HwMeanHeightCm,
                HwMeanWeightKg = r.HwMeanWeightKg,
                HwMeanBmi = r.HwMeanBmi,
                HwRateMedicalCheckupDone = r.HwRateMedicalCheckupDone,
                HwRateDentalCheckupDone = r.HwRateDentalCheckupDone,
                HwRatePsychologicalCheckupDone = r.HwRatePsychologicalCheckupDone,
                NInterventionPlans = r.NInterventionPlans,
                NHomeVisitations = r.NHomeVisitations,
                EduEarliestProgress = r.EduEarliestProgress,
                EduEarliestAttendanceRate = r.EduEarliestAttendanceRate,
                CaseStatus = r.CaseStatus,
                Sex = r.Sex,
                BirthStatus = r.BirthStatus,
                CaseCategory = r.CaseCategory,
                ReferralSource = r.ReferralSource,
                AssignedSocialWorker = r.AssignedSocialWorker,
                ReintegrationType = r.ReintegrationType,
                ReintegrationStatus = r.ReintegrationStatus,
                InitialRiskLevel = r.InitialRiskLevel,
                CurrentRiskLevel = r.CurrentRiskLevel,
                PwdType = r.PwdType,
                SpecialNeedsDiagnosis = r.SpecialNeedsDiagnosis,
                EduEarliestEducationLevel = r.EduEarliestEducationLevel,
                Region = r.Region,
                Province = r.Province,
                Status = r.SafehouseStatus,
                CurrentProgress = r.CurrentProgress,
                DaysSinceAdmission = r.DaysSinceAdmission,
                NIncidents = r.NIncidents,
                IncidentHighRate = r.IncidentHighRate,
                IncidentUnresolvedRate = r.IncidentUnresolvedRate,
                SafetyConcernRate = r.SafetyConcernRate,
                FollowupNeededRate = r.FollowupNeededRate,
                NProcessSessions = r.NProcessSessions,
                ConcernsFlaggedRate = r.ConcernsFlaggedRate,
                ReferralMadeRate = r.ReferralMadeRate,
                OccupancyRatio = r.OccupancyRatio,
                EduEducationLevel = r.EduEducationLevel,
            })
            .ToList();

        return Ok(result);
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

    /// <summary>Create a resident row used by the caseload page.</summary>
    [HttpPost("caseload/residents")]
    public async Task<ActionResult<object>> CreateCaseloadResident(
        [FromBody] CaseloadResidentUpsertRequest body,
        CancellationToken cancellationToken
    )
    {
        var validationError = ValidateUpsert(body);
        if (validationError is not null)
        {
            return BadRequest(new { error = validationError });
        }

        if (!int.TryParse(body.SafehouseId, out var safehouseId))
        {
            return BadRequest(new { error = "safehouse_id must be a valid numeric id." });
        }

        var safehouseExists = await _db.Safehouses.AnyAsync(
            s => s.SafehouseId == safehouseId,
            cancellationToken
        );
        if (!safehouseExists)
        {
            return BadRequest(new { error = "safehouse_id does not exist." });
        }

        var normalized = NormalizeUpsert(body);
        var sub = BuildSubcategoryFlags(body.CaseSubcategories);

        var insertedIdRows = await _db
            .Database.SqlQuery<int>(
                $"""
                DECLARE @new_ids TABLE (id int);

                ;WITH next_id AS (
                    SELECT ISNULL(MAX(r.resident_id), 0) + 1 AS resident_id
                    FROM dbo.residents r WITH (UPDLOCK, HOLDLOCK)
                )
                INSERT INTO dbo.residents
                (
                    resident_id,
                    internal_code,
                    case_control_no,
                    date_of_birth,
                    sex,
                    birth_status,
                    case_status,
                    case_category,
                    sub_cat_orphaned,
                    sub_cat_trafficked,
                    sub_cat_child_labor,
                    sub_cat_physical_abuse,
                    sub_cat_sexual_abuse,
                    sub_cat_osaec,
                    sub_cat_cicl,
                    sub_cat_at_risk,
                    sub_cat_street_child,
                    sub_cat_child_with_hiv,
                    is_pwd,
                    pwd_type,
                    has_special_needs,
                    special_needs_diagnosis,
                    family_is_4ps,
                    family_solo_parent,
                    family_indigenous,
                    family_parent_pwd,
                    family_informal_settler,
                    date_of_admission,
                    safehouse_id,
                    referring_agency_person,
                    referral_source,
                    assigned_social_worker,
                    initial_case_assessment,
                    reintegration_status,
                    current_risk_level,
                    initial_risk_level,
                    date_case_study_prepared
                )
                OUTPUT inserted.resident_id INTO @new_ids(id)
                SELECT
                    n.resident_id,
                    {normalized.ResidentCode},
                    {normalized.FullName},
                    {normalized.DateOfBirth},
                    {normalized.Sex},
                    {normalized.CivilStatus},
                    {normalized.CaseStatus},
                    {normalized.CaseCategory},
                    {sub.Orphaned},
                    {sub.Trafficked},
                    {sub.ChildLabor},
                    {sub.PhysicalAbuse},
                    {sub.SexualAbuse},
                    {sub.Osaec},
                    {sub.Cicl},
                    {sub.AtRisk},
                    {sub.StreetChild},
                    {sub.ChildWithHiv},
                    {normalized.HasDisability},
                    {normalized.DisabilityType},
                    {false},
                    {string.Empty},
                    {normalized.Is4psBeneficiary},
                    {normalized.IsSoloParent},
                    {normalized.IsIndigenous},
                    {false},
                    {normalized.IsInformalSettler},
                    {normalized.AdmissionDate},
                    {safehouseId},
                    {normalized.ReferredBy},
                    {normalized.ReferralSource},
                    {normalized.AssignedSocialWorker},
                    {normalized.ReintegrationPlan},
                    {normalized.ReintegrationStatus},
                    {normalized.RiskLevel},
                    {normalized.RiskLevel},
                    {normalized.ReintegrationTargetDate}
                FROM next_id n;

                SELECT TOP (1) id AS Value FROM @new_ids;
                """
            )
            .ToListAsync(cancellationToken);

        var insertedId = insertedIdRows.FirstOrDefault();
        return Created(
            $"/api/admin/caseload/residents/{insertedId}",
            new { id = insertedId.ToString(CultureInfo.InvariantCulture) }
        );
    }

    /// <summary>Update a resident row used by the caseload page.</summary>
    [HttpPut("caseload/residents/{residentId:int}")]
    public async Task<IActionResult> UpdateCaseloadResident(
        int residentId,
        [FromBody] CaseloadResidentUpsertRequest body,
        CancellationToken cancellationToken
    )
    {
        var validationError = ValidateUpsert(body);
        if (validationError is not null)
        {
            return BadRequest(new { error = validationError });
        }

        if (!int.TryParse(body.SafehouseId, out var safehouseId))
        {
            return BadRequest(new { error = "safehouse_id must be a valid numeric id." });
        }

        var safehouseExists = await _db.Safehouses.AnyAsync(
            s => s.SafehouseId == safehouseId,
            cancellationToken
        );
        if (!safehouseExists)
        {
            return BadRequest(new { error = "safehouse_id does not exist." });
        }

        var normalized = NormalizeUpsert(body);
        var sub = BuildSubcategoryFlags(body.CaseSubcategories);

        var affected = await _db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE dbo.residents
            SET
                internal_code = {normalized.ResidentCode},
                case_control_no = {normalized.FullName},
                date_of_birth = {normalized.DateOfBirth},
                sex = {normalized.Sex},
                birth_status = {normalized.CivilStatus},
                case_status = {normalized.CaseStatus},
                case_category = {normalized.CaseCategory},
                sub_cat_orphaned = {sub.Orphaned},
                sub_cat_trafficked = {sub.Trafficked},
                sub_cat_child_labor = {sub.ChildLabor},
                sub_cat_physical_abuse = {sub.PhysicalAbuse},
                sub_cat_sexual_abuse = {sub.SexualAbuse},
                sub_cat_osaec = {sub.Osaec},
                sub_cat_cicl = {sub.Cicl},
                sub_cat_at_risk = {sub.AtRisk},
                sub_cat_street_child = {sub.StreetChild},
                sub_cat_child_with_hiv = {sub.ChildWithHiv},
                is_pwd = {normalized.HasDisability},
                pwd_type = {normalized.DisabilityType},
                family_is_4ps = {normalized.Is4psBeneficiary},
                family_solo_parent = {normalized.IsSoloParent},
                family_indigenous = {normalized.IsIndigenous},
                family_informal_settler = {normalized.IsInformalSettler},
                date_of_admission = {normalized.AdmissionDate},
                safehouse_id = {safehouseId},
                referring_agency_person = {normalized.ReferredBy},
                referral_source = {normalized.ReferralSource},
                assigned_social_worker = {normalized.AssignedSocialWorker},
                initial_case_assessment = {normalized.ReintegrationPlan},
                reintegration_status = {normalized.ReintegrationStatus},
                current_risk_level = {normalized.RiskLevel},
                initial_risk_level = {normalized.RiskLevel},
                date_case_study_prepared = {normalized.ReintegrationTargetDate}
            WHERE resident_id = {residentId};
            """,
            cancellationToken
        );

        if (affected == 0)
        {
            return NotFound(new { error = "Resident not found." });
        }

        return NoContent();
    }

    /// <summary>Delete a resident row used by the caseload page.</summary>
    [HttpDelete("caseload/residents/{residentId:int}")]
    public async Task<IActionResult> DeleteCaseloadResident(
        int residentId,
        CancellationToken cancellationToken
    )
    {
        var affected = await _db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            DELETE FROM dbo.residents
            WHERE resident_id = {residentId};
            """,
            cancellationToken
        );

        if (affected == 0)
        {
            return NotFound(new { error = "Resident not found." });
        }

        return NoContent();
    }

    private static string BuildLocation(
        string? city,
        string? region,
        string? province,
        string? country
    )
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

    private static string MapSupporterTypeForDb(string? raw)
    {
        return raw?.Trim() switch
        {
            "Monetary Donor" => "MonetaryDonor",
            "Volunteer" => "Volunteer",
            "Skills Contributor" => "SkillsContributor",
            "In-Kind Donor" => "InKindDonor",
            "Corporate Partner" => "PartnerOrganization",
            "Social Media Advocate" => "SocialMediaAdvocate",
            _ => "MonetaryDonor",
        };
    }

    private static string? ValidateUpsert(CaseloadResidentUpsertRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.FullName))
        {
            return "full_name is required.";
        }

        if (string.IsNullOrWhiteSpace(body.DateOfBirth))
        {
            return "date_of_birth is required.";
        }

        if (string.IsNullOrWhiteSpace(body.CaseStatus))
        {
            return "case_status is required.";
        }

        if (string.IsNullOrWhiteSpace(body.CaseCategory))
        {
            return "case_category is required.";
        }

        if (string.IsNullOrWhiteSpace(body.RiskLevel))
        {
            return "risk_level is required.";
        }

        if (string.IsNullOrWhiteSpace(body.AdmissionDate))
        {
            return "admission_date is required.";
        }

        if (string.IsNullOrWhiteSpace(body.SafehouseId))
        {
            return "safehouse_id is required.";
        }

        if (string.IsNullOrWhiteSpace(body.AssignedSocialWorker))
        {
            return "assigned_social_worker is required.";
        }

        if (!DateOnly.TryParse(body.DateOfBirth, out _))
        {
            return "date_of_birth must be a valid yyyy-MM-dd date.";
        }

        if (!DateOnly.TryParse(body.AdmissionDate, out _))
        {
            return "admission_date must be a valid yyyy-MM-dd date.";
        }

        if (
            !string.IsNullOrWhiteSpace(body.ReintegrationTargetDate)
            && !DateOnly.TryParse(body.ReintegrationTargetDate, out _)
        )
        {
            return "reintegration_target_date must be a valid yyyy-MM-dd date.";
        }

        return null;
    }

    private static NormalizedUpsert NormalizeUpsert(CaseloadResidentUpsertRequest body)
    {
        return new NormalizedUpsert
        {
            ResidentCode = NullIfWhiteSpace(body.ResidentCode) ?? body.FullName.Trim(),
            FullName = body.FullName.Trim(),
            DateOfBirth = DateTime.SpecifyKind(
                DateTime.Parse(body.DateOfBirth, CultureInfo.InvariantCulture),
                DateTimeKind.Utc
            ),
            Sex = NullIfWhiteSpace(body.Sex) ?? string.Empty,
            CivilStatus = NullIfWhiteSpace(body.CivilStatus) ?? string.Empty,
            CaseStatus = body.CaseStatus.Trim(),
            CaseCategory = body.CaseCategory.Trim(),
            RiskLevel = body.RiskLevel.Trim(),
            HasDisability = body.HasDisability,
            DisabilityType = body.HasDisability
                ? (NullIfWhiteSpace(body.DisabilityType) ?? string.Empty)
                : string.Empty,
            Is4psBeneficiary = body.Is4psBeneficiary,
            IsSoloParent = body.IsSoloParent,
            IsIndigenous = body.IsIndigenous,
            IsInformalSettler = body.IsInformalSettler,
            AdmissionDate = DateTime.SpecifyKind(
                DateTime.Parse(body.AdmissionDate, CultureInfo.InvariantCulture),
                DateTimeKind.Utc
            ),
            ReferredBy = NullIfWhiteSpace(body.ReferredBy) ?? string.Empty,
            ReferralSource = NullIfWhiteSpace(body.ReferralSource) ?? string.Empty,
            AssignedSocialWorker = body.AssignedSocialWorker.Trim(),
            ReintegrationPlan = NullIfWhiteSpace(body.ReintegrationPlan) ?? string.Empty,
            ReintegrationStatus = NullIfWhiteSpace(body.ReintegrationStatus) ?? string.Empty,
            ReintegrationTargetDate = ParseNullableDate(body.ReintegrationTargetDate),
        };
    }

    private static DateTime? ParseNullableDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (!DateTime.TryParse(value, out var parsed))
        {
            return null;
        }

        return DateTime.SpecifyKind(parsed.Date, DateTimeKind.Utc);
    }

    private static string? NullIfWhiteSpace(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static SubcategoryFlags BuildSubcategoryFlags(IEnumerable<string>? caseSubcategories)
    {
        var set = new HashSet<string>(
            caseSubcategories?.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim())
                ?? Enumerable.Empty<string>(),
            StringComparer.OrdinalIgnoreCase
        );

        return new SubcategoryFlags
        {
            Orphaned = set.Contains("Orphaned"),
            Trafficked = set.Contains("Trafficked"),
            ChildLabor = set.Contains("Child Labor"),
            PhysicalAbuse = set.Contains("Physical Abuse"),
            SexualAbuse = set.Contains("Sexual Abuse"),
            Osaec = set.Contains("OSAEC"),
            Cicl = set.Contains("CICL"),
            AtRisk = set.Contains("At Risk"),
            StreetChild = set.Contains("Street Child"),
            ChildWithHiv = set.Contains("Child with HIV"),
        };
    }

    private sealed class SubcategoryFlags
    {
        public bool Orphaned { get; set; }
        public bool Trafficked { get; set; }
        public bool ChildLabor { get; set; }
        public bool PhysicalAbuse { get; set; }
        public bool SexualAbuse { get; set; }
        public bool Osaec { get; set; }
        public bool Cicl { get; set; }
        public bool AtRisk { get; set; }
        public bool StreetChild { get; set; }
        public bool ChildWithHiv { get; set; }
    }

    private sealed class NormalizedUpsert
    {
        public string ResidentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string Sex { get; set; } = string.Empty;
        public string CivilStatus { get; set; } = string.Empty;
        public string CaseStatus { get; set; } = string.Empty;
        public string CaseCategory { get; set; } = string.Empty;
        public string RiskLevel { get; set; } = string.Empty;
        public bool HasDisability { get; set; }
        public string DisabilityType { get; set; } = string.Empty;
        public bool Is4psBeneficiary { get; set; }
        public bool IsSoloParent { get; set; }
        public bool IsIndigenous { get; set; }
        public bool IsInformalSettler { get; set; }
        public DateTime AdmissionDate { get; set; }
        public string ReferredBy { get; set; } = string.Empty;
        public string ReferralSource { get; set; } = string.Empty;
        public string AssignedSocialWorker { get; set; } = string.Empty;
        public string ReintegrationPlan { get; set; } = string.Empty;
        public DateTime? ReintegrationTargetDate { get; set; }
        public string ReintegrationStatus { get; set; } = string.Empty;
    }

    public sealed class CaseloadResidentUpsertRequest
    {
        [JsonPropertyName("full_name")]
        [Required]
        public string FullName { get; set; } = string.Empty;

        [JsonPropertyName("resident_code")]
        public string ResidentCode { get; set; } = string.Empty;

        [JsonPropertyName("date_of_birth")]
        [Required]
        public string DateOfBirth { get; set; } = string.Empty;

        [JsonPropertyName("sex")]
        public string Sex { get; set; } = string.Empty;

        [JsonPropertyName("civil_status")]
        public string CivilStatus { get; set; } = string.Empty;

        [JsonPropertyName("case_status")]
        [Required]
        public string CaseStatus { get; set; } = string.Empty;

        [JsonPropertyName("case_category")]
        [Required]
        public string CaseCategory { get; set; } = string.Empty;

        [JsonPropertyName("case_subcategories")]
        public List<string> CaseSubcategories { get; set; } = [];

        [JsonPropertyName("risk_level")]
        [Required]
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
        [Required]
        public string AdmissionDate { get; set; } = string.Empty;

        [JsonPropertyName("safehouse_id")]
        [Required]
        public string SafehouseId { get; set; } = string.Empty;

        [JsonPropertyName("referred_by")]
        public string ReferredBy { get; set; } = string.Empty;

        [JsonPropertyName("referral_source")]
        public string ReferralSource { get; set; } = string.Empty;

        [JsonPropertyName("assigned_social_worker")]
        [Required]
        public string AssignedSocialWorker { get; set; } = string.Empty;

        [JsonPropertyName("reintegration_plan")]
        public string ReintegrationPlan { get; set; } = string.Empty;

        [JsonPropertyName("reintegration_target_date")]
        public string ReintegrationTargetDate { get; set; } = string.Empty;

        [JsonPropertyName("reintegration_status")]
        public string ReintegrationStatus { get; set; } = string.Empty;
    }

    public sealed class SupporterUpsertRequest
    {
        [JsonPropertyName("name")]
        [Required]
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

    private sealed class ResidentRow
    {
        public string Id { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string CaseStatus { get; set; } = string.Empty;
        public string ResidentCode { get; set; } = string.Empty;
        public string RiskLevel { get; set; } = string.Empty;
    }

    private sealed class ResidentMlRow
    {
        public int ResidentId { get; set; }
        public string? ResidentCode { get; set; }
        public double? PresentAgeYears { get; set; }
        public double? LengthStayYears { get; set; }
        public double? AgeUponAdmissionYears { get; set; }
        public int? SubCatOrphaned { get; set; }
        public int? SubCatTrafficked { get; set; }
        public int? SubCatChildLabor { get; set; }
        public int? SubCatPhysicalAbuse { get; set; }
        public int? SubCatSexualAbuse { get; set; }
        public int? SubCatOsaec { get; set; }
        public int? SubCatCicl { get; set; }
        public int? SubCatAtRisk { get; set; }
        public int? SubCatStreetChild { get; set; }
        public int? SubCatChildWithHiv { get; set; }
        public int? IsPwd { get; set; }
        public int? HasSpecialNeeds { get; set; }
        public int? FamilyIs4ps { get; set; }
        public int? FamilySoloParent { get; set; }
        public int? FamilyIndigenous { get; set; }
        public int? FamilyParentPwd { get; set; }
        public int? FamilyInformalSettler { get; set; }
        public double? HwMeanGeneralHealthScore { get; set; }
        public double? HwMeanNutritionScore { get; set; }
        public double? HwMeanSleepQualityScore { get; set; }
        public double? HwMeanEnergyLevelScore { get; set; }
        public double? HwMeanHeightCm { get; set; }
        public double? HwMeanWeightKg { get; set; }
        public double? HwMeanBmi { get; set; }
        public double? HwRateMedicalCheckupDone { get; set; }
        public double? HwRateDentalCheckupDone { get; set; }
        public double? HwRatePsychologicalCheckupDone { get; set; }
        public int? NInterventionPlans { get; set; }
        public int? NHomeVisitations { get; set; }
        public double? EduEarliestProgress { get; set; }
        public double? EduEarliestAttendanceRate { get; set; }
        public string? CaseStatus { get; set; }
        public string? Sex { get; set; }
        public string? BirthStatus { get; set; }
        public string? CaseCategory { get; set; }
        public string? ReferralSource { get; set; }
        public string? AssignedSocialWorker { get; set; }
        public string? ReintegrationType { get; set; }
        public string? ReintegrationStatus { get; set; }
        public string? InitialRiskLevel { get; set; }
        public string? CurrentRiskLevel { get; set; }
        public string? PwdType { get; set; }
        public string? SpecialNeedsDiagnosis { get; set; }
        public string? EduEarliestEducationLevel { get; set; }
        public string? Region { get; set; }
        public string? Province { get; set; }
        public string? SafehouseStatus { get; set; }
        public double? CurrentProgress { get; set; }
        public double? DaysSinceAdmission { get; set; }
        public double? NIncidents { get; set; }
        public double? IncidentHighRate { get; set; }
        public double? IncidentUnresolvedRate { get; set; }
        public double? SafetyConcernRate { get; set; }
        public double? FollowupNeededRate { get; set; }
        public double? NProcessSessions { get; set; }
        public double? ConcernsFlaggedRate { get; set; }
        public double? ReferralMadeRate { get; set; }
        public double? OccupancyRatio { get; set; }
        public string? EduEducationLevel { get; set; }
    }

    private static string ResolveSupporterName(
        string? displayName,
        string? organizationName,
        string? firstName,
        string? lastName,
        int supporterId
    )
    {
        if (!string.IsNullOrWhiteSpace(displayName))
        {
            return displayName.Trim();
        }

        var fullName = $"{firstName?.Trim()} {lastName?.Trim()}".Trim();
        if (!string.IsNullOrWhiteSpace(fullName))
        {
            return fullName;
        }

        if (!string.IsNullOrWhiteSpace(organizationName))
        {
            return organizationName.Trim();
        }

        return $"Supporter {supporterId.ToString(CultureInfo.InvariantCulture)}";
    }
}
