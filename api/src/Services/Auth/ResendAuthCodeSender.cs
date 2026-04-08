using Microsoft.Extensions.Options;
using Resend;

namespace api.Services.Auth;

public class ResendAuthCodeSender(IResend resend, IOptions<AuthEmailOptions> options)
    : IAuthCodeSender
{
    private readonly IResend _resend = resend;
    private readonly AuthEmailOptions _options = options.Value;

    public async Task SendCodeAsync(
        string email,
        string code,
        string flow,
        CancellationToken cancellationToken = default
    )
    {
        var message = new EmailMessage
        {
            From = $"{_options.FromName} <{_options.FromAddress}>",
            Subject = flow == "signup" ? "Verify your Keeper email" : "Your Keeper login code",
            HtmlBody = BuildHtmlBody(code, flow),
        };

        message.To.Add(email);

        await _resend.EmailSendAsync(message, cancellationToken);
    }

    private static string BuildHtmlBody(string code, string flow)
    {
        var intro =
            flow == "signup"
                ? "Use this code to verify your email and finish creating your Keeper account."
                : "Use this code to finish signing in to Keeper.";

        return $"""
<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
  <p>{intro}</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:0.4rem;margin:24px 0">{code}</p>
  <p>This code expires soon. If you did not request it, you can ignore this email.</p>
</div>
""";
    }
}
