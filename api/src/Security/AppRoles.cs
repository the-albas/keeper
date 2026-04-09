namespace api.Security;

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Staff = "Staff";
    public const string Donor = "Donor";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(
        StringComparer.OrdinalIgnoreCase
    )
    {
        Admin,
        Staff,
        Donor,
    };
}
