using api.DTOs;
using api.Models;
using api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager)
    {
        _userManager = userManager;
        _signInManager = signInManager;
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("signup")]
    [HttpPost("register")]
    public async Task<ActionResult<AuthUserResponse>> Register([FromBody] RegisterRequest request)
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

        await _signInManager.SignInAsync(user, isPersistent: false);

        return CreatedAtAction(nameof(Me), await BuildResponseAsync(user));
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<ActionResult<AuthUserResponse>> Login([FromBody] LoginRequest request)
    {
        var username = request.Username.Trim();
        var user = await _userManager.FindByNameAsync(username);

        if (user is null)
        {
            return Unauthorized(new { error = "Invalid username or password." });
        }

        var signInResult = await _signInManager.PasswordSignInAsync(
            user,
            request.Password,
            isPersistent: false,
            lockoutOnFailure: true);

        if (!signInResult.Succeeded)
        {
            return Unauthorized(new { error = "Invalid username or password." });
        }

        return Ok(await BuildResponseAsync(user));
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
}
