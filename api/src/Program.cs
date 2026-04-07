using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Resend;
using api.Data;
using api.Services.Ml;
using api.Models;
using api.Security;
using api.Services.Auth;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpClient<MlClientService>(client =>
{
    var baseUrl = builder.Configuration["MLPipelines:BaseUrl"] ?? "http://localhost:8000";
    client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(120);
});

builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = false;
        options.User.RequireUniqueEmail = true;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;
        options.Tokens.EmailConfirmationTokenProvider = TokenOptions.DefaultEmailProvider;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddOptions();
builder.Services.Configure<AuthEmailOptions>(builder.Configuration.GetSection(AuthEmailOptions.SectionName));
builder.Services.AddHttpClient<ResendClient>();
builder.Services.Configure<ResendClientOptions>(options =>
{
    options.ApiToken = builder.Configuration["RESEND_APITOKEN"] ?? string.Empty;
});
builder.Services.AddTransient<IResend, ResendClient>();
builder.Services.AddDataProtection();
builder.Services.AddScoped<PendingSignupChallengeStore>();

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddScoped<IAuthCodeSender, DevelopmentAuthCodeSender>();
}
else
{
    builder.Services.AddScoped<IAuthCodeSender, ResendAuthCodeSender>();
}

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "keeper.auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = builder.Environment.IsDevelopment()
        ? SameSiteMode.Lax
        : SameSiteMode.None;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("auth", limiterOptions =>
    {
        limiterOptions.PermitLimit = 5;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueLimit = 0;
    });
});

builder.Services.AddControllers();
const string FrontendCorsPolicy = "FrontendCorsPolicy";

var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
var allowedOrigins = configuredOrigins
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin => origin.Trim())
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

if (builder.Environment.IsDevelopment() && allowedOrigins.Length == 0)
{
    allowedOrigins = ["http://localhost:5173"];
}

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
            return;
        }

        // Keep development friction low without opening production CORS.
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin()
                .AllowAnyHeader()
                .AllowAnyMethod();
            return;
        }

        // Production with no origins: allow app to run (e.g. /health, curl). Add
        // Cors:AllowedOrigins in Azure App Settings before browser calls from Vercel.
        policy.SetIsOriginAllowed(_ => false)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseCors(FrontendCorsPolicy);
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

await SeedRolesAsync(app.Services);

app.Run();

static async Task SeedRolesAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

    foreach (var role in new[] { AppRoles.Admin, AppRoles.Staff, AppRoles.Donor })
    {
        if (await roleManager.RoleExistsAsync(role))
        {
            continue;
        }

        var result = await roleManager.CreateAsync(new IdentityRole(role));
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to seed role '{role}': {errors}");
        }
    }
}
