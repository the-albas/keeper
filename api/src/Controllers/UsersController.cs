using api.DTOs;
using api.Models;
using api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = AppRoles.Admin)]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public UsersController(UserManager<ApplicationUser> userManager) => _userManager = userManager;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserListItemResponse>>> ListUsers()
    {
        var users = await _userManager.Users.OrderBy(u => u.UserName).ToListAsync();

        var result = new List<UserListItemResponse>(users.Count);
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            result.Add(
                new UserListItemResponse
                {
                    Id = user.Id,
                    Email = user.Email ?? string.Empty,
                    Username = user.UserName ?? string.Empty,
                    Roles = roles.ToArray(),
                }
            );
        }

        return Ok(result);
    }

    [HttpPost("{userId}/roles")]
    public async Task<IActionResult> AssignRole(string userId, [FromBody] AssignRoleRequest request)
    {
        if (!AppRoles.All.Contains(request.RoleName))
            return BadRequest(new { error = $"'{request.RoleName}' is not a valid role." });

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
            return NotFound(new { error = "User not found." });

        if (await _userManager.IsInRoleAsync(user, request.RoleName))
            return Conflict(new { error = "User already has this role." });

        var result = await _userManager.AddToRoleAsync(user, request.RoleName);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
                ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }

        return NoContent();
    }

    [HttpDelete("{userId}/roles/{roleName}")]
    public async Task<IActionResult> RemoveRole(string userId, string roleName)
    {
        if (!AppRoles.All.Contains(roleName))
            return BadRequest(new { error = $"'{roleName}' is not a valid role." });

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
            return NotFound(new { error = "User not found." });

        // Prevent removing the last Admin role to avoid lockout.
        if (string.Equals(roleName, AppRoles.Admin, StringComparison.OrdinalIgnoreCase))
        {
            var admins = await _userManager.GetUsersInRoleAsync(AppRoles.Admin);
            if (admins.Count <= 1)
                return BadRequest(new { error = "Cannot remove the last admin." });
        }

        var result = await _userManager.RemoveFromRoleAsync(user, roleName);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
                ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }

        return NoContent();
    }
}
