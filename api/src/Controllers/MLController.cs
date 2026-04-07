using System.Net.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/ml")]
[Authorize(Roles = "Admin")]
public class MLController : ControllerBase
{
    private static readonly string[] SupportedModels =
    [
        "growth",
        "retention",
        "social_engagement",
        "girls_progress",
        "girls_trajectory",
    ];

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<MLController> _logger;

    public MLController(IHttpClientFactory httpClientFactory, ILogger<MLController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    /// <summary>
    /// List ML models available for retraining and the FastAPI health status.
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> Status()
    {
        var client = _httpClientFactory.CreateClient("ml-pipelines");
        try
        {
            var response = await client.GetAsync("health");
            var body = await response.Content.ReadAsStringAsync();
            return Content(body, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not reach ML pipeline service for status check.");
            return StatusCode(503, new { error = "ML pipeline service unreachable.", detail = ex.Message });
        }
    }

    /// <summary>
    /// Trigger a retrain of the specified ML model.
    /// Supported values: growth, retention, social_engagement, girls_progress, girls_trajectory.
    /// </summary>
    [HttpPost("retrain/{model}")]
    public async Task<IActionResult> Retrain(string model)
    {
        if (!SupportedModels.Contains(model, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new
            {
                error = $"Unknown model '{model}'.",
                supported = SupportedModels,
            });
        }

        _logger.LogInformation("Admin {User} triggered retrain for model '{Model}'.",
            User.Identity?.Name ?? "unknown", model);

        var client = _httpClientFactory.CreateClient("ml-pipelines");
        try
        {
            var response = await client.PostAsync($"admin/retrain/{model}", null);
            var body = await response.Content.ReadAsStringAsync();

            if (response.StatusCode == System.Net.HttpStatusCode.Conflict)
                return Conflict(new { error = "A retrain is already in progress. Try again shortly." });

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new { error = "ML pipeline retrain failed.", detail = body });

            return Content(body, "application/json");
        }
        catch (TaskCanceledException)
        {
            return StatusCode(504, new { error = "Retrain request timed out. The model may still be training." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling ML pipeline retrain for model '{Model}'.", model);
            return StatusCode(503, new { error = "ML pipeline service unreachable.", detail = ex.Message });
        }
    }
}
