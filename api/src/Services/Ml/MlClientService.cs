using System.Text.Json;

namespace api.Services.Ml;

public class MlClientService
{
    private readonly HttpClient _http;
    private readonly ILogger<MlClientService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    public MlClientService(HttpClient http, ILogger<MlClientService> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<JsonElement> GetHealthAsync(CancellationToken ct = default)
    {
        var resp = await _http.GetAsync("/health", ct);
        resp.EnsureSuccessStatusCode();
        return await JsonSerializer.DeserializeAsync<JsonElement>(
            await resp.Content.ReadAsStreamAsync(ct), JsonOptions, ct);
    }

    public async Task<JsonElement> GetFeaturesAsync(string pipeline, CancellationToken ct = default)
    {
        var resp = await _http.GetAsync($"/{pipeline}/features", ct);
        resp.EnsureSuccessStatusCode();
        return await JsonSerializer.DeserializeAsync<JsonElement>(
            await resp.Content.ReadAsStreamAsync(ct), JsonOptions, ct);
    }

    public async Task<JsonElement> PredictAsync(
        string pipeline, JsonElement body, CancellationToken ct = default)
    {
        var content = new StringContent(
            body.GetRawText(), System.Text.Encoding.UTF8, "application/json");

        var resp = await _http.PostAsync($"/{pipeline}/predict", content, ct);

        if (!resp.IsSuccessStatusCode)
        {
            var errorBody = await resp.Content.ReadAsStringAsync(ct);
            _logger.LogWarning(
                "ML service returned {StatusCode} for {Pipeline}/predict: {Body}",
                (int)resp.StatusCode, pipeline, errorBody);
            throw new MlServiceException((int)resp.StatusCode, errorBody);
        }

        return await JsonSerializer.DeserializeAsync<JsonElement>(
            await resp.Content.ReadAsStreamAsync(ct), JsonOptions, ct);
    }
}

public class MlServiceException : Exception
{
    public int StatusCode { get; }
    public string ResponseBody { get; }

    public MlServiceException(int statusCode, string responseBody)
        : base($"ML service returned {statusCode}")
    {
        StatusCode = statusCode;
        ResponseBody = responseBody;
    }
}
