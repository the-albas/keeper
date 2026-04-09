using System.Text.Json;
using api.Security;
using api.Services.Ml;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/ml")]
[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.Staff}")]
public class MlController : ControllerBase
{
    private static readonly HashSet<string> AllowedPipelines = new(StringComparer.OrdinalIgnoreCase)
    {
        "retention",
        "growth",
        "social",
        "girls-progress",
        "girls-trajectory",
    };

    private readonly MlClientService _ml;

    public MlController(MlClientService ml) => _ml = ml;

    [HttpGet("health")]
    public async Task<IActionResult> Health(CancellationToken ct)
    {
        try
        {
            var result = await _ml.GetHealthAsync(ct);
            return Ok(result);
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new { error = "ML service unreachable" });
        }
    }

    [HttpGet("{pipeline}/features")]
    public async Task<IActionResult> Features(string pipeline, CancellationToken ct)
    {
        if (!AllowedPipelines.Contains(pipeline))
            return NotFound(new { error = $"Unknown pipeline '{pipeline}'" });

        try
        {
            var result = await _ml.GetFeaturesAsync(pipeline, ct);
            return Ok(result);
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new { error = "ML service unreachable" });
        }
    }

    [HttpPost("{pipeline}/predict")]
    public async Task<IActionResult> Predict(
        string pipeline,
        [FromBody] JsonElement body,
        CancellationToken ct
    )
    {
        if (!AllowedPipelines.Contains(pipeline))
            return NotFound(new { error = $"Unknown pipeline '{pipeline}'" });

        try
        {
            var result = await _ml.PredictAsync(pipeline, body, ct);
            return Ok(result);
        }
        catch (MlServiceException ex)
        {
            return StatusCode(ex.StatusCode, ex.ResponseBody);
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new { error = "ML service unreachable" });
        }
    }

    [HttpGet("social/causal/features")]
    public async Task<IActionResult> SocialCausalFeatures(CancellationToken ct)
    {
        try
        {
            var result = await _ml.GetFeaturesAsync("social/causal", ct);
            return Ok(result);
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new { error = "ML service unreachable" });
        }
    }

    [HttpPost("social/causal/predict")]
    public async Task<IActionResult> SocialCausalPredict(
        [FromBody] JsonElement body, CancellationToken ct)
    {
        try
        {
            var result = await _ml.PredictAsync("social/causal", body, ct);
            return Ok(result);
        }
        catch (MlServiceException ex)
        {
            return StatusCode(ex.StatusCode, ex.ResponseBody);
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new { error = "ML service unreachable" });
        }
    }
}
