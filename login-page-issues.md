# login-page Branch — Deployment Issues

## 1. `MlClientService` DI Registration Broken

The branch reverted the typed client back to a named client, so `MlClientService` is never registered in DI. The app crashes on startup with a 500.30.

```csharp
// BROKEN (current on login-page)
builder.Services.AddHttpClient("ml-pipelines", client => { ... });

// FIX
builder.Services.AddHttpClient<MlClientService>(client => { ... });
```

**File:** `api/src/Program.cs`

## 2. Missing `RESEND_APITOKEN` Environment Variable

In production, `ResendAuthCodeSender` is used for OTP emails. It reads `RESEND_APITOKEN` from configuration. If this isn't set in Azure App Settings, email sending will fail.

**Action:** Add `RESEND_APITOKEN` to Azure App Service > Settings > Environment variables.

## 3. Missing `AuthEmail` Config in Production

The `AuthEmail` section was added to `appsettings.json` and `appsettings.Development.json` but not `appsettings.Production.json`. It falls back to defaults (`onboarding@resend.dev`), which is the Resend sandbox and won't deliver to real email addresses.

**Action:** Add the following to `appsettings.Production.json`:

```json
"AuthEmail": {
  "FromAddress": "<your-verified-resend-domain-email>",
  "FromName": "Keeper"
}
```

## 4. Data Protection Keys Are Ephemeral on Azure

`PendingSignupChallengeStore` uses `IDataProtectionProvider` to encrypt signup verification cookies. On Azure App Service, data protection keys are stored in memory by default and get wiped on every restart/deploy. This means any in-progress signup verifications will break after a restart.

**Action (non-blocking but recommended):** Persist data protection keys to Azure Blob Storage or the database.

## 5. Branch Not Merged to `main`

The deployment pipeline pulls from `main`. The 3 commits on `login-page` (`fb650c9`, `d3df0fa`, `487bfba`) have not been merged yet. The app won't include any of these changes until a PR is merged.
