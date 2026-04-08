using api.DTOs;
using api.Models;
using api.Security;
using api.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IAuthCodeSender _authCodeSender;
    private readonly PendingSignupChallengeStore _pendingSignupChallengeStore;
    private readonly PendingLoginChallengeStore _pendingLoginChallengeStore;
    private readonly IWebHostEnvironment _environment;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IAuthCodeSender authCodeSender,
        PendingSignupChallengeStore pendingSignupChallengeStore,
        PendingLoginChallengeStore pendingLoginChallengeStore,
        IWebHostEnvironment environment)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _authCodeSender = authCodeSender;
        _pendingSignupChallengeStore = pendingSignupChallengeStore;
        _pendingLoginChallengeStore = pendingLoginChallengeStore;
        _environment = environment;
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("signup")]
    [HttpPost("register")]
    public async Task<ActionResult<AuthChallengeResponse>> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim();
        if (string.IsNullOrWhiteSpace(email))
        {
            ModelState.AddModelError(nameof(request.Email), "Email is required.");
            return ValidationProblem(ModelState);
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            TwoFactorEnabled = true,
        };

        var createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return ToValidationProblem(createResult);
        }

        var roleResult = await _userManager.AddToRoleAsync(user, AppRoles.Donor);
        if (!roleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);
            return ToValidationProblem(roleResult);
        }

        var enableMfaResult = await _userManager.SetTwoFactorEnabledAsync(user, true);
        if (!enableMfaResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);
            return ToValidationProblem(enableMfaResult);
        }

        try
        {
            await SendSignupCodeAsync(user, cancellationToken);
        }
        catch (Exception)
        {
            await _userManager.DeleteAsync(user);
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { error = "Unable to send the verification email. Please try again later." });
        }

        _pendingSignupChallengeStore.Write(Response, user.Id, email, _environment.IsDevelopment());

        return StatusCode(StatusCodes.Status201Created, new AuthChallengeResponse
        {
            RequiresCode = true,
            Flow = "signup",
            Email = email
        });
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<ActionResult<AuthChallengeResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim();
        if (string.IsNullOrWhiteSpace(email))
        {
            ModelState.AddModelError(nameof(request.Email), "Email is required.");
            return ValidationProblem(ModelState);
        }

        var normalizedEmail = _userManager.NormalizeEmail(email);
        var user = await _userManager.Users.SingleOrDefaultAsync(candidate => candidate.NormalizedEmail == normalizedEmail);

        if (user is null)
        {
            return Unauthorized(new { error = "Invalid email or password." });
        }

        var signInResult = await _signInManager.PasswordSignInAsync(
            user,
            request.Password,
            isPersistent: false,
            lockoutOnFailure: true);

        if (signInResult.IsNotAllowed)
        {
            return Unauthorized(new { error = "Please verify your email before signing in." });
        }

        if (signInResult.IsLockedOut)
        {
            return Unauthorized(new
            {
                error = "Too many failed attempts. Your account is temporarily locked. Please try again later."
            });
        }

        // Correct password + 2FA enabled returns Succeeded=false and RequiresTwoFactor=true.
        // Must branch here before treating !Succeeded as wrong password.
        if (signInResult.RequiresTwoFactor)
        {
            // Use the already-loaded user (same as Identity's 2FA user). Also persist a
            // first-party cookie so resend/verify work when the SPA and API are on different
            // origins and Identity's intermediate 2FA cookie is not stored by the browser.
            await SendLoginCodeAsync(user, cancellationToken);
            _pendingLoginChallengeStore.Write(Response, user.Id, user.Email ?? email, _environment.IsDevelopment());

            return Ok(new AuthChallengeResponse
            {
                RequiresCode = true,
                Flow = "login",
                Email = user.Email ?? email
            });
        }

        if (!signInResult.Succeeded)
        {
            return Unauthorized(new { error = "Invalid email or password." });
        }

        return Ok(new AuthChallengeResponse
        {
            RequiresCode = false,
            Flow = "login",
            Email = email
        });
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("signup/verify")]
    public async Task<ActionResult<AuthUserResponse>> VerifySignup([FromBody] CodeVerificationRequest request)
    {
        var user = await ResolvePendingSignupUserAsync(request.Email);
        if (user is null)
        {
            return Unauthorized(new
            {
                error = "We couldn't find a pending signup for that email. Please sign up again."
            });
        }

        var isValid = await _userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider, request.Code.Trim());
        if (!isValid)
        {
            return Unauthorized(new { error = "Invalid or expired code." });
        }

        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                return ToValidationProblem(updateResult);
            }
        }

        await _signInManager.SignInAsync(user, isPersistent: false);
        _pendingSignupChallengeStore.Clear(Response, _environment.IsDevelopment());
        return Ok(await BuildResponseAsync(user));
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("signup/resend")]
    public async Task<IActionResult> ResendSignupCode([FromBody] SignupChallengeRequest? request, CancellationToken cancellationToken)
    {
        var user = await ResolvePendingSignupUserAsync(request?.Email);
        if (user is null)
        {
            return Unauthorized(new
            {
                error = "We couldn't find a pending signup for that email. Please sign up again."
            });
        }

        await SendSignupCodeAsync(user, cancellationToken);
        return NoContent();
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login/verify")]
    public async Task<ActionResult<AuthUserResponse>> VerifyLogin([FromBody] CodeVerificationRequest request)
    {
        var user = await ResolvePendingLoginUserAsync(request.Email);
        if (user is null)
        {
            return Unauthorized(new { error = "Your login session expired. Please try again." });
        }

        var isValid = await _userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider, request.Code.Trim());
        if (!isValid)
        {
            return Unauthorized(new { error = "Invalid or expired code." });
        }

        await _signInManager.SignOutAsync();
        await _signInManager.SignInAsync(user, isPersistent: false);
        _pendingLoginChallengeStore.Clear(Response, _environment.IsDevelopment());
        return Ok(await BuildResponseAsync(user));
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login/resend")]
    public async Task<IActionResult> ResendLoginCode([FromBody] SignupChallengeRequest? request, CancellationToken cancellationToken)
    {
        var user = await ResolvePendingLoginUserAsync(request?.Email);
        if (user is null)
        {
            return Unauthorized(new { error = "Your login session expired. Please try again." });
        }

        await SendLoginCodeAsync(user, cancellationToken);
        return NoContent();
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<AuthUserResponse>> Me()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(await BuildResponseAsync(user));
    }

    /// <summary>Permanently deletes the signed-in user account (e.g. donor self-service).</summary>
    [Authorize]
    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }

        await _signInManager.SignOutAsync();
        var deleteResult = await _userManager.DeleteAsync(user);
        if (!deleteResult.Succeeded)
        {
            return ToValidationProblem(deleteResult);
        }

        return NoContent();
    }

    [Authorize(Roles = AppRoles.Admin)]
    [HttpGet("admin-only")]
    public IActionResult AdminOnly()
    {
        return Ok(new { message = "You have admin access." });
    }

    private async Task<AuthUserResponse> BuildResponseAsync(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        return new AuthUserResponse
        {
            Email = user.Email ?? string.Empty,
            Roles = roles.ToArray()
        };
    }

    private ActionResult ToValidationProblem(IdentityResult result)
    {
        foreach (var error in result.Errors)
        {
            ModelState.AddModelError(error.Code, error.Description);
        }

        return ValidationProblem(ModelState);
    }

    private async Task SendSignupCodeAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        var code = await _userManager.GenerateTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider);
        await _authCodeSender.SendCodeAsync(user.Email ?? string.Empty, code, "signup", cancellationToken);
    }

    private async Task SendLoginCodeAsync(ApplicationUser user, CancellationToken cancellationToken)
    {
        var code = await _userManager.GenerateTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider);
        await _authCodeSender.SendCodeAsync(user.Email ?? string.Empty, code, "login", cancellationToken);
    }

    private async Task<ApplicationUser?> ResolvePendingSignupUserAsync(string? email)
    {
        var requestedEmail = email?.Trim();
        if (!string.IsNullOrWhiteSpace(requestedEmail))
        {
            return await FindPendingSignupUserByEmailAsync(requestedEmail);
        }

        var challenge = _pendingSignupChallengeStore.Read(Request);
        if (challenge is null)
        {
            return null;
        }

        var user = await _userManager.FindByIdAsync(challenge.UserId);
        if (user is null
            || user.EmailConfirmed
            || !string.Equals(user.Email, challenge.Email, StringComparison.OrdinalIgnoreCase))
        {
            _pendingSignupChallengeStore.Clear(Response, _environment.IsDevelopment());
            return null;
        }

        return user;
    }

    private async Task<ApplicationUser?> FindPendingSignupUserByEmailAsync(string email)
    {
        var normalizedEmail = _userManager.NormalizeEmail(email);
        if (string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return null;
        }

        var user = await _userManager.Users.SingleOrDefaultAsync(candidate => candidate.NormalizedEmail == normalizedEmail);
        if (user is null || user.EmailConfirmed)
        {
            return null;
        }

        return user;
    }

    /// <summary>
    /// Resolves the user for email 2FA during login: Identity's 2FA cookie (same-site) or
    /// <see cref="PendingLoginChallengeStore"/> (cross-origin SPA + API).
    /// </summary>
    private async Task<ApplicationUser?> ResolvePendingLoginUserAsync(string? requestedEmail)
    {
        var trimmedRequested = requestedEmail?.Trim();

        var fromIdentity = await _signInManager.GetTwoFactorAuthenticationUserAsync();
        if (fromIdentity is not null)
        {
            if (!string.IsNullOrWhiteSpace(trimmedRequested)
                && !string.Equals(fromIdentity.Email, trimmedRequested, StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            return fromIdentity;
        }

        var challenge = _pendingLoginChallengeStore.Read(Request);
        if (challenge is null)
        {
            return null;
        }

        var user = await _userManager.FindByIdAsync(challenge.UserId);
        if (user is null
            || !string.Equals(user.Email, challenge.Email, StringComparison.OrdinalIgnoreCase))
        {
            _pendingLoginChallengeStore.Clear(Response, _environment.IsDevelopment());
            return null;
        }

        if (!string.IsNullOrWhiteSpace(trimmedRequested)
            && !string.Equals(user.Email, trimmedRequested, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return user;
    }
}
