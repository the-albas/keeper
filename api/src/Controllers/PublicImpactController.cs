using api.Data;
using api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/public/impact")]
public class PublicImpactController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<PublicImpactController> _logger;

    public PublicImpactController(
        AppDbContext db,
        IConfiguration config,
        ILogger<PublicImpactController> logger
    )
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpGet("girls-served")]
    public async Task<ActionResult<PublicMetricDto>> GetGirlsServed(CancellationToken ct)
    {
        var girlsFromResidents = await TryGetGirlsServedFromResidents(ct);
        if (!girlsFromResidents.HasValue)
        {
            return Problem(
                title: "Unable to load girls served",
                detail: "The residents row count query failed. Check API database connection and table availability.",
                statusCode: StatusCodes.Status500InternalServerError
            );
        }

        return Ok(
            new PublicMetricDto(
                girlsFromResidents.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)
            )
        );
    }

    [AllowAnonymous]
    [HttpGet("safehouses")]
    public async Task<ActionResult<PublicMetricDto>> GetSafehouses(CancellationToken ct)
    {
        var count = await _db.Safehouses.CountAsync(ct);
        return Ok(
            new PublicMetricDto(count.ToString(System.Globalization.CultureInfo.InvariantCulture))
        );
    }

    [AllowAnonymous]
    [HttpGet("reintegration-rate")]
    public Task<ActionResult<PublicMetricDto>> GetReintegrationRate(CancellationToken ct)
    {
        var display = _config["PublicImpact:ReintegrationRateDisplay"] ?? "87%";
        return Task.FromResult<ActionResult<PublicMetricDto>>(Ok(new PublicMetricDto(display)));
    }

    [AllowAnonymous]
    [HttpGet("money-flow")]
    public async Task<ActionResult<PublicMoneyFlowDto>> GetMoneyFlow(CancellationToken ct)
    {
        var fromDb = await TryGetMoneyFlowFromAllocations(ct);
        if (fromDb is not null)
        {
            return Ok(fromDb);
        }

        return Ok(
            new PublicMoneyFlowDto(
                ReadPct("PublicImpact:MoneyFlow:ProgramsPct", 85m),
                ReadPct("PublicImpact:MoneyFlow:OperationsPct", 10m),
                ReadPct("PublicImpact:MoneyFlow:AdministrationPct", 5m)
            )
        );
    }

    private async Task<int?> TryGetGirlsServedFromResidents(CancellationToken ct)
    {
        try
        {
            var girlsServed = await _db
                .Database.SqlQuery<int>(
                    $"""
                    SELECT COUNT(1)
                    FROM dbo.residents
                    """
                )
                .SingleAsync(ct);

            return girlsServed;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed querying girls-served from dbo.residents.");
            return null;
        }
    }

    private async Task<PublicMoneyFlowDto?> TryGetMoneyFlowFromAllocations(CancellationToken ct)
    {
        try
        {
            var allocations = await _db
                .Database.SqlQuery<MoneyFlowRow>(
                    $"""
                    SELECT
                        CAST(SUM(CASE
                            WHEN LOWER(ISNULL(program_area, '')) IN ('education', 'wellbeing', 'outreach', 'transport')
                            THEN amount_allocated
                            ELSE 0
                        END) AS decimal(18,2)) AS ProgramsAmount,
                        CAST(SUM(CASE
                            WHEN LOWER(ISNULL(program_area, '')) = 'operations'
                            THEN amount_allocated
                            ELSE 0
                        END) AS decimal(18,2)) AS OperationsAmount,
                        CAST(SUM(CASE
                            WHEN LOWER(ISNULL(program_area, '')) = 'maintenance'
                            THEN amount_allocated
                            ELSE 0
                        END) AS decimal(18,2)) AS AdministrationAmount,
                        CAST(SUM(amount_allocated) AS decimal(18,2)) AS TotalAmount
                    FROM donation_allocations
                    """
                )
                .SingleAsync(ct);

            if (allocations.TotalAmount <= 0)
            {
                return null;
            }

            var programs = Math.Round(
                (allocations.ProgramsAmount / allocations.TotalAmount) * 100m,
                1
            );
            var operations = Math.Round(
                (allocations.OperationsAmount / allocations.TotalAmount) * 100m,
                1
            );
            var administration = Math.Round(100m - programs - operations, 1);

            if (administration < 0)
            {
                administration = 0;
            }

            return new PublicMoneyFlowDto(programs, operations, administration);
        }
        catch
        {
            return null;
        }
    }

    private decimal ReadPct(string key, decimal fallback)
    {
        return decimal.TryParse(_config[key], out var value) ? value : fallback;
    }

    private sealed class MoneyFlowRow
    {
        public decimal ProgramsAmount { get; set; }
        public decimal OperationsAmount { get; set; }
        public decimal AdministrationAmount { get; set; }
        public decimal TotalAmount { get; set; }
    }
}
