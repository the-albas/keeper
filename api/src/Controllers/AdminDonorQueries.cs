using System.Globalization;
using api.Data;
using api.DTOs;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

/// <summary>
/// Maps <see cref="Supporter"/> and <see cref="Donation"/> rows to Donors & Contributions UI DTOs.
/// All monetary amounts are PHP (pesos); see product docs.
/// </summary>
internal static class AdminDonorQueries
{
    internal static async Task<IReadOnlyList<AdminSupporterListDto>> ListSupportersAsync(
        AppDbContext db,
        CancellationToken cancellationToken
    )
    {
        var rows = await db
            .Supporters.AsNoTracking()
            .OrderBy(s => s.SupporterId)
            .ToListAsync(cancellationToken);

        return rows.Select(MapSupporter).ToList();
    }

    internal static async Task<IReadOnlyList<AdminContributionListDto>> ListContributionsAsync(
        AppDbContext db,
        int take,
        CancellationToken cancellationToken
    )
    {
        take = Math.Clamp(take, 1, 10_000);

        var donationRows = await db
            .Donations.AsNoTracking()
            .OrderByDescending(d => d.DonationDate)
            .ThenByDescending(d => d.DonationId)
            .Take(take)
            .ToListAsync(cancellationToken);

        if (donationRows.Count == 0)
        {
            return Array.Empty<AdminContributionListDto>();
        }

        var supporterIds = donationRows
            .Select(d => d.SupporterId)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToArray();
        var supporters = await db
            .Supporters.AsNoTracking()
            .Where(s => supporterIds.Contains(s.SupporterId))
            .ToDictionaryAsync(s => s.SupporterId, cancellationToken);

        var donationIds = donationRows.Select(d => d.DonationId).ToArray();
        var allocRows = await (
            from a in db.DonationAllocations.AsNoTracking()
            join sh in db.Safehouses.AsNoTracking() on a.SafehouseId equals sh.SafehouseId
            where donationIds.Contains(a.DonationId)
            select new
            {
                a.DonationId,
                a.AllocationId,
                SafehouseName = sh.Name,
                a.ProgramArea,
            }
        ).ToListAsync(cancellationToken);

        var firstAllocationByDonation = allocRows
            .GroupBy(x => x.DonationId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(x => x.AllocationId).First()
            );

        var list = new List<AdminContributionListDto>(donationRows.Count);
        foreach (var d in donationRows)
        {
            var supporter = d.SupporterId.HasValue
                && supporters.TryGetValue(d.SupporterId.Value, out var matched)
                ? matched
                : null;
            firstAllocationByDonation.TryGetValue(d.DonationId, out var alloc);

            list.Add(MapContribution(d, supporter, alloc?.SafehouseName, alloc?.ProgramArea));
        }

        return list;
    }

    internal static async Task<AdminDonorUiLookupsDto> GetDonorUiLookupsAsync(
        AppDbContext db,
        CancellationToken cancellationToken
    )
    {
        var safehouses = await db
            .Safehouses.AsNoTracking()
            .OrderBy(s => s.SafehouseId)
            .Select(s => new AdminLookupSafehouseDto
            {
                Id = s.SafehouseId.ToString(CultureInfo.InvariantCulture),
                Name = s.Name,
            })
            .ToListAsync(cancellationToken);

        var programs = await db
            .DonationAllocations.AsNoTracking()
            .Where(a => a.ProgramArea != null && a.ProgramArea != "")
            .Select(a => a.ProgramArea!)
            .Distinct()
            .OrderBy(p => p)
            .ToListAsync(cancellationToken);

        var campaigns = await db
            .Donations.AsNoTracking()
            .Where(d => d.CampaignName != null && d.CampaignName != "")
            .Select(d => d.CampaignName!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync(cancellationToken);

        return new AdminDonorUiLookupsDto
        {
            Safehouses = safehouses,
            Programs = programs,
            Campaigns = campaigns,
        };
    }

    private static AdminSupporterListDto MapSupporter(Supporter s)
    {
        var name = FormatSupporterDisplayName(s);
        return new AdminSupporterListDto
        {
            Id = s.SupporterId.ToString(CultureInfo.InvariantCulture),
            Name = name,
            Email = s.Email ?? string.Empty,
            Phone = s.Phone ?? string.Empty,
            SupporterType = MapSupporterTypeToUiLabel(s.SupporterType),
            Status = MapSupporterStatusToUi(s.Status),
            Organization = s.OrganizationName ?? string.Empty,
            IsAnonymous = InferAnonymous(s, name),
            JoinedDate = FormatJoinedDate(s),
            Notes = string.Empty,
        };
    }

    private static string FormatSupporterDisplayName(Supporter s)
    {
        if (!string.IsNullOrWhiteSpace(s.DisplayName))
        {
            return s.DisplayName.Trim();
        }

        var fn = s.FirstName?.Trim() ?? string.Empty;
        var ln = s.LastName?.Trim() ?? string.Empty;
        var combined = $"{fn} {ln}".Trim();
        if (combined.Length > 0)
        {
            return combined;
        }

        if (!string.IsNullOrWhiteSpace(s.OrganizationName))
        {
            return s.OrganizationName.Trim();
        }

        return $"Supporter {s.SupporterId}";
    }

    private static bool InferAnonymous(Supporter s, string displayName)
    {
        if (displayName.Contains("Anonymous", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return string.IsNullOrWhiteSpace(s.Email) && string.IsNullOrWhiteSpace(s.Phone);
    }

    private static string FormatJoinedDate(Supporter s)
    {
        if (s.CreatedAt.HasValue)
        {
            return DateOnly.FromDateTime(s.CreatedAt.Value.Date)
                .ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        if (s.FirstDonationDate.HasValue)
        {
            return s.FirstDonationDate.Value.ToString(
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture
            );
        }

        return string.Empty;
    }

    private static string MapSupporterTypeToUiLabel(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return "Monetary Donor";
        }

        return raw.Trim() switch
        {
            "MonetaryDonor" => "Monetary Donor",
            "InKindDonor" => "In-Kind Donor",
            "SocialMediaAdvocate" => "Social Media Advocate",
            "PartnerOrganization" => "Corporate Partner",
            "Volunteer" => "Volunteer",
            "SkillsContributor" => "Skills Contributor",
            _ => HumanizeToken(raw),
        };
    }

    private static string HumanizeToken(string raw)
    {
        var s = raw.Replace('_', ' ');
        if (s.Length == 0)
        {
            return "Monetary Donor";
        }

        return char.ToUpperInvariant(s[0]) + (s.Length > 1 ? s.Substring(1).ToLowerInvariant() : "");
    }

    private static string MapSupporterStatusToUi(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return "Active";
        }

        var t = status.Trim();
        if (t.Equals("Inactive", StringComparison.OrdinalIgnoreCase))
        {
            return "Inactive";
        }

        if (t.Equals("Prospect", StringComparison.OrdinalIgnoreCase))
        {
            return "Prospect";
        }

        if (t.Equals("Active", StringComparison.OrdinalIgnoreCase))
        {
            return "Active";
        }

        return HumanizeToken(t);
    }

    private static AdminContributionListDto MapContribution(
        Donation d,
        Supporter? supporter,
        string? allocationSafehouseName,
        string? allocationProgramArea
    )
    {
        var supporterName = supporter is not null
            ? FormatSupporterDisplayName(supporter)
            : d.SupporterId.HasValue
                ? $"Supporter {d.SupporterId.Value}"
                : "Guest donor";

        var uiType = MapDonationTypeToContributionUi(d.DonationType);
        var est = d.EstimatedValue ?? 0m;
        var channel = d.ChannelSource?.Trim() ?? string.Empty;
        var notes = d.Notes?.Trim() ?? string.Empty;

        var dto = new AdminContributionListDto
        {
            Id = d.DonationId.ToString(CultureInfo.InvariantCulture),
            SupporterId = d.SupporterId?.ToString(CultureInfo.InvariantCulture) ?? string.Empty,
            SupporterName = supporterName,
            ContributionType = uiType,
            Date = d.DonationDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Amount = d.Amount,
            Currency = string.IsNullOrWhiteSpace(d.CurrencyCode) ? "PHP" : d.CurrencyCode!,
            PaymentMethod = channel,
            Campaign = d.CampaignName?.Trim() ?? string.Empty,
            ItemDescription = string.Empty,
            EstimatedValue = 0,
            Hours = 0,
            SkillDescription = string.Empty,
            Platform = string.Empty,
            Reach = string.Empty,
            AllocationSafehouse = allocationSafehouseName?.Trim() ?? string.Empty,
            AllocationProgram = allocationProgramArea?.Trim() ?? string.Empty,
            ReceiptNumber = string.Empty,
            Notes = notes,
        };

        switch (uiType)
        {
            case "Monetary":
                dto.Amount = d.Amount;
                break;
            case "In-Kind":
                dto.ItemDescription = string.IsNullOrEmpty(notes) ? "In-kind gift" : notes;
                dto.EstimatedValue = est > 0 ? est : d.Amount;
                dto.Amount = 0;
                break;
            case "Time / Volunteer":
                dto.Hours = est;
                dto.SkillDescription = notes;
                dto.Amount = 0;
                break;
            case "Skills":
                dto.Hours = est;
                dto.SkillDescription = notes;
                dto.Amount = 0;
                break;
            case "Social Media":
                dto.Platform = string.IsNullOrEmpty(channel) ? "Social media" : channel;
                dto.Reach = FormatReach(est, d.ImpactUnit);
                dto.SkillDescription = notes;
                dto.Amount = 0;
                break;
            default:
                dto.Amount = d.Amount;
                break;
        }

        return dto;
    }

    private static string FormatReach(decimal estimatedValue, string? impactUnit)
    {
        var u = impactUnit?.Trim();
        if (string.IsNullOrEmpty(u))
        {
            return estimatedValue.ToString(CultureInfo.InvariantCulture);
        }

        return $"{estimatedValue.ToString(CultureInfo.InvariantCulture)} {u}".Trim();
    }

    private static string MapDonationTypeToContributionUi(string? donationType)
    {
        if (string.IsNullOrWhiteSpace(donationType))
        {
            return "Monetary";
        }

        return donationType.Trim() switch
        {
            "Monetary" => "Monetary",
            "InKind" => "In-Kind",
            "Time" => "Time / Volunteer",
            "SocialMedia" => "Social Media",
            "Skills" => "Skills",
            _ => "Monetary",
        };
    }
}
