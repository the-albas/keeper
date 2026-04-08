# Keeper

Keeper is a case management and donor intelligence platform for nonprofit/safehouse organizations. It helps staff track residents, manage donations, analyze donor behavior, and monitor social media impact — all in one place.

## What it does

- **Resident management** — track resident profiles, health & wellbeing, education progress, incidents, interventions, and home visitations
- **Donation tracking** — manage monetary and in-kind donations, donor profiles, and program allocations
- **Safehouse operations** — track locations, staff assignments, monthly metrics, and process recordings
- **Donor intelligence (ML)** — predict donor retention/lapse, project future giving, analyze social media engagement, and flag at-risk residents using 5 scikit-learn models served via FastAPI
- **Social media management** — track posts and engagement across platforms; optimize strategy with ML predictions
- **Role-based access** — Admin, Staff, and Donor roles with cookie-based authentication via ASP.NET Identity

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite, TanStack Router & Query, Tailwind CSS v4, Shadcn |
| Backend | ASP.NET Core 10 Web API (C#), EF Core, ASP.NET Identity |
| ML service | FastAPI (Python), scikit-learn, pandas, joblib |
| Database | SQL Server 2022 (Docker locally, Azure SQL in production) |
| Deployment | Vercel (frontend), Azure App Service (backend) |

## Prerequisites

- [Docker](https://www.docker.com/) — runs SQL Server locally
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Bun](https://bun.sh/) 1.3.11+ — frontend package manager
- [Python 3.x](https://www.python.org/) + `venv` — ML service
- `dotnet-ef` CLI — `dotnet tool install -g dotnet-ef`

## Local setup

### Quick start (recommended)

```bash
# One-time setup
cp .env.example .env

# Start SQL Server + backend + frontend together
./scripts/dev-stack.sh
```

This starts everything automatically:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5216 |
| SQL Server | localhost:1433 |
| API health check | http://localhost:5216/health |

Use `Ctrl+C` to stop the backend and frontend. Set `STOP_DB_ON_EXIT=true` in `.env` to also stop the SQL Server container automatically.

---

### Manual setup

If you prefer to start each service individually:

#### 1. Database (Docker)

```bash
docker compose up -d
```

SQL Server 2022 runs on port `1433` with:
- Username: `sa`
- Password: `KeeperDev#2026!`
- Database: `keeper`

#### 2. Backend (ASP.NET Core)

```bash
cd api/src
dotnet restore
dotnet ef database update   # applies migrations
dotnet run
# → http://localhost:5216
```

Connection strings are stored in [User Secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets) locally (`api.csproj` has a `UserSecretsId`) or in environment variables. The repo keeps `appsettings.json` with an empty `DefaultConnection` — never commit secrets.

#### 3. Frontend (React + Vite)

```bash
cd web
bun install
bun run dev
# → http://localhost:5173
```

#### 4. ML service (FastAPI) — optional

The ML service is only needed for the donor intelligence and resident progress prediction features.

```bash
cd ml-pipelines
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# → http://localhost:8000
# → Swagger docs: http://localhost:8000/docs
```

---

## Environment variables

Copy `.env.example` to `.env` and adjust as needed:

```
VITE_API_BASE_URL=http://localhost:5216   # backend URL used by the frontend
STOP_DB_ON_EXIT=false                     # set true to stop SQL container on Ctrl+C
```

Backend configuration (via `appsettings.Development.json` or environment variables):

```
ConnectionStrings__DefaultConnection=Server=localhost,1433;Database=keeper;User Id=sa;Password=KeeperDev#2026!;TrustServerCertificate=True;Encrypt=False
MLPipelines__BaseUrl=http://localhost:8000
Cors__AllowedOrigins__0=http://localhost:5173
```

---

## ML pipelines

Five pre-trained scikit-learn models live in `ml-pipelines/pipelines/`:

| Model | Endpoint | Output |
|---|---|---|
| Donor Retention | `POST /retention/predict` | Retained or lapsed |
| Donor Growth | `POST /growth/predict` | Projected total giving |
| Social Engagement | `POST /social/predict` | Predicted engagement rate |
| Girls Progress | `POST /girls-progress/predict` | Mean education progress (0–100) |
| Girls Trajectory | `POST /girls-trajectory/predict` | Next progress + at-risk flag |

See `ml-pipelines/ml-pipelines-api.md` for full request/response schemas and example `curl` commands.

---

## API reference

Key endpoints provided by the ASP.NET Core backend:

```
GET  /health                  — database health check (returns JSON)
POST /api/auth/signup         — register a new account (rate-limited)
POST /api/auth/login          — sign in (rate-limited)
POST /api/auth/logout         — sign out
GET  /api/auth/me             — current user info (requires auth)
GET  /api/auth/admin-only     — admin role check
```

Authentication uses cookies (`keeper.auth`) via ASP.NET Identity.

---

## Deployment notes

**Backend (Azure App Service):**
- Set **Application settings → Connection strings** → name `DefaultConnection`, type SQL Azure
- Prefer Managed Identity + Azure AD for SQL when possible ([docs](https://learn.microsoft.com/azure/app-service/tutorial-connect-msi-sql-database))
- EF Core uses transient fault handling (retries) for Azure SQL
- Set `ASPNETCORE_ENVIRONMENT=Production`

**Frontend (Vercel):**
- Set `VITE_API_BASE_URL` to your Azure App Service URL

See `docs/import-csv-to-azure-sql.md` for loading Lighthouse CSVs into Azure SQL.
