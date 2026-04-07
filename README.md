# keeper

## Dev setup

```bash
# One-time setup
cp .env.example .env

# Run SQL Server + backend + frontend together
./scripts/dev-stack.sh
```

Use `Ctrl+C` to stop backend/frontend.
Set `STOP_DB_ON_EXIT=true` in `.env` if you want the SQL Server container stopped automatically.

### API configuration and security

- **Connection strings** live in **[User Secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets)** locally (`api.csproj` already has a `UserSecretsId`) or in **environment variables**. The repo keeps **`appsettings.json`** with an **empty** `DefaultConnection`; production uses **`ASPNETCORE_ENVIRONMENT=Production`** and **`appsettings.Production.json`** (also no secrets).
- **Azure App Service**: set **Application settings → Connection strings** → name **`DefaultConnection`**, type SQL Azure. That maps to **`ConnectionStrings__DefaultConnection`**. Prefer **Managed Identity + Azure AD** for SQL when you outgrow SQL authentication ([docs](https://learn.microsoft.com/azure/app-service/tutorial-connect-msi-sql-database)).
- **`/health`** runs a **database health check** (EF Core) and returns JSON with check status.
- **EF Core** uses **transient fault handling** (retries) for Azure SQL.

See also **`docs/import-csv-to-azure-sql.md`** for loading Lighthouse CSVs into Azure SQL (separate from the API process).
