using System.Threading.RateLimiting;
using api.Data;
using api.Models;
using api.Security;
using api.Services.Auth;
using api.Services.Ml;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Resend;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);

builder.Services.AddHttpClient<MlClientService>(client =>
{
    var baseUrl =
        builder.Configuration["MLPipelines:BaseUrl"]
        ?? throw new InvalidOperationException("MLPipelines:BaseUrl is not configured.");
    client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(120);
});

builder
    .Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = false;
        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedEmail = true;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;
        options.Tokens.EmailConfirmationTokenProvider = TokenOptions.DefaultEmailProvider;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddOptions();
builder.Services.Configure<AuthEmailOptions>(
    builder.Configuration.GetSection(AuthEmailOptions.SectionName)
);
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
    options.AddFixedWindowLimiter(
        "auth",
        limiterOptions =>
        {
            limiterOptions.PermitLimit = 50;
            limiterOptions.Window = TimeSpan.FromMinutes(1);
            limiterOptions.QueueLimit = 0;
        }
    );
});

builder.Services.AddControllers();
const string FrontendCorsPolicy = "FrontendCorsPolicy";

var configuredOrigins =
    builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
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
    options.AddPolicy(
        FrontendCorsPolicy,
        policy =>
        {
            if (allowedOrigins.Length > 0)
            {
                policy
                    .WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
                return;
            }

            // Keep development friction low without opening production CORS.
            if (builder.Environment.IsDevelopment())
            {
                policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
                return;
            }

            // Production with no origins: allow app to run (e.g. /health, curl). Add
            // Cors:AllowedOrigins in Azure App Settings before browser calls from Vercel.
            policy.SetIsOriginAllowed(_ => false).AllowAnyHeader().AllowAnyMethod();
        }
    );
});

var app = builder.Build();

// UseCors must be first so CORS headers are written before any other middleware
// can short-circuit or throw — otherwise a controller exception produces a 500
// with no Access-Control-Allow-Origin header and the browser reports a CORS error
// even though the request reached the server.
app.UseCors(FrontendCorsPolicy);

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();

    // Catch unhandled controller exceptions in production. Placed after UseCors
    // so CORS headers are already on the response when this writes the error body.
    app.Use(
        async (context, next) =>
        {
            try
            {
                await next(context);
            }
            catch (Exception ex)
            {
                context
                    .RequestServices.GetRequiredService<ILogger<Program>>()
                    .LogError(
                        ex,
                        "Unhandled exception on {Method} {Path}",
                        context.Request.Method,
                        context.Request.Path
                    );

                if (!context.Response.HasStarted)
                {
                    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(
                        new { error = "An unexpected error occurred." }
                    );
                }
            }
        }
    );
}

app.UseHttpsRedirection();
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

await SeedRolesAsync(app.Services);
await SeedAdminUserAsync(app.Services, app.Configuration);

app.Run();

static async Task SeedAdminUserAsync(IServiceProvider services, IConfiguration config)
{
    var email = config["Seed:AdminEmail"];
    var password = config["Seed:AdminPassword"];
    var username = config["Seed:AdminUsername"] ?? "admin";

    if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        return;

    using var scope = services.CreateScope();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

    var existing = await userManager.FindByEmailAsync(email);
    if (existing is not null)
        return;

    var user = new ApplicationUser
    {
        UserName = username,
        Email = email,
        EmailConfirmed = true,
        TwoFactorEnabled = true,
    };

    var createResult = await userManager.CreateAsync(user, password);
    if (!createResult.Succeeded)
    {
        var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
        throw new InvalidOperationException($"Failed to seed admin user: {errors}");
    }

    var roleResult = await userManager.AddToRoleAsync(user, AppRoles.Admin);
    if (!roleResult.Succeeded)
    {
        var errors = string.Join(", ", roleResult.Errors.Select(e => e.Description));
        throw new InvalidOperationException(
            $"Failed to assign Admin role to seeded user: {errors}"
        );
    }
}

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
