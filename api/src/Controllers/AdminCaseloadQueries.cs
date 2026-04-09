using System.Globalization;
using api.Data;
using api.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace api.Controllers;

/// <summary>
/// Loads <c>dbo.residents</c> for the caseload UI. Does not expose <c>notes_restricted</c>.
/// </summary>
internal static class AdminCaseloadQueries
{
    internal static async Task<IReadOnlyList<AdminCaseloadResidentDto>> ListResidentsAsync(
        AppDbContext db,
        int take,
        ILogger logger,
        CancellationToken cancellationToken
    )
    {
        take = Math.Clamp(take, 1, 20_000);

        try
        {
            var rows = await db
                .Database.SqlQuery<ResidentCaseloadRow>(
                    $"""
                    SELECT TOP ({take})
                        r.resident_id AS ResidentId,
                        r.case_control_no AS CaseControlNo,
                        r.internal_code AS InternalCode,
                        r.safehouse_id AS SafehouseId,
                        ISNULL(sh.name, N'') AS SafehouseName,
                        r.case_status AS CaseStatus,
                        r.sex AS Sex,
                        r.date_of_birth AS DateOfBirth,
                        r.birth_status AS BirthStatus,
                        r.place_of_birth AS PlaceOfBirth,
                        r.religion AS Religion,
                        r.case_category AS CaseCategory,
                        ISNULL(r.sub_cat_orphaned, 0) AS SubCatOrphaned,
                        ISNULL(r.sub_cat_trafficked, 0) AS SubCatTrafficked,
                        ISNULL(r.sub_cat_child_labor, 0) AS SubCatChildLabor,
                        ISNULL(r.sub_cat_physical_abuse, 0) AS SubCatPhysicalAbuse,
                        ISNULL(r.sub_cat_sexual_abuse, 0) AS SubCatSexualAbuse,
                        ISNULL(r.sub_cat_osaec, 0) AS SubCatOsaec,
                        ISNULL(r.sub_cat_cicl, 0) AS SubCatCicl,
                        ISNULL(r.sub_cat_at_risk, 0) AS SubCatAtRisk,
                        ISNULL(r.sub_cat_street_child, 0) AS SubCatStreetChild,
                        ISNULL(r.sub_cat_child_with_hiv, 0) AS SubCatChildWithHiv,
                        ISNULL(r.is_pwd, 0) AS IsPwd,
                        r.pwd_type AS PwdType,
                        ISNULL(r.has_special_needs, 0) AS HasSpecialNeeds,
                        r.special_needs_diagnosis AS SpecialNeedsDiagnosis,
                        ISNULL(r.family_is_4ps, 0) AS FamilyIs4ps,
                        ISNULL(r.family_solo_parent, 0) AS FamilySoloParent,
                        ISNULL(r.family_indigenous, 0) AS FamilyIndigenous,
                        ISNULL(r.family_informal_settler, 0) AS FamilyInformalSettler,
                        r.date_of_admission AS DateOfAdmission,
                        r.referral_source AS ReferralSource,
                        r.referring_agency_person AS ReferringAgencyPerson,
                        r.assigned_social_worker AS AssignedSocialWorker,
                        r.initial_case_assessment AS InitialCaseAssessment,
                        r.reintegration_type AS ReintegrationType,
                        r.reintegration_status AS ReintegrationStatus,
                        r.initial_risk_level AS InitialRiskLevel,
                        r.current_risk_level AS CurrentRiskLevel,
                        r.date_closed AS DateClosed,
                        r.date_case_study_prepared AS DateCaseStudyPrepared
                    FROM dbo.residents r
                    LEFT JOIN dbo.safehouses sh ON sh.safehouse_id = r.safehouse_id
                    ORDER BY r.resident_id
                    """
                )
                .ToListAsync(cancellationToken);

            return rows.Select(MapRow).ToList();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed loading caseload residents from dbo.residents.");
            return Array.Empty<AdminCaseloadResidentDto>();
        }
    }

    private static AdminCaseloadResidentDto MapRow(ResidentCaseloadRow r)
    {
        var id = r.ResidentId.ToString(CultureInfo.InvariantCulture);
        var code = ResidentCode(r.InternalCode, r.CaseControlNo, r.ResidentId);
        var fullName = DisplayName(r.InternalCode, r.CaseControlNo, r.ResidentId);

        var subcats = new List<string>();
        AddIf(subcats, r.SubCatOrphaned, "Orphaned");
        AddIf(subcats, r.SubCatTrafficked, "Trafficked");
        AddIf(subcats, r.SubCatChildLabor, "Child Labor");
        AddIf(subcats, r.SubCatPhysicalAbuse, "Physical Abuse");
        AddIf(subcats, r.SubCatSexualAbuse, "Sexual Abuse");
        AddIf(subcats, r.SubCatOsaec, "OSAEC");
        AddIf(subcats, r.SubCatCicl, "CICL");
        AddIf(subcats, r.SubCatAtRisk, "At Risk");
        AddIf(subcats, r.SubCatStreetChild, "Street Child");
        AddIf(subcats, r.SubCatChildWithHiv, "Child with HIV");

        var disability = DisabilitySummary(r);

        return new AdminCaseloadResidentDto
        {
            Id = id,
            ResidentCode = code,
            FullName = fullName,
            DateOfBirth = FormatDateOnly(r.DateOfBirth),
            Sex = r.Sex?.Trim() ?? string.Empty,
            CivilStatus = r.BirthStatus?.Trim() ?? string.Empty,
            Nationality = string.Empty,
            CaseStatus = MapCaseStatusToUi(r.CaseStatus),
            CaseCategory = r.CaseCategory?.Trim() ?? string.Empty,
            CaseSubcategories = subcats,
            RiskLevel = TitleCaseRisk(r.CurrentRiskLevel ?? r.InitialRiskLevel),
            HasDisability = disability.Has,
            DisabilityType = disability.Detail,
            Is4psBeneficiary = r.FamilyIs4ps,
            IsSoloParent = r.FamilySoloParent,
            IsIndigenous = r.FamilyIndigenous,
            IsInformalSettler = r.FamilyInformalSettler,
            AdmissionDate = FormatDateOnly(r.DateOfAdmission),
            SafehouseId = r.SafehouseId?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
            SafehouseName = r.SafehouseName?.Trim() ?? string.Empty,
            ReferredBy = r.ReferringAgencyPerson?.Trim() ?? string.Empty,
            ReferralSource = r.ReferralSource?.Trim() ?? string.Empty,
            AssignedSocialWorker = r.AssignedSocialWorker?.Trim() ?? string.Empty,
            ReintegrationPlan = BuildReintegrationPlan(r),
            ReintegrationTargetDate = FormatDateOnly(r.DateCaseStudyPrepared),
            ReintegrationStatus = r.ReintegrationStatus?.Trim() ?? string.Empty,
        };
    }

    private static void AddIf(List<string> list, bool flag, string label)
    {
        if (flag)
        {
            list.Add(label);
        }
    }

    private static (bool Has, string Detail) DisabilitySummary(ResidentCaseloadRow r)
    {
        if (r.IsPwd && !string.IsNullOrWhiteSpace(r.PwdType))
        {
            return (true, r.PwdType.Trim());
        }

        if (r.HasSpecialNeeds && !string.IsNullOrWhiteSpace(r.SpecialNeedsDiagnosis))
        {
            return (true, r.SpecialNeedsDiagnosis.Trim());
        }

        return (r.IsPwd || r.HasSpecialNeeds, string.Empty);
    }

    private static string BuildReintegrationPlan(ResidentCaseloadRow r)
    {
        var assessment = r.InitialCaseAssessment?.Trim() ?? string.Empty;
        var type = r.ReintegrationType?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(type))
        {
            return assessment;
        }

        if (string.IsNullOrEmpty(assessment))
        {
            return $"Reintegration type: {type}";
        }

        return $"{assessment}\n\nReintegration type: {type}";
    }

    private static string ResidentCode(string? internalCode, string? caseControl, int residentId)
    {
        var i = internalCode?.Trim();
        if (!string.IsNullOrEmpty(i))
        {
            return i;
        }

        var c = caseControl?.Trim();
        if (!string.IsNullOrEmpty(c))
        {
            return c;
        }

        return residentId.ToString(CultureInfo.InvariantCulture);
    }

    private static string DisplayName(string? internalCode, string? caseControl, int residentId)
    {
        var i = internalCode?.Trim();
        if (!string.IsNullOrEmpty(i))
        {
            return i;
        }

        var c = caseControl?.Trim();
        if (!string.IsNullOrEmpty(c))
        {
            return c;
        }

        return $"Resident {residentId.ToString(CultureInfo.InvariantCulture)}";
    }

    private static string FormatDateOnly(DateTime? dt)
    {
        if (!dt.HasValue)
        {
            return string.Empty;
        }

        return DateOnly
            .FromDateTime(dt.Value.Date)
            .ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }

    private static string MapCaseStatusToUi(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return "Active Care";
        }

        return raw.Trim() switch
        {
            "Active" => "Active Care",
            "Closed" => "Closed",
            "Transferred" => "Transferred",
            _ => TitleCaseWords(raw.Trim()),
        };
    }

    private static string TitleCaseWords(string s)
    {
        if (string.IsNullOrEmpty(s))
        {
            return s;
        }

        return string.Join(
            " ",
            s.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Select(w =>
                    w.Length == 0
                        ? w
                        : char.ToUpperInvariant(w[0])
                            + (w.Length > 1 ? w.Substring(1).ToLowerInvariant() : "")
                )
        );
    }

    private static string TitleCaseRisk(string? raw)
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

    private sealed class ResidentCaseloadRow
    {
        public int ResidentId { get; set; }
        public string? CaseControlNo { get; set; }
        public string? InternalCode { get; set; }
        public int? SafehouseId { get; set; }
        public string? SafehouseName { get; set; }
        public string? CaseStatus { get; set; }
        public string? Sex { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? BirthStatus { get; set; }
        public string? PlaceOfBirth { get; set; }
        public string? Religion { get; set; }
        public string? CaseCategory { get; set; }
        public bool SubCatOrphaned { get; set; }
        public bool SubCatTrafficked { get; set; }
        public bool SubCatChildLabor { get; set; }
        public bool SubCatPhysicalAbuse { get; set; }
        public bool SubCatSexualAbuse { get; set; }
        public bool SubCatOsaec { get; set; }
        public bool SubCatCicl { get; set; }
        public bool SubCatAtRisk { get; set; }
        public bool SubCatStreetChild { get; set; }
        public bool SubCatChildWithHiv { get; set; }
        public bool IsPwd { get; set; }
        public string? PwdType { get; set; }
        public bool HasSpecialNeeds { get; set; }
        public string? SpecialNeedsDiagnosis { get; set; }
        public bool FamilyIs4ps { get; set; }
        public bool FamilySoloParent { get; set; }
        public bool FamilyIndigenous { get; set; }
        public bool FamilyInformalSettler { get; set; }
        public DateTime? DateOfAdmission { get; set; }
        public string? ReferralSource { get; set; }
        public string? ReferringAgencyPerson { get; set; }
        public string? AssignedSocialWorker { get; set; }
        public string? InitialCaseAssessment { get; set; }
        public string? ReintegrationType { get; set; }
        public string? ReintegrationStatus { get; set; }
        public string? InitialRiskLevel { get; set; }
        public string? CurrentRiskLevel { get; set; }
        public DateTime? DateClosed { get; set; }
        public DateTime? DateCaseStudyPrepared { get; set; }
    }
}
