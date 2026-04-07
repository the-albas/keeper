# Keeper Backend README

Lightweight backend for the Keeper project, built with ASP.NET Core Web API.

## Purpose

This backend will:

- expose secure APIs for the React frontend (deployed on Vercel),
- store application data in Azure SQL,
- integrate with a Python ML service by sending requests and receiving predictions/results.

## Current Status

- Minimal API scaffold is in place.
- Health endpoint exists: `GET /health`.
- Weather template code has been removed.

## Planned High-Level Architecture

- **Frontend**: React + TypeScript + Vite (hosted on Vercel)
- **Backend**: .NET Web API (this project)
- **Database**: Azure SQL
- **ML Service**: Python API (separate app/service, called by backend)

Flow:

1. User interacts with frontend.
2. Frontend calls backend API.
3. Backend reads/writes Azure SQL as needed.
4. Backend calls Python ML endpoint for predictions or pipeline output.
5. Backend returns combined/validated response to frontend.

## Suggested Project Structure (Backend)

As features are added, use a clean structure:

- `Controllers/` - API endpoints
- `Models/` - domain models/entities
- `Contracts/` - request/response DTOs
- `Data/` - EF Core DbContext and configurations
- `Services/` - business logic and integration services
- `Services/Ml/` - Python endpoint client
- `Security/` - auth, RBAC policies, security middleware
- `Validation/` - FluentValidation or custom validators

## Core Integrations

### Azure SQL

- Use EF Core with SQL Server provider.
- Keep connection strings in environment variables or secure configuration.
- No secrets in source control.

Planned environment variables:

- `ConnectionStrings__DefaultConnection`

### Frontend (Vercel) Integration

- Configure CORS to allow Vercel app domains.
- Require HTTPS in production.
- Use auth token/cookie strategy compatible with frontend hosting model.

Planned environment variables:

- `Cors__AllowedOrigins__0` (for prod frontend URL)
- `Cors__AllowedOrigins__1` (optional preview URL)

### Python ML Service Integration

- Backend should call Python service over HTTP.
- Define stable request/response contracts and timeout/retry behavior.
- Treat ML service as external dependency (graceful failure handling).

Planned environment variables:

- `MlService__BaseUrl`
- `MlService__ApiKey` (if needed)
- `MlService__TimeoutSeconds`

## API Design (Initial)

Current:

- `GET /health` -> service health response
- `POST /api/auth/signup` (or `/api/auth/register`) -> create account (public)
- `POST /api/auth/login` -> sign in with ASP.NET Identity cookie (public)
- `POST /api/auth/logout` -> clear auth cookie (protected)
- `GET /api/auth/me` -> current authenticated user (protected)

Near-term placeholders to implement:

- `POST /api/ml/predict` -> backend forwards request to Python service and returns prediction
- `GET /api/dashboard/impact` -> aggregate metrics for impact dashboard

Auth notes:

- Authentication is cookie-based via ASP.NET Identity (`keeper.auth` cookie).
- Frontend requests must include credentials (for example `fetch(..., { credentials: "include" })`).
- Login/signup endpoints are intentionally anonymous; protected routes require `[Authorize]`.

## Security Baseline (IS 414 aligned)

Must-have backend controls:

- HTTPS redirection + HSTS in production
- Authentication and authorization on protected APIs
- Role-based authorization policies (RBAC)
- Input validation and output-safe error handling
- Secure secret management (env vars/secret store)
- CSP header support (plus secure cookie/header configuration)
- Data integrity checks for update/delete operations

Stretch security options:

- MFA support
- third-party auth integration
- additional request sanitization and abuse/rate controls

## Course Requirements Mapping (Backend-Centric)

This section helps keep engineering tasks tied to graded deliverables.

### IS 413 (.NET + full app)

Backend implications:

- Build API endpoints for all required public pages and admin portal data.
- Support relational storage with Azure SQL.
- Provide robust validation, error handling, and production-ready behavior.

### IS 414 (Security)

Backend implications:

- Implement auth, RBAC, HTTPS/HSTS, secure credential handling, and protected APIs.
- Add middleware/headers for CSP and other secure defaults.

### IS 455 (Machine Learning)

Backend implications:

- Create integration endpoint(s) between app and Python ML pipelines.
- Store/request data needed for model features and return model results to frontend.
- Support deployable, repeatable pipeline consumption in production.

### IS 401 (PM/Systems Design)

Mostly product/process artifacts, but backend supports:

- backlog sizing for API/security/ML tasks,
- sprint planning for integration milestones,
- traceability from personas and journey pain points to API features.

## Backlog Starter (Backend Items)

1. Configure environment-based settings (dev/prod)
2. Add EF Core + Azure SQL DbContext
3. Create initial entities and migrations
4. Add structured global error handling middleware
5. Add request validation pipeline
6. Implement auth (username/password) and password policy
7. Implement RBAC policies and protected routes
8. Configure CORS for Vercel domains
9. Add `MlClientService` for Python endpoint communication
10. Implement `POST /api/ml/predict`
11. Add logging/telemetry and correlation IDs
12. Add integration tests for critical endpoints

## Deployment Notes (Target)

- Backend deploy: Azure App Service or Azure Container Apps
- DB deploy: Azure SQL
- Frontend deploy: Vercel
- Configure API base URL in frontend env vars
- Restrict CORS to known frontend domains

### CORS Setup (Now Implemented)

- CORS policy name: `FrontendCorsPolicy`
- Config key: `Cors:AllowedOrigins`
- Development default includes `http://localhost:5173`
- Production without configured origins: API still runs (e.g. `/health`); set `Cors__AllowedOrigins__*` before the Vercel frontend can call the API cross-origin

### Azure App Service Quick Setup

1. Create Web App for the backend API.
2. Set `ASPNETCORE_ENVIRONMENT=Production`.
3. Add app settings:
   - `Cors__AllowedOrigins__0=https://<your-vercel-domain>`
   - `Cors__AllowedOrigins__1=https://<optional-preview-domain>`
   - `ConnectionStrings__DefaultConnection=<azure-sql-connection-string>` (when Step 2 is implemented)
4. Enable HTTPS only in App Service settings.
5. Deploy API and verify `GET /health` works from browser/postman.

### Vercel Quick Setup

1. Set frontend env var for API base URL (for example `VITE_API_BASE_URL`).
2. Point it to your deployed backend URL.
3. Ensure frontend calls include the correct origin and auth strategy once auth is added.

## Next Steps

Recommended immediate sequence:

1. Add configuration model + env var binding.
2. Add Azure SQL connectivity and first migration.
3. Create auth skeleton (login + protected endpoint).
4. Create ML integration contract and a first pass-through endpoint.
