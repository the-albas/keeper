# ML Pipeline Hookup Checklist

This is the end-to-end list to fully hook up ML in `keeper`, based on the current codebase state.

## Current Status (already done)

- ML FastAPI service exists in `ml-pipelines/app` with prediction routes for:
  - `retention`
  - `growth`
  - `social`
  - `social/causal`
  - `girls-progress`
  - `girls-trajectory`
- Training scripts exist in `ml-pipelines/scripts`, including `train_social_causal.py`.
- Nightly retrain workflow exists at `.github/workflows/nightly-retrain.yml`.
- ASP.NET proxy endpoints exist in `api/src/Controllers/MlController.cs` for prediction and health.
- Docker local build path is fixed for ML image (`ml-pipelines/.dockerignore` now allows `scripts/` to be copied).
- Backend ML feature endpoints are implemented:
  - `GET /api/admin/ml/donor-features`
  - `GET /api/admin/ml/resident-features`
- `/reports` is wired to real donor/resident ML aggregates in `web/src/routes/reports.tsx`.
- Resident ML endpoint type mismatch fix is applied (`double` mapping for SQL `float` values).

## Progress Snapshot (reports-only scope)

- Done:
  - Step 1 backend feature endpoints
  - `/reports` live ML aggregate wiring (donor + resident)
  - `/reports` remains in scope; no donor/caseload page ML changes in active plan
- In progress:
  - local runtime verification end-to-end (`web` -> `api` -> `ml`)
- Remaining for reports-only completion:
  - verify `/api/admin/ml/resident-features` returns 200 after API restart
  - validate all 4 report ML cards show live values
  - optimize aggregation path (prefer backend aggregate endpoint over many client-side ML calls)

---

## 1) Local Setup and Smoke Test (Docker-first)

### 1.1 Start ML service via Docker (preferred)

- [x] Confirm `Dataset/lighthouse_csv_v7/` exists under `ml-pipelines/Dataset`.
- [x] Ensure `ml-pipelines/.dockerignore` does **not** exclude `scripts/` (Dockerfile copies `scripts/`).
- [x] Build image from `ml-pipelines`:
  - `docker build -t keeper-ml:local .`
- [x] Run container with dataset mount:
  - `docker rm -f keeper-ml-local`
  - `docker run -d --name keeper-ml-local -p 8000:8000 -v "${PWD}\Dataset:/app/Dataset" keeper-ml:local`
- [ ] Verify container and API:
  - `docker ps --filter "name=keeper-ml-local"`
  - `curl.exe http://localhost:8000/health`
  - `http://localhost:8000/docs`

### 1.2 Wire backend to local ML container

- [ ] In `api/src/appsettings.Development.json`, confirm:
  - `"MLPipelines": { "BaseUrl": "http://localhost:8000" }`
- [ ] Start API in `api/src`:
  - `dotnet run`
- [ ] Verify API can reach ML:
  - call any proxied route such as `GET /api/ml/health` (authenticated in app context).

### 1.3 Start web and smoke test reports page

- [ ] Start frontend in `web`:
  - `bun run dev`
- [ ] Open `/reports` and confirm ML cards load (not all "ML service offline").
- [ ] If ML cards fail, check:
  - container logs: `docker logs --tail 100 keeper-ml-local`
  - API logs for upstream ML call failures.

### 1.4 Optional fallback: run ML without Docker

- [ ] Only if needed, use Python venv path:
  - `python -m venv .venv`
  - `.venv\Scripts\activate`
  - `pip install -r requirements.txt`
  - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

---

## 2) Data Contract Finalization (required for real, non-sample scoring)

`/reports` is now using live donor/resident feature payloads. Remaining contract work is mostly for non-reports pages and schema completeness.

### 2.1 Donor feature contract

- [x] Add/confirm backend query endpoint that returns donor rows with all model inputs for:
  - retention model features: `frequency`, `avg_monetary_value`, `social_referral_count`, `is_recurring_donor`, `top_program_interest`
  - growth model features: `recency_days`, `frequency`, `social_referral_count`, `is_recurring_donor`, `donor_tenure_days`, `supporter_type`, `relationship_type`, `region`, `acquisition_channel`, `status`
- [x] Ensure field names and types match ML schemas exactly (snake_case keys expected by ML service).
- [ ] Include null/default handling for optional fields (especially categorical fields).

### 2.2 Resident feature contract

- [x] Add/confirm backend query endpoint that returns resident rows with all model inputs for:
  - girls-progress model (`GirlsProgressFeatures` contract)
  - girls-trajectory model (`GirlsTrajectoryFeatures` contract)
- [x] Use schema field names as source of truth from:
  - `ml-pipelines/app/schemas/girls_progress.py`
  - `ml-pipelines/app/schemas/girls_trajectory.py`
- [x] Map DB column names to ML request names exactly.
- [ ] Add fallback values where data is missing (do not let bad rows crash batch scoring).
- [ ] Verify all numeric fields are stable across environments (SQL `float` -> C# `double` fix is in place; continue runtime checks).

### 2.3 Social feature contract (if needed for production pages)

- [ ] Decide whether social predictions stay sample-only on `/reports` or get live post-level data.
- [ ] If live, expose post-level feature payload endpoint for both social models.

---

## 3) Backend Integration Tasks (ASP.NET)

### 3.1 Keep/validate existing proxy routes

- [ ] Validate `api/ml/{pipeline}/predict` works for all supported pipelines.
- [ ] Validate `api/ml/social/causal/predict` and `/features` route behavior.
- [ ] Confirm role-based authorization is correct (`Admin`, `Staff` only).

### 3.2 Add retrain proxy endpoints (recommended)

Nightly workflow currently calls FastAPI `/admin/retrain/*` directly. Recommended hardening is to route through ASP.NET so auth/rate-limits are centralized.

- [ ] Add `POST /api/ml/retrain/{model}` in `MlController` (Admin-only).
- [ ] Add `GET /api/ml/status` proxy to FastAPI `/health`.
- [ ] Add timeout and error mapping for long-running retrain calls.
- [ ] Update docs so external callers use ASP.NET endpoint only.

### 3.3 Batch scoring helpers (recommended for scale)

- [ ] Add backend aggregation endpoints that score many rows server-side (instead of one client call per row).
- [ ] Return summarized metrics needed by UI (counts, averages, top risks).
- [ ] Cache short-lived results to reduce repeated ML calls on page refresh.

---

## 4) Frontend Integration Tasks

### 4.1 Replace sample payloads on reports page

- [x] Replace sample `queryFn` request bodies in `web/src/routes/reports.tsx` with live feature payloads from backend endpoints.
- [ ] Keep graceful fallback UI for ML downtime ("ML service offline").
- [x] Add "Live" badge once real data is connected.
- [ ] Validate production-like performance (current implementation issues many client-side prediction calls; move to backend aggregate endpoint if needed).

### 4.2 Wire donor-level predictions

- [ ] In `web/src/routes/donors-contributions.tsx`, show per-donor:
  - retention risk label/score (Low/Medium/High)
  - predicted giving value (lifetime)
- [ ] Add sorting/filtering by risk and predicted value.
- [ ] Add loading/error states that do not block entire page render.

### 4.3 Wire resident-level predictions

- [ ] In `web/src/routes/caseload.tsx`, show per-resident:
  - predicted education progress
  - trajectory risk label (`At Risk` / `On Track`)
- [ ] Add quick filters (At Risk only, low-progress thresholds).
- [ ] Make labels and thresholds clear to staff users.

---

## 5) Azure/GitHub Deployment Tasks

- [ ] Confirm GitHub secret `ML_SERVICE_URL` is set for Actions.
- [ ] Confirm ML deployment package includes everything retraining needs:
  - `app/`
  - `pipelines/`
  - `scripts/` (needed for `/admin/retrain/*`)
  - `Dataset/lighthouse_csv_v7/` (or alternate mounted path)
  - `requirements.txt`
- [ ] Update `.github/workflows/main_keeper-intex-pipeline.yml` if missing `scripts/` or `Dataset/`.
- [ ] Trigger `nightly-retrain.yml` manually once and verify all model retrains succeed.
- [ ] Confirm `GET /health` still reports all models loaded after retrain.
- [ ] If retraining fails in Azure, check data path availability inside app service for `Dataset/lighthouse_csv_v7/`.

---

## Notes on Existing Docs

- `TODO.md` is aligned with this checklist and is the best source for remaining DB/data-contract work.
- `ProposedIntegration.md` contains historical context, but some statements are outdated (for example, it says nightly retrain and `train_social_causal.py` are missing, which are now present).

---

## 6) Reliability and Security Checklist

- [ ] Ensure FastAPI `/admin/*` is not publicly exposed without protection.
- [ ] Prefer retrain via ASP.NET Admin endpoint for auth enforcement.
- [ ] Add logging correlation IDs across web -> API -> ML for debugging.
- [ ] Add alerts for:
  - ML health failures
  - retrain failures
  - high prediction error rates/timeouts
- [ ] Validate CORS and HTTPS behavior in production.

---

## 7) Definition of Done

You are fully hooked up when all are true:

- [ ] `/reports` shows live (not sample) ML-derived metrics.
- [ ] Donor and caseload pages show per-entity predictions from real data.
- [ ] Nightly retraining runs successfully and updates model artifacts.
- [ ] Post-retrain health checks pass automatically.
- [ ] Staff/admin can use ML views without manual intervention.

---

## Quick Execution Order (recommended)

1. Restart API and confirm `GET /api/admin/ml/resident-features?take=1000` returns 200.
2. Validate `/reports` shows live donor/resident ML aggregates end-to-end.
3. Add backend aggregate endpoint for reports ML stats (performance hardening).
4. Add ASP.NET retrain/status proxy endpoints.
5. Fix deployment package contents (`scripts` + dataset).
6. Run manual retrain + full UI verification and turn on monitoring/alerts.
