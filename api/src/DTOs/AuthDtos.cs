using System.ComponentModel.DataAnnotations;

namespace api.DTOs;

public class RegisterRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(128)]
    public string Password { get; set; } = string.Empty;
}

public class CodeVerificationRequest
{
    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string Code { get; set; } = string.Empty;

    [EmailAddress]
    [MaxLength(254)]
    public string? Email { get; set; }
}

public class SignupChallengeRequest
{
    [EmailAddress]
    [MaxLength(254)]
    public string? Email { get; set; }
}

public class LoginRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(128)]
    public string Password { get; set; } = string.Empty;
}

public class AuthChallengeResponse
{
    public bool RequiresCode { get; set; }
    public string Flow { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

public class AuthUserResponse
{
    public string Email { get; set; } = string.Empty;
    public string[] Roles { get; set; } = [];

    /// <summary>Primary key in <c>supporters</c> when this account is linked to a donor row (matched by email).</summary>
    public int? SupporterId { get; set; }
}
