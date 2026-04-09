using api.Data;
using api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/admin-data")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Staff}")]
public class AdminDataController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<AdminDataController> _logger;

    public AdminDataController(AppDbContext db, ILogger<AdminDataController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet("supporters")]
    public async Task<ActionResult<IReadOnlyList<SupporterRow>>> GetSupporters(CancellationToken ct)
    {
        try
        {
            var rows = await _db
                .Database.SqlQuery<SupporterRow>(
                    $"""
                    SELECT TOP 500
                        CAST(s.supporter_id AS varchar(40)) AS id,
                        LTRIM(RTRIM(
                            COALESCE(
                                NULLIF(s.display_name, ''),
                                NULLIF(s.organization_name, ''),
                                NULLIF(CONCAT(ISNULL(s.first_name, ''), ' ', ISNULL(s.last_name, '')), ''),
                                CONCAT('Supporter #', CAST(s.supporter_id AS varchar(20)))
                            )
                        )) AS name,
                        ISNULL(s.email, '') AS email,
                        ISNULL(s.phone, '') AS phone,
                        CASE
                            WHEN LOWER(ISNULL(s.supporter_type, '')) IN ('monetarydonor', 'monetary donor') THEN 'Monetary Donor'
                            WHEN LOWER(ISNULL(s.supporter_type, '')) IN ('volunteer') THEN 'Volunteer'
                            WHEN LOWER(ISNULL(s.supporter_type, '')) IN ('skills contributor', 'skills') THEN 'Skills Contributor'
                            WHEN LOWER(ISNULL(s.supporter_type, '')) IN ('in-kind donor', 'inkind donor', 'in kind donor') THEN 'In-Kind Donor'
                            WHEN LOWER(ISNULL(s.supporter_type, '')) IN ('corporate partner', 'corporate') THEN 'Corporate Partner'
                            WHEN LOWER(ISNULL(s.supporter_type, '')) IN ('social media advocate', 'social media') THEN 'Social Media Advocate'
                            ELSE 'Monetary Donor'
                        END AS supporter_type,
                        CASE
                            WHEN LOWER(ISNULL(s.status, 'active')) IN ('inactive') THEN 'Inactive'
                            WHEN LOWER(ISNULL(s.status, 'active')) IN ('prospect') THEN 'Prospect'
                            ELSE 'Active'
                        END AS status,
                        ISNULL(s.organization_name, '') AS organization,
                        CAST(CASE WHEN LOWER(ISNULL(s.display_name, '')) = 'anonymous donor' THEN 1 ELSE 0 END AS bit) AS is_anonymous,
                        CONVERT(varchar(10), ISNULL(s.created_at, GETUTCDATE()), 23) AS joined_date,
                        '' AS notes
                    FROM supporters s
                    ORDER BY s.supporter_id DESC
                    """
                )
                .ToListAsync(ct);

            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load admin supporters.");
            return Ok(Array.Empty<SupporterRow>());
        }
    }

    [HttpGet("residents")]
    public async Task<ActionResult<IReadOnlyList<ResidentRow>>> GetResidents(CancellationToken ct)
    {
        try
        {
            var rows = await _db
                .Database.SqlQuery<ResidentRow>(
                    $"""
                    SELECT
                        CAST(r.resident_id AS varchar(40)) AS id,
                        ISNULL(r.case_status, 'Active') AS status,
                        ISNULL(r.case_status, '') AS case_status,
                        ISNULL(r.internal_code, CONCAT('RES-', CAST(r.resident_id AS varchar(20)))) AS resident_code,
                        ISNULL(r.current_risk_level, ISNULL(r.initial_risk_level, 'Low')) AS risk_level,
                        ISNULL(CONCAT('Resident ', CAST(r.resident_id AS varchar(20))), '') AS full_name,
                        CONVERT(varchar(10), r.date_of_birth, 23) AS date_of_birth,
                        ISNULL(r.sex, '') AS sex,
                        ISNULL(r.case_category, '') AS case_category,
                        ISNULL(CAST(r.safehouse_id AS varchar(40)), '') AS safehouse_id,
                        ISNULL(sh.name, '') AS safehouse_name,
                        ISNULL(r.assigned_social_worker, '') AS assigned_social_worker,
                        CONVERT(varchar(10), r.date_of_admission, 23) AS admission_date
                    FROM residents r
                    LEFT JOIN safehouses sh ON sh.safehouse_id = r.safehouse_id
                    ORDER BY r.resident_id DESC
                    """
                )
                .ToListAsync(ct);

            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load admin residents.");
            return Ok(Array.Empty<ResidentRow>());
        }
    }

    [HttpGet("donations")]
    public async Task<ActionResult<IReadOnlyList<DonationRow>>> GetDonations(CancellationToken ct)
    {
        try
        {
            var rows = await _db
                .Database.SqlQuery<DonationRow>(
                    $"""
                    SELECT TOP 500
                        CAST(d.donation_id AS varchar(40)) AS id,
                        CAST(d.supporter_id AS varchar(40)) AS supporter_id,
                        LTRIM(RTRIM(
                            COALESCE(
                                NULLIF(s.display_name, ''),
                                NULLIF(s.organization_name, ''),
                                NULLIF(CONCAT(ISNULL(s.first_name, ''), ' ', ISNULL(s.last_name, '')), ''),
                                CONCAT('Supporter #', CAST(d.supporter_id AS varchar(20)))
                            )
                        )) AS supporter_name,
                        CAST(d.amount AS decimal(18,2)) AS amount,
                        CONVERT(varchar(10), d.donation_date, 23) AS created_date,
                        d.donation_type AS type,
                        d.campaign_name AS campaign,
                        (
                           SELECT TOP 1 da.program_area
                           FROM donation_allocations da
                           WHERE da.donation_id = d.donation_id
                           ORDER BY da.allocation_id ASC
                        ) AS allocation
                    FROM donations d
                    LEFT JOIN supporters s ON s.supporter_id = d.supporter_id
                    ORDER BY d.donation_date DESC, d.donation_id DESC
                    """
                )
                .ToListAsync(ct);

            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load admin donations.");
            return Ok(Array.Empty<DonationRow>());
        }
    }

    [HttpGet("safehouses")]
    public async Task<ActionResult<IReadOnlyList<SafehouseRow>>> GetSafehouses(CancellationToken ct)
    {
        try
        {
            var rows = await _db
                .Database.SqlQuery<SafehouseRow>(
                    $"""
                    SELECT
                        CAST(safehouse_id AS varchar(40)) AS id,
                        ISNULL(name, CONCAT('Safehouse ', CAST(safehouse_id AS varchar(20)))) AS name,
                        LTRIM(RTRIM(CONCAT(ISNULL(city, ''), CASE WHEN city IS NOT NULL AND province IS NOT NULL THEN ', ' ELSE '' END, ISNULL(province, '')))) AS location,
                        ISNULL(status, 'Active') AS status,
                        ISNULL(capacity_girls, 0) AS capacity,
                        ISNULL(current_occupancy, 0) AS current_occupancy
                    FROM safehouses
                    ORDER BY safehouse_id ASC
                    """
                )
                .ToListAsync(ct);

            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load admin safehouses.");
            return Ok(Array.Empty<SafehouseRow>());
        }
    }

    [HttpGet("activities")]
    public async Task<ActionResult<IReadOnlyList<ActivityRow>>> GetActivities(CancellationToken ct)
    {
        try
        {
            var rows = await _db
                .Database.SqlQuery<ActivityRow>(
                    $"""
                    SELECT TOP 80
                        CAST(a.id AS varchar(60)) AS id,
                        a.type,
                        a.description,
                        a.created_date,
                        a.performed_by
                    FROM (
                        SELECT
                            CONCAT('donation-', d.donation_id) AS id,
                            'Donation' AS type,
                            CONCAT('Donation received: $', FORMAT(d.amount, 'N0')) AS description,
                            CONVERT(varchar(10), d.donation_date, 23) AS created_date,
                            'Website' AS performed_by
                        FROM donations d
                        UNION ALL
                        SELECT
                            CONCAT('visit-', hv.visitation_id) AS id,
                            'HomeVisit' AS type,
                            CONCAT('Home visit by ', ISNULL(hv.social_worker, 'staff')) AS description,
                            CONVERT(varchar(10), hv.visit_date, 23) AS created_date,
                            hv.social_worker AS performed_by
                        FROM home_visitations hv
                        UNION ALL
                        SELECT
                            CONCAT('incident-', ir.incident_id) AS id,
                            'Incident' AS type,
                            CONCAT('Incident reported: ', ISNULL(ir.incident_type, 'General')) AS description,
                            CONVERT(varchar(10), ir.incident_date, 23) AS created_date,
                            ir.reported_by AS performed_by
                        FROM incident_reports ir
                        UNION ALL
                        SELECT
                            CONCAT('recording-', pr.recording_id) AS id,
                            'Counseling' AS type,
                            CONCAT('Session logged by ', ISNULL(pr.social_worker, 'staff')) AS description,
                            CONVERT(varchar(10), pr.session_date, 23) AS created_date,
                            pr.social_worker AS performed_by
                        FROM process_recordings pr
                    ) a
                    ORDER BY a.created_date DESC, a.id DESC
                    """
                )
                .ToListAsync(ct);

            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load admin activities.");
            return Ok(Array.Empty<ActivityRow>());
        }
    }

    [HttpGet("process-recordings")]
    public async Task<ActionResult<IReadOnlyList<ProcessRecordingRow>>> GetProcessRecordings(
        [FromQuery] int? residentId,
        CancellationToken ct
    )
    {
        try
        {
            var rows = residentId.HasValue
                ? await _db
                    .Database.SqlQuery<ProcessRecordingRow>(
                        $"""
                        SELECT
                            CAST(pr.recording_id AS int) AS id,
                            CAST(pr.resident_id AS int) AS resident_id,
                            CONVERT(varchar(10), pr.session_date, 23) AS session_date,
                            ISNULL(pr.social_worker, '') AS social_worker,
                            CASE
                                WHEN LOWER(ISNULL(pr.session_type, '')) = 'group' THEN 'group'
                                ELSE 'individual'
                            END AS session_type,
                            ISNULL(pr.emotional_state_observed, '') AS emotional_state,
                            ISNULL(pr.session_narrative, '') AS narrative_summary,
                            ISNULL(pr.interventions_applied, '') AS interventions,
                            ISNULL(pr.follow_up_actions, '') AS follow_up_actions
                        FROM process_recordings pr
                        WHERE pr.resident_id = {residentId.Value}
                        ORDER BY pr.session_date DESC, pr.recording_id DESC
                        """
                    )
                    .ToListAsync(ct)
                : await _db
                    .Database.SqlQuery<ProcessRecordingRow>(
                        $"""
                        SELECT
                            CAST(pr.recording_id AS int) AS id,
                            CAST(pr.resident_id AS int) AS resident_id,
                            CONVERT(varchar(10), pr.session_date, 23) AS session_date,
                            ISNULL(pr.social_worker, '') AS social_worker,
                            CASE
                                WHEN LOWER(ISNULL(pr.session_type, '')) = 'group' THEN 'group'
                                ELSE 'individual'
                            END AS session_type,
                            ISNULL(pr.emotional_state_observed, '') AS emotional_state,
                            ISNULL(pr.session_narrative, '') AS narrative_summary,
                            ISNULL(pr.interventions_applied, '') AS interventions,
                            ISNULL(pr.follow_up_actions, '') AS follow_up_actions
                        FROM process_recordings pr
                        ORDER BY pr.session_date DESC, pr.recording_id DESC
                        """
                    )
                    .ToListAsync(ct);

            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load process recordings.");
            return Ok(Array.Empty<ProcessRecordingRow>());
        }
    }

    [HttpPost("process-recordings")]
    public async Task<IActionResult> CreateProcessRecording(
        [FromBody] CreateProcessRecordingRequest body,
        CancellationToken ct
    )
    {
        try
        {
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                INSERT INTO process_recordings
                (
                   resident_id,
                   session_date,
                   social_worker,
                   session_type,
                   emotional_state_observed,
                   session_narrative,
                   interventions_applied,
                   follow_up_actions
                )
                VALUES
                (
                   {body.resident_id},
                   {body.session_date},
                   {body.social_worker},
                   {body.session_type},
                   {body.emotional_state},
                   {body.narrative_summary},
                   {body.interventions},
                   {body.follow_up_actions}
                )
                """,
                ct
            );

            return StatusCode(StatusCodes.Status201Created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create process recording.");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "Failed to save process recording." }
            );
        }
    }

    [HttpGet("home-visitations")]
    public async Task<ActionResult<IReadOnlyList<HomeVisitationRow>>> GetHomeVisitations(
        [FromQuery] int? residentId,
        CancellationToken ct
    )
    {
        try
        {
            var rows = residentId.HasValue
                ? await _db
                    .Database.SqlQuery<HomeVisitationRow>(
                        $"""
                        SELECT
                            CAST(hv.visitation_id AS int) AS id,
                            CAST(hv.resident_id AS int) AS resident_id,
                            CONVERT(varchar(10), hv.visit_date, 23) AS visit_date,
                            ISNULL(hv.social_worker, '') AS staff_name,
                            ISNULL(hv.visit_type, 'Routine Follow-up') AS visit_type,
                            ISNULL(hv.observations, '') AS home_environment_observations,
                            ISNULL(hv.family_cooperation_level, 'Cooperative') AS family_cooperation,
                            CASE
                                WHEN hv.safety_concerns_noted = 1 THEN ISNULL(hv.visit_outcome, 'Safety concerns noted.')
                                ELSE ''
                            END AS safety_concerns,
                            ISNULL(hv.follow_up_notes, '') AS follow_up_actions
                        FROM home_visitations hv
                        WHERE hv.resident_id = {residentId.Value}
                        ORDER BY hv.visit_date DESC, hv.visitation_id DESC
                        """
                    )
                    .ToListAsync(ct)
                : await _db
                    .Database.SqlQuery<HomeVisitationRow>(
                        $"""
                        SELECT
                            CAST(hv.visitation_id AS int) AS id,
                            CAST(hv.resident_id AS int) AS resident_id,
                            CONVERT(varchar(10), hv.visit_date, 23) AS visit_date,
                            ISNULL(hv.social_worker, '') AS staff_name,
                            ISNULL(hv.visit_type, 'Routine Follow-up') AS visit_type,
                            ISNULL(hv.observations, '') AS home_environment_observations,
                            ISNULL(hv.family_cooperation_level, 'Cooperative') AS family_cooperation,
                            CASE
                                WHEN hv.safety_concerns_noted = 1 THEN ISNULL(hv.visit_outcome, 'Safety concerns noted.')
                                ELSE ''
                            END AS safety_concerns,
                            ISNULL(hv.follow_up_notes, '') AS follow_up_actions
                        FROM home_visitations hv
                        ORDER BY hv.visit_date DESC, hv.visitation_id DESC
                        """
                    )
                    .ToListAsync(ct);

            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load home visitations.");
            return Ok(Array.Empty<HomeVisitationRow>());
        }
    }

    [HttpPost("home-visitations")]
    public async Task<IActionResult> CreateHomeVisitation(
        [FromBody] CreateHomeVisitationRequest body,
        CancellationToken ct
    )
    {
        try
        {
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                INSERT INTO home_visitations
                (
                   resident_id,
                   visit_date,
                   social_worker,
                   visit_type,
                   observations,
                   family_cooperation_level,
                   safety_concerns_noted,
                   follow_up_notes,
                   follow_up_needed,
                   visit_outcome
                )
                VALUES
                (
                   {body.resident_id},
                   {body.visit_date},
                   {body.staff_name},
                   {body.visit_type},
                   {body.home_environment_observations},
                   {body.family_cooperation},
                   {(!string.IsNullOrWhiteSpace(body.safety_concerns))},
                   {body.follow_up_actions},
                   {true},
                   {body.safety_concerns}
                )
                """,
                ct
            );

            return StatusCode(StatusCodes.Status201Created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create home visitation.");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "Failed to save home visitation." }
            );
        }
    }

    [HttpGet("reports-summary")]
    public async Task<ActionResult<ReportsSummaryResponse>> GetReportsSummary(
        [FromQuery] int year,
        CancellationToken ct
    )
    {
        try
        {
            var donationTrend = await _db
                .Database.SqlQuery<MonthAmountRow>(
                    $"""
                    SELECT
                       LEFT(DATENAME(MONTH, DATEFROMPARTS({year}, MONTH(d.donation_date), 1)), 3) AS month,
                       CAST(SUM(ISNULL(d.amount, 0)) AS decimal(18,2)) AS amount,
                       MONTH(d.donation_date) AS month_no
                    FROM donations d
                    WHERE YEAR(d.donation_date) = {year}
                    GROUP BY MONTH(d.donation_date)
                    ORDER BY month_no
                    """
                )
                .ToListAsync(ct);

            var safehousePerformance = await _db
                .Database.SqlQuery<SafehousePerformanceRow>(
                    $"""
                    SELECT
                       sh.name AS name,
                       CAST(SUM(CASE WHEN YEAR(r.date_of_admission) = {year} THEN 1 ELSE 0 END) AS int) AS admitted,
                       CAST(SUM(CASE WHEN r.case_status IN ('Active', 'Active Care', 'Assessment', 'Intake') THEN 1 ELSE 0 END) AS int) AS active,
                       CAST(SUM(CASE WHEN r.case_status IN ('Graduated', 'Closed') THEN 1 ELSE 0 END) AS int) AS graduated
                    FROM safehouses sh
                    LEFT JOIN residents r ON r.safehouse_id = sh.safehouse_id
                    GROUP BY sh.name
                    ORDER BY sh.name
                    """
                )
                .ToListAsync(ct);

            var reintegrationOutcomes = await _db
                .Database.SqlQuery<LabelValueRow>(
                    $"""
                    SELECT
                       COALESCE(NULLIF(r.reintegration_type, ''), 'Other') AS label,
                       CAST(COUNT(1) AS int) AS value
                    FROM residents r
                    WHERE YEAR(ISNULL(r.date_closed, r.date_of_admission)) = {year}
                      AND LOWER(ISNULL(r.reintegration_status, '')) = 'completed'
                    GROUP BY COALESCE(NULLIF(r.reintegration_type, ''), 'Other')
                    ORDER BY value DESC
                    """
                )
                .ToListAsync(ct);

            var servicesByQuarter = await _db
                .Database.SqlQuery<ServicesByQuarterRow>(
                    $"""
                    WITH q AS (
                       SELECT 1 AS q UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                    ),
                    caring AS (
                       SELECT DATEPART(QUARTER, hv.visit_date) AS q, COUNT(1) AS v
                       FROM home_visitations hv
                       WHERE YEAR(hv.visit_date) = {year}
                       GROUP BY DATEPART(QUARTER, hv.visit_date)
                    ),
                    healing AS (
                       SELECT DATEPART(QUARTER, pr.session_date) AS q, COUNT(1) AS v
                       FROM process_recordings pr
                       WHERE YEAR(pr.session_date) = {year}
                       GROUP BY DATEPART(QUARTER, pr.session_date)
                    ),
                    teaching AS (
                       SELECT DATEPART(QUARTER, COALESCE(ip.case_conference_date, CAST(ip.created_at AS date))) AS q, COUNT(1) AS v
                       FROM intervention_plans ip
                       WHERE YEAR(COALESCE(ip.case_conference_date, CAST(ip.created_at AS date))) = {year}
                       GROUP BY DATEPART(QUARTER, COALESCE(ip.case_conference_date, CAST(ip.created_at AS date)))
                    )
                    SELECT
                       CONCAT('Q', q.q) AS quarter,
                       CAST(ISNULL(caring.v, 0) AS int) AS caring,
                       CAST(ISNULL(healing.v, 0) AS int) AS healing,
                       CAST(ISNULL(teaching.v, 0) AS int) AS teaching
                    FROM q
                    LEFT JOIN caring ON caring.q = q.q
                    LEFT JOIN healing ON healing.q = q.q
                    LEFT JOIN teaching ON teaching.q = q.q
                    ORDER BY q.q
                    """
                )
                .ToListAsync(ct);

            var caseCategories = await _db
                .Database.SqlQuery<LabelValueRow>(
                    $"""
                    SELECT
                       COALESCE(NULLIF(r.case_category, ''), 'Unknown') AS label,
                       CAST(COUNT(1) AS int) AS value
                    FROM residents r
                    WHERE YEAR(r.date_of_admission) = {year}
                    GROUP BY COALESCE(NULLIF(r.case_category, ''), 'Unknown')
                    ORDER BY value DESC
                    """
                )
                .ToListAsync(ct);

            var indicators = await _db
                .Database.SqlQuery<IndicatorRow>(
                    $"""
                    SELECT 'Psychosocial Wellbeing' AS label,
                           CAST(ROUND(COALESCE(AVG(CAST(hw.general_health_score AS float)) * 20.0, 0), 0) AS int) AS pct
                    FROM health_wellbeing_records hw
                    WHERE YEAR(hw.record_date) = {year}
                    UNION ALL
                    SELECT 'Educational Continuity' AS label,
                           CAST(ROUND(COALESCE(AVG(CAST(er.attendance_rate AS float)) * 100.0, 0), 0) AS int) AS pct
                    FROM education_records er
                    WHERE YEAR(er.record_date) = {year}
                    UNION ALL
                    SELECT 'Livelihood Readiness' AS label,
                           CAST(ROUND(
                             CASE WHEN COUNT(1) = 0 THEN 0
                             ELSE 100.0 * SUM(CASE WHEN r.case_status IN ('Reintegration', 'Graduated', 'Closed') THEN 1 ELSE 0 END) / COUNT(1)
                             END, 0) AS int) AS pct
                    FROM residents r
                    WHERE YEAR(r.date_of_admission) = {year}
                    UNION ALL
                    SELECT 'Family Reintegration Readiness' AS label,
                           CAST(ROUND(
                             CASE WHEN COUNT(1) = 0 THEN 0
                             ELSE 100.0 * SUM(CASE WHEN r.reintegration_status IN ('In Progress', 'Completed') THEN 1 ELSE 0 END) / COUNT(1)
                             END, 0) AS int) AS pct
                    FROM residents r
                    WHERE YEAR(r.date_of_admission) = {year}
                    UNION ALL
                    SELECT 'Legal Matters Resolved' AS label,
                           CAST(ROUND(
                             CASE WHEN COUNT(1) = 0 THEN 0
                             ELSE 100.0 * SUM(CASE WHEN ir.resolved = 1 THEN 1 ELSE 0 END) / COUNT(1)
                             END, 0) AS int) AS pct
                    FROM incident_reports ir
                    WHERE YEAR(ir.incident_date) = {year}
                    """
                )
                .ToListAsync(ct);

            return Ok(
                new ReportsSummaryResponse
                {
                    donationTrend = donationTrend
                        .Select(d => new MonthAmount { month = d.month, amount = d.amount })
                        .ToArray(),
                    safehousePerformance = safehousePerformance.ToArray(),
                    reintegrationOutcomes = reintegrationOutcomes
                        .Select(r => new LabelValue { label = r.label, value = r.value })
                        .ToArray(),
                    servicesByQuarter = servicesByQuarter.ToArray(),
                    caseCategories = caseCategories
                        .Select(c => new LabelValue { label = c.label, value = c.value })
                        .ToArray(),
                    outcomeIndicators = indicators.ToArray(),
                }
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load reports summary for year {Year}.", year);
            return Ok(new ReportsSummaryResponse());
        }
    }

#pragma warning disable CA1707 // DTO members intentionally use snake_case to match API payloads/SQL aliases.
    public sealed class ResidentRow
    {
        public string id { get; set; } = string.Empty;
        public string status { get; set; } = string.Empty;
        public string case_status { get; set; } = string.Empty;
        public string resident_code { get; set; } = string.Empty;
        public string risk_level { get; set; } = "Low";
        public string full_name { get; set; } = string.Empty;
        public string date_of_birth { get; set; } = string.Empty;
        public string sex { get; set; } = string.Empty;
        public string case_category { get; set; } = string.Empty;
        public string safehouse_id { get; set; } = string.Empty;
        public string safehouse_name { get; set; } = string.Empty;
        public string assigned_social_worker { get; set; } = string.Empty;
        public string admission_date { get; set; } = string.Empty;
    }

    public sealed class DonationRow
    {
        public string id { get; set; } = string.Empty;
        public string supporter_id { get; set; } = string.Empty;
        public string supporter_name { get; set; } = string.Empty;
        public decimal amount { get; set; }
        public string created_date { get; set; } = string.Empty;
        public string? type { get; set; }
        public string? campaign { get; set; }
        public string? allocation { get; set; }
    }

    public sealed class SupporterRow
    {
        public string id { get; set; } = string.Empty;
        public string name { get; set; } = string.Empty;
        public string email { get; set; } = string.Empty;
        public string phone { get; set; } = string.Empty;
        public string supporter_type { get; set; } = "Monetary Donor";
        public string status { get; set; } = "Active";
        public string organization { get; set; } = string.Empty;
        public bool is_anonymous { get; set; }
        public string joined_date { get; set; } = string.Empty;
        public string notes { get; set; } = string.Empty;
    }

    public sealed class SafehouseRow
    {
        public string id { get; set; } = string.Empty;
        public string name { get; set; } = string.Empty;
        public string location { get; set; } = string.Empty;
        public string status { get; set; } = string.Empty;
        public int capacity { get; set; }
        public int current_occupancy { get; set; }
    }

    public sealed class ActivityRow
    {
        public string id { get; set; } = string.Empty;
        public string type { get; set; } = string.Empty;
        public string description { get; set; } = string.Empty;
        public string created_date { get; set; } = string.Empty;
        public string? performed_by { get; set; }
    }

    public sealed class ProcessRecordingRow
    {
        public int id { get; set; }
        public int resident_id { get; set; }
        public string session_date { get; set; } = string.Empty;
        public string social_worker { get; set; } = string.Empty;
        public string session_type { get; set; } = "individual";
        public string emotional_state { get; set; } = string.Empty;
        public string narrative_summary { get; set; } = string.Empty;
        public string interventions { get; set; } = string.Empty;
        public string follow_up_actions { get; set; } = string.Empty;
    }

    public sealed class CreateProcessRecordingRequest
    {
        public int resident_id { get; set; }
        public string session_date { get; set; } = string.Empty;
        public string social_worker { get; set; } = string.Empty;
        public string session_type { get; set; } = "individual";
        public string emotional_state { get; set; } = string.Empty;
        public string narrative_summary { get; set; } = string.Empty;
        public string interventions { get; set; } = string.Empty;
        public string follow_up_actions { get; set; } = string.Empty;
    }

    public sealed class HomeVisitationRow
    {
        public int id { get; set; }
        public int resident_id { get; set; }
        public string visit_date { get; set; } = string.Empty;
        public string staff_name { get; set; } = string.Empty;
        public string visit_type { get; set; } = "Routine Follow-up";
        public string home_environment_observations { get; set; } = string.Empty;
        public string family_cooperation { get; set; } = "Cooperative";
        public string safety_concerns { get; set; } = string.Empty;
        public string follow_up_actions { get; set; } = string.Empty;
    }

    public sealed class CreateHomeVisitationRequest
    {
        public int resident_id { get; set; }
        public string visit_date { get; set; } = string.Empty;
        public string staff_name { get; set; } = string.Empty;
        public string visit_type { get; set; } = "Routine Follow-up";
        public string home_environment_observations { get; set; } = string.Empty;
        public string family_cooperation { get; set; } = "Cooperative";
        public string safety_concerns { get; set; } = string.Empty;
        public string follow_up_actions { get; set; } = string.Empty;
    }

    public sealed class ReportsSummaryResponse
    {
        public MonthAmount[] donationTrend { get; set; } = [];
        public SafehousePerformanceRow[] safehousePerformance { get; set; } = [];
        public LabelValue[] reintegrationOutcomes { get; set; } = [];
        public ServicesByQuarterRow[] servicesByQuarter { get; set; } = [];
        public LabelValue[] caseCategories { get; set; } = [];
        public IndicatorRow[] outcomeIndicators { get; set; } = [];
    }

    public class MonthAmount
    {
        public string month { get; set; } = string.Empty;
        public decimal amount { get; set; }
    }

    private sealed class MonthAmountRow : MonthAmount
    {
        public int month_no { get; set; }
    }

    public sealed class SafehousePerformanceRow
    {
        public string name { get; set; } = string.Empty;
        public int admitted { get; set; }
        public int active { get; set; }
        public int graduated { get; set; }
    }

    public class LabelValue
    {
        public string label { get; set; } = string.Empty;
        public int value { get; set; }
    }

    private sealed class LabelValueRow : LabelValue { }

    public sealed class ServicesByQuarterRow
    {
        public string quarter { get; set; } = string.Empty;
        public int caring { get; set; }
        public int healing { get; set; }
        public int teaching { get; set; }
    }

    public sealed class IndicatorRow
    {
        public string label { get; set; } = string.Empty;
        public int pct { get; set; }
    }
#pragma warning restore CA1707
}
