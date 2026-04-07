namespace api.Services.Auth;

public class AuthEmailOptions
{
    public const string SectionName = "AuthEmail";

    public string FromAddress { get; set; } = "onboarding@resend.dev";
    public string FromName { get; set; } = "Keeper";
}
