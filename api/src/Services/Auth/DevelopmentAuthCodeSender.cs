using Microsoft.Extensions.Logging;

namespace api.Services.Auth;

public class DevelopmentAuthCodeSender(ILogger<DevelopmentAuthCodeSender> logger) : IAuthCodeSender
{
    private readonly ILogger<DevelopmentAuthCodeSender> _logger = logger;

    public Task SendCodeAsync(
        string email,
        string code,
        string flow,
        CancellationToken cancellationToken = default
    )
    {
        if (_logger.IsEnabled(LogLevel.Information))
        {
            _logger.LogInformation("Auth code for {Email} ({Flow}): {Code}", email, flow, code);
        }

        return Task.CompletedTask;
    }
}
