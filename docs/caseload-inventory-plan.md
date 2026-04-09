# Caseload inventory — implementation plan

This document describes **`/caseload`** (`web/src/routes/caseload.tsx`), how it relates to **`dbo.residents`** and the existing **`GET /api/admin/residents`** surface, and a practical path to ship real data (read-first, then writes).

## Purpose of the page

Staff and admins use **Caseload Inventory** to browse the active resident/case roster, filter by status, category, safehouse, and risk, open a **detail drawer** (view / edit / add), and see **summary metrics** (total residents, active care, reintegration, critical risk).

## Current state

### Frontend

| Area | Status |
|------|--------|
| **Route** | `/caseload`, **Admin** + **Staff** (`requireRole`) |
| **Data** | **Mock only** — `MOCK_RESIDENTS`, `useState` + local `setResidents`; save handlers say `// TODO: POST/PUT to C# API` |
| **Safehouses** | Hardcoded `SAFEHOUSES` (`sh-001` …) — **not** real `safehouse_id` keys from SQL |
| **Taxonomies** | Hardcoded **case statuses**, **risk levels**, **case categories**, **subcategory lists**, **referral sources** — aligned with UX, not guaranteed to match `dbo.residents` text values |
| **Resident shape** | `ResidentProfile`: rich fields (`full_name`, `civil_status`, `nationality`, `case_subcategories[]`, `reintegration_plan`, etc.) |

### Backend & database

| Area | Status |
|------|--------|
| **`dbo.residents`** | Populated from Lighthouse-style imports (see `docs/import-csv-to-azure-sql.md`, `scripts/Import-Residents.ps1`) |
| **EF Core** | `api.Models.Resident` exists but **`Resident` is not registered** on `AppDbContext` (table managed outside current migrations for app features) |
| **Existing API** | **`GET /api/admin/residents`** returns a **minimal** list (`id`, derived `status`, `case_status`, `resident_code`, `risk_level`) via raw SQL — enough for dashboard metrics, **not** enough for the caseload UI |
| **Writes** | No `POST`/`PUT` residents endpoints in the API |

### Schema ↔ UI gaps (important)

1. **Name** — The UI expects **`full_name`**. The import schema has **`internal_code`**, **`case_control_no`**, but **no dedicated full-name column**. Options: (a) show **internal code + case control** as the display label until a name field exists; (b) add a nullable `full_name` (or split first/last) to SQL + model in a later migration; (c) join another table if names are stored elsewhere.
2. **Case status vocabulary** — UI uses enums such as **Intake**, **Assessment**, **Active Care**, **Reintegration**, **Closed**, **Graduated**. CSV samples use values like **`Active`**, **`Closed`**. You need a **canonical mapping** (DB → UI) or normalize data at import time.
3. **Subcategories** — UI uses **`case_subcategories: string[]`**. The database uses **boolean** columns (`sub_cat_trafficked`, `sub_cat_physical_abuse`, …). The API should either **derive** labels from flags or expose flags and let the client map them.
4. **Demographics** — UI has **`civil_status`**, **`nationality`**. DB has **`birth_status`**, **`place_of_birth`**, **`religion`** — map explicitly or rename labels in the UI to match PH records.
5. **Reintegration** — UI has **`reintegration_plan`** (narrative) and **`reintegration_target_date`**. DB has **`reintegration_type`**, **`reintegration_status`**, dates such as **`date_closed`** — align field names and semantics.
6. **Risk** — UI **`risk_level`** is a single enum. DB has **`initial_risk_level`** and **`current_risk_level`** — pick one for the table (typically **current**) and document.
7. **Restricted notes** — DB has **`notes_restricted`**. Treat as **sensitive**; do not expose to donor-facing APIs; consider staff-only fields in DTOs.

## Recommended phases

### Phase 1 — Read-only caseload list + detail (API + wire-up)

**Status (implemented):** **`GET /api/admin/caseload/residents`** returns full caseload DTOs from **`dbo.residents`** + safehouse name; **`/caseload`** uses React Query + **`GET /api/admin/safehouses`** for filters; add/edit/save is read-only until Phase 2. **`notes_restricted`** is not exposed.

**Goal:** Replace mocks with **`GET /api/admin/caseload/residents`** (name TBD) returning a **caseload DTO** that matches what the page needs (or a slightly smaller v1 subset with sensible defaults).

1. **API design**
   - New endpoint(s), e.g.  
     - `GET /api/admin/caseload/residents` — list (optional `take` / pagination later)  
     - Optional: `GET /api/admin/caseload/residents/{id}` — single row (if list is heavy)  
   - **`[Authorize(Roles = "Admin,Staff")]`** — same as other admin routes.
   - Implement with **raw SQL** (consistent with `GetResidents`) or register **`Resident`** on `AppDbContext` with full column mapping — choose one approach and stick to it for maintainability.

2. **Mapping layer (server-side)**
   - Build **`resident_code`** from `internal_code` / `case_control_no` (same rules as dashboard).
   - Map **`case_status`** / **`case_category`** strings → UI enums where possible; unknown values → pass through or bucket as **“Other”** / raw string.
   - Derive **`case_subcategories`** from boolean subcategory columns (fixed label set per flag).
   - Join **`safehouses`** for **`safehouse_id`** (string) and **`safehouse_name`** — use real IDs from SQL, not `sh-001`.
   - **`full_name`**: interim = `internal_code` or `case_control_no` or `"Resident {id}"` until a proper name column exists.

3. **Lookups**
   - Reuse **`GET /api/admin/safehouses`** (or **`/api/admin/lookups/donor-ui`** pattern) for safehouse dropdowns so filters use IDs that match allocations/residents.

4. **Frontend**
   - **React Query** + `apiGetJson` — same pattern as **Donors & Contributions** and **Admin dashboard**.
   - Replace `MOCK_RESIDENTS` and hardcoded **`SAFEHOUSES`** with API data.
   - Keep **client-side filters** initially; add server-side filter/query params when row counts grow.
   - **Read-only** add/edit/save (like Phase 1 donors page) until Phase 2 — avoids desync between local state and DB.

**Exit criteria:** Caseload table, metrics, and view drawer reflect **live** resident rows; safehouse filter matches DB IDs; no silent mismatch between mock enums and production strings.

### Phase 2 — Persisted create/update

**Goal:** **POST** new resident and **PUT/PATCH** existing rows (or transactional updates to a subset of fields).

1. Validate **safehouse_id** FK, required fields, and date formats.
2. Map UI payload → DB columns; decide how to store **subcategories** (write booleans vs future junction table).
3. **Audit** — who changed what (optional but valuable for case management).
4. **Concurrency** — `rowversion` or `updated_at` if concurrent edits are a concern.

### Phase 3 — Hardening

- **Pagination**, **sorting**, **export** (CSV) for compliance.
- **Search** — server-side full-text or indexed columns if needed.
- **Role nuances** — if **Staff** should see only assigned cases, add filtering by `assigned_social_worker` vs user identity.

## Security & privacy

- Residents are **highly sensitive PII** — enforce **HTTPS**, **auth**, **RBAC**, and avoid logging full payloads in production.
- **`notes_restricted`** — only expose to authorized staff endpoints; never mix into public or donor APIs.

## Related files

| Piece | Location |
|-------|----------|
| Caseload UI | `keeper/web/src/routes/caseload.tsx` |
| Resident model (reference) | `keeper/api/src/Models/Resident.cs` |
| Minimal admin residents API | `keeper/api/src/Controllers/AdminController.cs` (`GET .../residents`) |
| Sample CSV | `keeper/lighthouse_csv_v7/residents.csv` |

## Open decisions

1. **Display name** — interim derivation vs schema change for legal name fields.  
2. **Case status** — normalize in DB, in API only, or both.  
3. **Whether `Resident` should be fully mapped in EF** vs raw SQL for all read paths.  
4. **Scope of edit** — full profile vs phased fields (demographics first, reintegration later).

---

This plan mirrors the **donors-contributions** approach: **ship read-only truth first**, align identifiers and taxonomies, then add writes with clear validation and audit expectations.
