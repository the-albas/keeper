using api.Data;
using api.DTOs;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokens;

    public AuthController(AppDbContext db, TokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!Enum.TryParse<UserRole>(request.Role, ignoreCase: true, out var role))
            return BadRequest(new { error = "Role must be 'admin' or 'donor'." });

        var exists = await _db.Users.AnyAsync(u => u.Username == request.Username);
        if (exists)
            return Conflict(new { error = "Username already taken." });

        var user = new User
        {
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = role,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var (token, expiresAt) = _tokens.GenerateToken(user);

        return Created("", new AuthResponse
        {
            Token = token,
            Username = user.Username,
            Role = user.Role.ToString(),
            ExpiresAt = expiresAt,
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid username or password." });

        var (token, expiresAt) = _tokens.GenerateToken(user);

        return Ok(new AuthResponse
        {
            Token = token,
            Username = user.Username,
            Role = user.Role.ToString(),
            ExpiresAt = expiresAt,
        });
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        return Ok(new
        {
            Username = User.Identity?.Name,
            Role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value,
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin-only")]
    public IActionResult AdminOnly()
    {
        return Ok(new { message = "You have admin access." });
    }
}
