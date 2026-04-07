using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;

namespace api.Services.Auth;

public class PendingSignupChallengeStore(IDataProtectionProvider dataProtectionProvider)
{
    private const string CookieName = "keeper.pending-signup";
    private readonly IDataProtector _protector = dataProtectionProvider.CreateProtector("keeper.pending-signup");

    public void Write(HttpResponse response, string userId, string email, bool isDevelopment)
    {
        var payload = JsonSerializer.Serialize(new PendingSignupChallenge(userId, email));
        var protectedPayload = _protector.Protect(payload);

        response.Cookies.Append(CookieName, protectedPayload, BuildCookieOptions(isDevelopment));
    }

    public PendingSignupChallenge? Read(HttpRequest request)
    {
        if (!request.Cookies.TryGetValue(CookieName, out var protectedPayload) || string.IsNullOrWhiteSpace(protectedPayload))
        {
            return null;
        }

        try
        {
            var payload = _protector.Unprotect(protectedPayload);
            return JsonSerializer.Deserialize<PendingSignupChallenge>(payload);
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

public record PendingSignupChallenge(string UserId, string Email);
