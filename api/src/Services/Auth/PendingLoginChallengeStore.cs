using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;

namespace api.Services.Auth;

/// <summary>
/// Persists pending email-2FA login across requests when the SPA and API are on different
/// origins and Identity's intermediate 2FA cookie is not reliably stored by the browser.
/// </summary>
public class PendingLoginChallengeStore(IDataProtectionProvider dataProtectionProvider)
{
    private const string CookieName = "keeper.pending-login";
    private readonly IDataProtector _protector = dataProtectionProvider.CreateProtector("keeper.pending-login");

    public void Write(HttpResponse response, string userId, string email, bool isDevelopment)
    {
        var payload = JsonSerializer.Serialize(new PendingLoginChallenge(userId, email));
        var protectedPayload = _protector.Protect(payload);

        response.Cookies.Append(CookieName, protectedPayload, BuildCookieOptions(isDevelopment));
    }

    public PendingLoginChallenge? Read(HttpRequest request)
    {
        if (!request.Cookies.TryGetValue(CookieName, out var protectedPayload) || string.IsNullOrWhiteSpace(protectedPayload))
        {
            return null;
        }

        try
        {
            var payload = _protector.Unprotect(protectedPayload);
            return JsonSerializer.Deserialize<PendingLoginChallenge>(payload);
        }
        catch
        {
            return null;
        }
    }

    public void Clear(HttpResponse response, bool isDevelopment)
    {
        response.Cookies.Delete(CookieName, BuildCookieOptions(isDevelopment));
    }

    private static CookieOptions BuildCookieOptions(bool isDevelopment) => new()
    {
        HttpOnly = true,
        IsEssential = true,
        SameSite = isDevelopment ? SameSiteMode.Lax : SameSiteMode.None,
        Secure = !isDevelopment,
        MaxAge = TimeSpan.FromMinutes(10)
    };
}

public record PendingLoginChallenge(string UserId, string Email);
