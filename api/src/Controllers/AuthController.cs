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
    private readonly IWebHostEnvironment _environment;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IAuthCodeSender authCodeSender,
        PendingSignupChallengeStore pendingSignupChallengeStore,
        IWebHostEnvironment environment)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _authCodeSender = authCodeSender;
        _pendingSignupChallengeStore = pendingSignupChallengeStore;
        _environment = environment;
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("signup")]
    [HttpPost("register")]
    public async Task<ActionResult<AuthChallengeResponse>> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var username = request.Username.Trim();
        if (string.IsNullOrWhiteSpace(username))
        {
            ModelState.AddModelError(nameof(request.Username), "Username is required.");
            return ValidationProblem(ModelState);
        }

        var email = request.Email.Trim();
        if (string.IsNullOrWhiteSpace(email))
        {
            ModelState.AddModelError(nameof(request.Email), "Email is required.");
            return ValidationProblem(ModelState);
        }

        var user = new ApplicationUser
        {
            UserName = username,
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

        await SendSignupCodeAsync(user, cancellationToken);
        _pendingSignupChallengeStore.Write(Response, user.Id, email, _environment.IsDevelopment());

        return CreatedAtAction(nameof(Register), new AuthChallengeResponse
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

        if (!signInResult.Succeeded)
        {
            return Unauthorized(new { error = "Invalid email or password." });
        }

        if (!signInResult.RequiresTwoFactor)
        {
            return Ok(new AuthChallengeResponse
            {
                RequiresCode = false,
                Flow = "login",
                Email = email
            });
        }

        var twoFactorUser = await _signInManager.GetTwoFactorAuthenticationUserAsync();
        if (twoFactorUser is null)
        {
            return Unauthorized(new { error = "Your login session expired. Please try again." });
        }

        await SendLoginCodeAsync(twoFactorUser, cancellationToken);

        return Ok(new AuthChallengeResponse
        {
            RequiresCode = true,
            Flow = "login",
            Email = twoFactorUser.Email ?? email
        });
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("signup/verify")]
    public async Task<ActionResult<AuthUserResponse>> VerifySignup([FromBody] CodeVerificationRequest request)
    {
        var challenge = _pendingSignupChallengeStore.Read(Request);
        if (challenge is null)
        {
            return Unauthorized(new { error = "Your verification session expired. Please sign up again." });
        }

        var user = await _userManager.FindByIdAsync(challenge.UserId);
        if (user is null || !string.Equals(user.Email, challenge.Email, StringComparison.OrdinalIgnoreCase))
        {
            _pendingSignupChallengeStore.Clear(Response, _environment.IsDevelopment());
            return Unauthorized(new { error = "Your verification session expired. Please sign up again." });
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
    public async Task<IActionResult> ResendSignupCode(CancellationToken cancellationToken)
    {
        var challenge = _pendingSignupChallengeStore.Read(Request);
        if (challenge is null)
        {
            return Unauthorized(new { error = "Your verification session expired. Please sign up again." });
        }

        var user = await _userManager.FindByIdAsync(challenge.UserId);
        if (user is null || !string.Equals(user.Email, challenge.Email, StringComparison.OrdinalIgnoreCase))
        {
            _pendingSignupChallengeStore.Clear(Response, _environment.IsDevelopment());
            return Unauthorized(new { error = "Your verification session expired. Please sign up again." });
        }

        await SendSignupCodeAsync(user, cancellationToken);
        return NoContent();
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login/verify")]
    public async Task<ActionResult<AuthUserResponse>> VerifyLogin([FromBody] CodeVerificationRequest request)
    {
        var result = await _signInManager.TwoFactorSignInAsync(TokenOptions.DefaultEmailProvider, request.Code.Trim(), false, false);
        if (!result.Succeeded)
        {
            return Unauthorized(new { error = "Invalid or expired code." });
        }

        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized(new { error = "Unable to finish login." });
        }

        return Ok(await BuildResponseAsync(user));
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login/resend")]
    public async Task<IActionResult> ResendLoginCode(CancellationToken cancellationToken)
    {
        var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();
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
            Username = user.UserName ?? string.Empty,
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
}
