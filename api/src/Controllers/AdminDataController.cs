using System.Globalization;
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
    public async Task<ActionResult<IReadOnlyList<DonationRow>>> GetDonations(
        [FromQuery] int? take,
        [FromQuery] string? from,
        [FromQuery] string? to,
        CancellationToken ct
    )
    {
        try
        {
            var hasFrom = DateOnly.TryParse(
                from,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var fromDate
            );
            var hasTo = DateOnly.TryParse(
                to,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var toDate
            );
            var hasRange = hasFrom && hasTo && fromDate <= toDate;

            var topN = take is > 0 ? Math.Clamp(take.Value, 1, 500) : (int?)null;

            var rows =
                topN is int n
                    ? await _db
                        .Database.SqlQuery<DonationRow>(
                            $"""
                            SELECT TOP ({n})
                                CAST(d.donation_id AS varchar(40)) AS id,
                                ISNULL(CAST(d.supporter_id AS varchar(40)), '') AS supporter_id,
                                LTRIM(RTRIM(
                                    COALESCE(
                                        NULLIF(s.display_name, ''),
                                        NULLIF(s.organization_name, ''),
                                        NULLIF(CONCAT(ISNULL(s.first_name, ''), ' ', ISNULL(s.last_name, '')), ''),
                                        CASE
                                            WHEN d.supporter_id IS NULL THEN 'Guest donor'
                                            ELSE CONCAT('Supporter #', CAST(d.supporter_id AS varchar(20)))
                                        END
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
                        .ToListAsync(ct)
                : hasRange
                    ? await _db
                        .Database.SqlQuery<DonationRow>(
                            $"""
                            SELECT
                                CAST(d.donation_id AS varchar(40)) AS id,
                                ISNULL(CAST(d.supporter_id AS varchar(40)), '') AS supporter_id,
                                LTRIM(RTRIM(
                                    COALESCE(
                                        NULLIF(s.display_name, ''),
                                        NULLIF(s.organization_name, ''),
                                        NULLIF(CONCAT(ISNULL(s.first_name, ''), ' ', ISNULL(s.last_name, '')), ''),
                                        CASE
                                            WHEN d.supporter_id IS NULL THEN 'Guest donor'
                                            ELSE CONCAT('Supporter #', CAST(d.supporter_id AS varchar(20)))
                                        END
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
                            WHERE CAST(d.donation_date AS date) >= {fromDate}
                              AND CAST(d.donation_date AS date) <= {toDate}
                            ORDER BY d.donation_date ASC, d.donation_id ASC
                            """
                        )
                        .ToListAsync(ct)
                : await _db
                    .Database.SqlQuery<DonationRow>(
                        $"""
                        SELECT TOP 500
                            CAST(d.donation_id AS varchar(40)) AS id,
                            ISNULL(CAST(d.supporter_id AS varchar(40)), '') AS supporter_id,
                            LTRIM(RTRIM(
                                COALESCE(
                                    NULLIF(s.display_name, ''),
                                    NULLIF(s.organization_name, ''),
                                    NULLIF(CONCAT(ISNULL(s.first_name, ''), ' ', ISNULL(s.last_name, '')), ''),
                                    CASE
                                        WHEN d.supporter_id IS NULL THEN 'Guest donor'
                                        ELSE CONCAT('Supporter #', CAST(d.supporter_id AS varchar(20)))
                                    END
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

    [HttpPost("donations")]
    public async Task<IActionResult> CreateDonation(
        [FromBody] CreateDonationRequest body,
        CancellationToken ct
    )
    {
        try
        {
            int? supporterId = string.IsNullOrWhiteSpace(body.supporter_id)
                ? null
                : (int?)int.Parse(body.supporter_id, CultureInfo.InvariantCulture);

            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var newId = await _db
                .Database.SqlQuery<int>(
                    $"""SELECT ISNULL(MAX(donation_id), 0) + 1 AS [Value] FROM donations WITH (UPDLOCK, HOLDLOCK)"""
                )
                .SingleAsync(ct);

            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                INSERT INTO donations
                (donation_id, supporter_id, amount, estimated_value, donation_date,
                 donation_type, campaign_name, notes, currency_code, is_recurring, channel_source)
                VALUES
                ({newId}, {supporterId}, {body.amount}, {body.amount}, {body.donation_date},
                 {body.donation_type}, {body.campaign}, {body.notes}, 'PHP', 0, 'Manual Entry')
                """,
                ct
            );

            if (!string.IsNullOrWhiteSpace(body.allocation_program))
            {
                var allocId = await _db
                    .Database.SqlQuery<int>(
                        $"""SELECT ISNULL(MAX(allocation_id), 0) + 1 AS [Value] FROM donation_allocations WITH (UPDLOCK, HOLDLOCK)"""
                    )
                    .SingleAsync(ct);

                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"""
                    INSERT INTO donation_allocations
                    (allocation_id, donation_id, program_area, amount_allocated, allocation_date)
                    VALUES ({allocId}, {newId}, {body.allocation_program}, {body.amount}, {body.donation_date})
                    """,
                    ct
                );
            }

            await tx.CommitAsync(ct);
            return StatusCode(StatusCodes.Status201Created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create donation.");
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "Failed to save donation." }
            );
        }
    }

    [HttpPut("donations/{id:int}")]
    public async Task<IActionResult> UpdateDonation(
        [FromRoute] int id,
        [FromBody] UpdateDonationRequest body,
        CancellationToken ct
    )
    {
        try
        {
            var rowsAffected = await _db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                UPDATE donations
                SET
                    amount = {body.amount},
                    estimated_value = {body.amount},
                    donation_date = {body.donation_date},
                    donation_type = {body.donation_type},
                    campaign_name = {body.campaign},
                    notes = {body.notes}
                WHERE donation_id = {id}
                """,
                ct
            );

            if (rowsAffected == 0)
                return NotFound(new { error = "Donation not found." });

            if (!string.IsNullOrWhiteSpace(body.allocation_program))
            {
                await _db.Database.ExecuteSqlInterpolatedAsync(
                    $"""
                    IF EXISTS (SELECT 1 FROM donation_allocations WHERE donation_id = {id})
                        UPDATE donation_allocations
                        SET program_area = {body.allocation_program}, amount_allocated = {body.amount}
                        WHERE donation_id = {id}
                    ELSE
                    BEGIN
                        DECLARE @allocId INT = (SELECT ISNULL(MAX(allocation_id), 0) + 1 FROM donation_allocations)
                        INSERT INTO donation_allocations (allocation_id, donation_id, program_area, amount_allocated, allocation_date)
                        VALUES (@allocId, {id}, {body.allocation_program}, {body.amount}, CAST(GETUTCDATE() AS date))
                    END
                    """,
                    ct
                );
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update donation {Id}.", id);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "Failed to update donation." }
            );
        }
    }

    [HttpDelete("donations/{id:int}")]
    public async Task<IActionResult> DeleteDonation([FromRoute] int id, CancellationToken ct)
    {
        try
        {
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"DELETE FROM donation_allocations WHERE donation_id = {id}",
                ct
            );

            var rowsAffected = await _db.Database.ExecuteSqlInterpolatedAsync(
                $"DELETE FROM donations WHERE donation_id = {id}",
                ct
            );

            if (rowsAffected == 0)
                return NotFound(new { error = "Donation not found." });

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete donation {Id}.", id);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "Failed to delete donation." }
            );
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
                            CAST(ISNULL(pr.session_duration_minutes, 0) AS int) AS session_duration_minutes,
                            ISNULL(pr.emotional_state_observed, '') AS emotional_state_observed,
                            ISNULL(pr.emotional_state_end, '') AS emotional_state_end,
                            ISNULL(pr.session_narrative, '') AS session_narrative,
                            ISNULL(pr.interventions_applied, '') AS interventions_applied,
                            ISNULL(pr.follow_up_actions, '') AS follow_up_actions,
                            CAST(ISNULL(pr.progress_noted, 0) AS bit) AS progress_noted,
                            CAST(ISNULL(pr.concerns_flagged, 0) AS bit) AS concerns_flagged,
                            CAST(ISNULL(pr.referral_made, 0) AS bit) AS referral_made,
                            ISNULL(pr.notes_restricted, '') AS notes_restricted
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
                            CAST(ISNULL(pr.session_duration_minutes, 0) AS int) AS session_duration_minutes,
                            ISNULL(pr.emotional_state_observed, '') AS emotional_state_observed,
                            ISNULL(pr.emotional_state_end, '') AS emotional_state_end,
                            ISNULL(pr.session_narrative, '') AS session_narrative,
                            ISNULL(pr.interventions_applied, '') AS interventions_applied,
                            ISNULL(pr.follow_up_actions, '') AS follow_up_actions,
                            CAST(ISNULL(pr.progress_noted, 0) AS bit) AS progress_noted,
                            CAST(ISNULL(pr.concerns_flagged, 0) AS bit) AS concerns_flagged,
                            CAST(ISNULL(pr.referral_made, 0) AS bit) AS referral_made,
                            ISNULL(pr.notes_restricted, '') AS notes_restricted
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
            // Table uses explicit recording_id (seed import), not IDENTITY — allocate next key under lock.
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                BEGIN TRANSACTION;
                DECLARE @next_recording_id int;
                SELECT @next_recording_id = ISNULL(MAX(recording_id), 0) + 1
                FROM dbo.process_recordings WITH (UPDLOCK, HOLDLOCK);
                INSERT INTO dbo.process_recordings
                (
                   recording_id,
                   resident_id,
                   session_date,
                   social_worker,
                   session_type,
                   session_duration_minutes,
                   emotional_state_observed,
                   emotional_state_end,
                   session_narrative,
                   interventions_applied,
                   follow_up_actions,
                   progress_noted,
                   concerns_flagged,
                   referral_made,
                   notes_restricted
                )
                VALUES
                (
                   @next_recording_id,
                   {body.resident_id},
                   {body.session_date},
                   {body.social_worker},
                   {body.session_type},
                   {body.session_duration_minutes},
                   {body.emotional_state_observed},
                   {body.emotional_state_end},
                   {body.session_narrative},
                   {body.interventions_applied},
                   {body.follow_up_actions},
                   {body.progress_noted},
                   {body.concerns_flagged},
                   {body.referral_made},
                   {body.notes_restricted}
                );
                COMMIT TRANSACTION;
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

    [HttpPut("process-recordings/{id:int}")]
    public async Task<IActionResult> UpdateProcessRecording(
        [FromRoute] int id,
        [FromBody] UpdateProcessRecordingRequest body,
        CancellationToken ct
    )
    {
        try
        {
            var rowsAffected = await _db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                UPDATE process_recordings
                SET
                    session_date = {body.session_date},
                    social_worker = {body.social_worker},
                    session_type = {body.session_type},
                    session_duration_minutes = {body.session_duration_minutes},
                    emotional_state_observed = {body.emotional_state_observed},
                    emotional_state_end = {body.emotional_state_end},
                    session_narrative = {body.session_narrative},
                    interventions_applied = {body.interventions_applied},
                    follow_up_actions = {body.follow_up_actions},
                    progress_noted = {body.progress_noted},
                    concerns_flagged = {body.concerns_flagged},
                    referral_made = {body.referral_made},
                    notes_restricted = {body.notes_restricted}
                WHERE recording_id = {id}
                """,
                ct
            );

            if (rowsAffected == 0)
            {
                return NotFound(new { error = "Process recording not found." });
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update process recording {RecordingId}.", id);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "Failed to update process recording." }
            );
        }
    }

    [HttpDelete("process-recordings/{id:int}")]
    public async Task<IActionResult> DeleteProcessRecording(
        [FromRoute] int id,
        CancellationToken ct
    )
    {
        try
        {
            var rowsAffected = await _db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                DELETE FROM process_recordings
                WHERE recording_id = {id}
                """,
                ct
            );

            if (rowsAffected == 0)
            {
                return NotFound(new { error = "Process recording not found." });
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete process recording {RecordingId}.", id);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "Failed to delete process recording." }
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
                            ISNULL(hv.social_worker, '') AS social_worker,
                            ISNULL(hv.visit_type, 'Routine Follow-up') AS visit_type,
                            ISNULL(hv.location_visited, '') AS location_visited,
                            ISNULL(hv.family_members_present, '') AS family_members_present,
                            ISNULL(hv.purpose, '') AS purpose,
                            ISNULL(hv.observations, '') AS observations,
                            ISNULL(hv.family_cooperation_level, 'Cooperative') AS family_cooperation_level,
                            CAST(ISNULL(hv.safety_concerns_noted, 0) AS bit) AS safety_concerns_noted,
                            CAST(ISNULL(hv.follow_up_needed, 0) AS bit) AS follow_up_needed,
                            ISNULL(hv.follow_up_notes, '') AS follow_up_notes,
                            ISNULL(hv.visit_outcome, '') AS visit_outcome
                        FROM home_visitations hv
                        WHERE hv.resident_id = {residentId.Value}
                        ORDER BY hv.visit_date DESC, hv.visitation_id DESC
                        """
                    )
                    .ToListAsync(ct)
                : await _db
                    .Database.SqlQuery<HomeVisitationRow>(
                        $"""
                        SELECT TOP 500
                            CAST(hv.visitation_id AS int) AS id,
                            CAST(hv.resident_id AS int) AS resident_id,
                            CONVERT(varchar(10), hv.visit_date, 23) AS visit_date,
                            ISNULL(hv.social_worker, '') AS social_worker,
                            ISNULL(hv.visit_type, 'Routine Follow-up') AS visit_type,
                            ISNULL(hv.location_visited, '') AS location_visited,
                            ISNULL(hv.family_members_present, '') AS family_members_present,
                            ISNULL(hv.purpose, '') AS purpose,
                            ISNULL(hv.observations, '') AS observations,
                            ISNULL(hv.family_cooperation_level, 'Cooperative') AS family_cooperation_level,
                            CAST(ISNULL(hv.safety_concerns_noted, 0) AS bit) AS safety_concerns_noted,
                            CAST(ISNULL(hv.follow_up_needed, 0) AS bit) AS follow_up_needed,
                            ISNULL(hv.follow_up_notes, '') AS follow_up_notes,
                            ISNULL(hv.visit_outcome, '') AS visit_outcome
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
            // Same pattern as process_recordings: explicit visitation_id from seed data, not IDENTITY.
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                BEGIN TRANSACTION;
                DECLARE @next_visitation_id int;
                SELECT @next_visitation_id = ISNULL(MAX(visitation_id), 0) + 1
                FROM dbo.home_visitations WITH (UPDLOCK, HOLDLOCK);
                INSERT INTO dbo.home_visitations
                (
                   visitation_id,
                   resident_id,
                   visit_date,
                   social_worker,
                   visit_type,
                   location_visited,
                   family_members_present,
                   purpose,
                   observations,
                   family_cooperation_level,
                   safety_concerns_noted,
                   follow_up_notes,
                   follow_up_needed,
                   visit_outcome
                )
                VALUES
                (
                   @next_visitation_id,
                   {body.resident_id},
                   {body.visit_date},
                   {body.social_worker},
                   {body.visit_type},
                   {body.location_visited},
                   {body.family_members_present},
                   {body.purpose},
                   {body.observations},
                   {body.family_cooperation_level},
                   {body.safety_concerns_noted},
                   {body.follow_up_notes},
                   {body.follow_up_needed},
                   {body.visit_outcome}
                );
                COMMIT TRANSACTION;
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

    [HttpPut("home-visitations/{id:int}")]
    public async Task<IActionResult> UpdateHomeVisitation(
        [FromRoute] int id,
        [FromBody] UpdateHomeVisitationRequest body,
        CancellationToken ct
    )
    {
        try
        {
            var rowsAffected = await _db.Database.ExecuteSqlInterpolatedAsync(
                $"""
                UPDATE home_visitations
                SET
                    visit_date = {body.visit_date},
                    social_worker = {body.social_worker},
                    visit_type = {body.visit_type},
                    location_visited = {body.location_visited},
                    family_members_present = {body.family_members_present},
                    purpose = {body.purpose},
                    observations = {body.observations},
                    family_cooperation_level = {body.family_cooperation_level},
                    safety_concerns_noted = {body.safety_concerns_noted},
                    follow_up_needed = {body.follow_up_needed},
                    follow_up_notes = {body.follow_up_notes},
                    visit_outcome = {body.visit_outcome}
                WHERE visitation_id = {id}
                """,
                ct
            );

            if (rowsAffected == 0)
                return NotFound(new { error = "Home visitation not found." });

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update home visitation {Id}.", id);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "Failed to update home visitation." }
            );
        }
    }

    [HttpDelete("home-visitations/{id:int}")]
    public async Task<IActionResult> DeleteHomeVisitation([FromRoute] int id, CancellationToken ct)
    {
        try
        {
            var rowsAffected = await _db.Database.ExecuteSqlInterpolatedAsync(
                $"DELETE FROM home_visitations WHERE visitation_id = {id}",
                ct
            );

            if (rowsAffected == 0)
                return NotFound(new { error = "Home visitation not found." });

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete home visitation {Id}.", id);
            return StatusCode(
                StatusCodes.Status500InternalServerError,
                new { error = "Failed to delete home visitation." }
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
        public int session_duration_minutes { get; set; }
        public string emotional_state_observed { get; set; } = string.Empty;
        public string emotional_state_end { get; set; } = string.Empty;
        public string session_narrative { get; set; } = string.Empty;
        public string interventions_applied { get; set; } = string.Empty;
        public string follow_up_actions { get; set; } = string.Empty;
        public bool progress_noted { get; set; }
        public bool concerns_flagged { get; set; }
        public bool referral_made { get; set; }
        public string notes_restricted { get; set; } = string.Empty;
    }

    public sealed class CreateProcessRecordingRequest
    {
        public int resident_id { get; set; }
        public string session_date { get; set; } = string.Empty;
        public string social_worker { get; set; } = string.Empty;
        public string session_type { get; set; } = "individual";
        public int? session_duration_minutes { get; set; }
        public string emotional_state_observed { get; set; } = string.Empty;
        public string emotional_state_end { get; set; } = string.Empty;
        public string session_narrative { get; set; } = string.Empty;
        public string interventions_applied { get; set; } = string.Empty;
        public string follow_up_actions { get; set; } = string.Empty;
        public bool progress_noted { get; set; }
        public bool concerns_flagged { get; set; }
        public bool referral_made { get; set; }
        public string notes_restricted { get; set; } = string.Empty;
    }

    public sealed class UpdateProcessRecordingRequest
    {
        public string session_date { get; set; } = string.Empty;
        public string social_worker { get; set; } = string.Empty;
        public string session_type { get; set; } = "individual";
        public int? session_duration_minutes { get; set; }
        public string emotional_state_observed { get; set; } = string.Empty;
        public string emotional_state_end { get; set; } = string.Empty;
        public string session_narrative { get; set; } = string.Empty;
        public string interventions_applied { get; set; } = string.Empty;
        public string follow_up_actions { get; set; } = string.Empty;
        public bool progress_noted { get; set; }
        public bool concerns_flagged { get; set; }
        public bool referral_made { get; set; }
        public string notes_restricted { get; set; } = string.Empty;
    }

    public sealed class HomeVisitationRow
    {
        public int id { get; set; }
        public int resident_id { get; set; }
        public string visit_date { get; set; } = string.Empty;
        public string social_worker { get; set; } = string.Empty;
        public string visit_type { get; set; } = "Routine Follow-up";
        public string location_visited { get; set; } = string.Empty;
        public string family_members_present { get; set; } = string.Empty;
        public string purpose { get; set; } = string.Empty;
        public string observations { get; set; } = string.Empty;
        public string family_cooperation_level { get; set; } = "Cooperative";
        public bool safety_concerns_noted { get; set; }
        public bool follow_up_needed { get; set; }
        public string follow_up_notes { get; set; } = string.Empty;
        public string visit_outcome { get; set; } = string.Empty;
    }

    public sealed class CreateHomeVisitationRequest
    {
        public int resident_id { get; set; }
        public string visit_date { get; set; } = string.Empty;
        public string social_worker { get; set; } = string.Empty;
        public string visit_type { get; set; } = "Routine Follow-up";
        public string location_visited { get; set; } = string.Empty;
        public string family_members_present { get; set; } = string.Empty;
        public string purpose { get; set; } = string.Empty;
        public string observations { get; set; } = string.Empty;
        public string family_cooperation_level { get; set; } = "Cooperative";
        public bool safety_concerns_noted { get; set; }
        public bool follow_up_needed { get; set; }
        public string follow_up_notes { get; set; } = string.Empty;
        public string visit_outcome { get; set; } = string.Empty;
    }

    public sealed class UpdateHomeVisitationRequest
    {
        public string visit_date { get; set; } = string.Empty;
        public string social_worker { get; set; } = string.Empty;
        public string visit_type { get; set; } = "Routine Follow-up";
        public string location_visited { get; set; } = string.Empty;
        public string family_members_present { get; set; } = string.Empty;
        public string purpose { get; set; } = string.Empty;
        public string observations { get; set; } = string.Empty;
        public string family_cooperation_level { get; set; } = "Cooperative";
        public bool safety_concerns_noted { get; set; }
        public bool follow_up_needed { get; set; }
        public string follow_up_notes { get; set; } = string.Empty;
        public string visit_outcome { get; set; } = string.Empty;
    }

    public sealed class CreateDonationRequest
    {
        public string? supporter_id { get; set; }
        public decimal amount { get; set; }
        public string donation_date { get; set; } = string.Empty;
        public string donation_type { get; set; } = "Monetary";
        public string campaign { get; set; } = string.Empty;
        public string? allocation_program { get; set; }
        public string? notes { get; set; }
    }

    public sealed class UpdateDonationRequest
    {
        public decimal amount { get; set; }
        public string donation_date { get; set; } = string.Empty;
        public string donation_type { get; set; } = "Monetary";
        public string campaign { get; set; } = string.Empty;
        public string? allocation_program { get; set; }
        public string? notes { get; set; }
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
