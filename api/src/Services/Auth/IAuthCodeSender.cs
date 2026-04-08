namespace api.Services.Auth;

public interface IAuthCodeSender
{
    Task SendCodeAsync(
        string email,
        string code,
        string flow,
        CancellationToken cancellationToken = default
    );
}
