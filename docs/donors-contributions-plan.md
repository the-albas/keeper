# Donors & Contributions page — implementation plan

This document describes the current state of **`/donors-contributions`** (`web/src/routes/donors-contributions.tsx`), how it lines up with the **Keeper API and SQL schema**, and a practical order of work to replace mocks with real data and safe writes.

## Currency (site-wide)

**All monetary donation amounts across Keeper (API, database, public flows, donor portal, admin/staff UI) are in Philippine pesos (PHP).** Treat `donations.amount`, `donation_allocations.amount_allocated`, `estimated_value`, and related fields as **peso** values unless the product explicitly adds multi-currency support later. Display formatting (e.g. `₱`, `en-PH`) should stay consistent with that assumption.

## Current state

### Frontend (what exists today)

- **Route:** `/donors-contributions`, **roles:** Admin + Staff (`beforeLoad` via `requireRole`).
- **Two tabs:** **Supporters** (table + side panel: view / add / edit) and **Contributions** (metrics, allocation bar chart, filters, table, “Log Contribution” form).
- **Data:** entirely **in-memory mock** (`MOCK_SUPPORTERS`, `MOCK_CONTRIBUTIONS`). Save handlers append/update local state only; comments say `// TODO: POST to your C# API endpoint`.
- **Dropdowns:** **hardcoded** lists — `SAFEHOUSES`, `PROGRAMS`, `CAMPAIGNS`, payment methods, social platforms, supporter/contribution type enums.
- **Metrics:** derived client-side from mock arrays (total supporters, active count, total monetary, count of non-monetary rows, allocation-by-program for monetary only).

### Backend (what exists today)

| Area | Status |
|------|--------|
| **`supporters`** table + EF `Supporters` | Used for signup (`AuthController`), donor linkage (`/api/auth/me` supporter id), **`GET /api/donor/donations`** (current donor’s gifts), public donation posting |
| **`donations`**, **`donation_allocations`** | Public create flow, donor history, admin dashboard recent list |
| **Admin list APIs** | `GET /api/admin/donations/recent` (not wired to this page) |
| **CRUD for staff-managed supporters / logged contributions** | **Not implemented** |

### Schema vs UI model (important gaps)

**Supporters**

- DB (`api.Models.Supporter`): `supporter_type`, `display_name` / `first_name` / `last_name`, `organization_name`, `email`, `phone`, `status`, `created_at`, `first_donation_date`, `acquisition_channel`, etc.
- UI `Supporter`: single **`name`**, **`joined_date`**, **`is_anonymous`**, and display-oriented **`supporter_type`** / **`status`** strings with **spaces** (e.g. `"Monetary Donor"`).
- **Signup** writes `SupporterType = "MonetaryDonor"` (no space). You will need a **canonical mapping** (DB ↔ UI labels) so filters and badges stay consistent.
- **`is_anonymous`:** not a column today; anonymity may be implied (empty contact fields, or a future flag). Decide whether to add a DB column or derive display rules from existing fields.

**Contributions**

- UI models **five** contribution types: Monetary, In-Kind, Time / Volunteer, Skills, Social Media — with type-specific fields (hours, platform, reach, etc.).
- DB **`donations`** is one row per gift with `donation_type`, `amount`, `estimated_value`, `campaign_name`, `channel_source`, `notes`, etc. **`donation_allocations`** tie money to `safehouse_id` + `program_area`.
- **`in_kind_donation_items`** exists as a **C# model** but is **not registered** in `AppDbContext` yet; no API uses it.
- **Volunteer / skills / social** “contributions” are **not** clearly modeled as separate entities in the current EF surface. Options: (a) store them as **`donations`** rows with a distinct `donation_type` and JSON/notes for extra fields, (b) add dedicated tables later, or (c) **phase 1:** only wire **monetary** (+ optional **in-kind** via donations + items) and keep other types mock/read-only until product decides.

---

## Recommended phases

### Phase 1 — Read-only “truth” (low risk, high value)

**Goal:** Replace mocks with API-driven lists so metrics and tables reflect **`supporters`**, **`donations`**, **`donation_allocations`**, and **`safehouses`**.

1. **API (Admin/Staff)**  
   - `GET /api/admin/supporters` — paged or capped list; map DB fields to the shape the UI needs (or add a thin DTO layer with explicit `snake_case` JSON to match the page).  
   - `GET /api/admin/contributions` — join `donations` → `supporters` (name/email), → allocations (safehouse name, `program_area`). Return a unified row for the contributions table; **contribution_type** can be derived from `donation_type` / presence of in-kind rows later.  
   - `GET /api/admin/lookups/safehouses` (or reuse/extend existing safehouse list) and optionally **`/lookups/programs`** if program areas are fixed vs distinct query from `donation_allocations.program_area`.

2. **Frontend**  
   - Replace `useState(MOCK_*)` with **React Query** + `apiGetJson`, same pattern as `/admin` dashboard.  
   - Keep filters **client-side** initially if volumes are small; move search/filter to server when needed.  
   - **Dropdowns:** load safehouse names from API (match by **id**, not display string). Replace hardcoded `SAFEHOUSES` / `PROGRAMS` with API-backed options (programs may be distinct `SELECT DISTINCT program_area ...`).

3. **Mapping rules (document in code)**  
   - **`name`:** prefer `display_name`; else `first_name` + `last_name`; else organization.  
   - **`joined_date`:** map from `created_at` or `first_donation_date` (product choice).  
   - **Monetary totals / allocation chart:** replicate current UI logic using **only monetary donation rows** from the API so the bar chart stays meaningful.

**Exit criteria:** Page loads real supporters and monetary (and optionally in-kind) contributions; metrics match summed data; no staff writes yet.

### Phase 2 — Staff writes (supporters)

**Goal:** “Add supporter” / “Edit supporter” persist to **`supporters`**.

1. **API**  
   - `POST /api/admin/supporters` — validate email uniqueness if required; assign `supporter_id` (same pattern as signup: max+1 or identity if you change schema).  
   - `PUT /api/admin/supporters/{id}` — partial update; audit who changed what if needed later.

2. **Identity overlap**  
   - If email matches an **AspNetUsers** account, define behavior (link vs read-only vs warn). Align with `DONOR_ACCOUNT_DELETE.md` and donor privacy expectations.

3. **Frontend**  
   - Invalidate React Query keys on success; handle validation errors from API.

### Phase 3 — Staff writes (contributions / donations)

**Goal:** “Log Contribution” creates **`donations`** (+ **`donation_allocations`** as needed).

1. **Monetary**  
   - `POST /api/admin/donations` — body: supporter id, amount (**PHP**), date, campaign, channel/payment method, notes; optional allocation (safehouse id + program area). Transactionally insert donation + allocation rows. (No multi-currency until explicitly scoped; see **Currency (site-wide)** above.)

2. **In-kind**  
   - Register **`DbSet<InKindDonationItem>`** (and migration if table not aligned) or store summary in `donations.notes` / `estimated_value` until items are required. Link items to `donation_id`.

3. **Non-monetary types (volunteer, skills, social)**  
   - Either **defer** (keep UI disabled with tooltip) or represent minimally as **`donations`** with `amount = 0`, `estimated_value` for valuation, and structured **notes** until a proper schema exists.

### Phase 4 — Hardening

- **Pagination / sorting** for large datasets.  
- **Server-side filters** for contributions (date range, supporter, safehouse).  
- **Authorization:** confirm only Admin/Staff; add audit logging for financial rows if compliance requires it.  
- **Tests:** API integration tests for list + create; smoke test for mapper from DB → UI DTO.

---

## API shape (suggested)

Keep responses consistent with the existing admin pattern (**snake_case** JSON optional but helps avoid churn in `donors-contributions.tsx`).

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/admin/supporters` | List supporters for table + supporter picker |
| `POST` | `/api/admin/supporters` | Create supporter |
| `PUT` | `/api/admin/supporters/{id}` | Update supporter |
| `GET` | `/api/admin/contributions` | List donation rows enriched for contributions tab |
| `POST` | `/api/admin/donations` | Log monetary (and later in-kind) gift |

All under **`[Authorize(Roles = "Admin,Staff")]`** (same as `AdminController`).

---

## Open decisions (resolve before Phase 2–3)

1. **Canonical supporter type values** — UI list vs DB strings (`MonetaryDonor` vs `"Monetary Donor"`): one source of truth and a mapping table or enum in API.  
2. **Anonymous supporters** — column vs derived behavior.  
3. **Which non-monetary contribution types** are in scope for v1 vs roadmap-only.  
4. **Receipt numbers** — column on `donations` vs generate in API; check if CSV/schema already has a field.  
5. **Campaign list** — free text vs constrained list; distinct from `donations.campaign_name` in DB.

---

## File references

| Piece | Location |
|-------|----------|
| Page UI | `keeper/web/src/routes/donors-contributions.tsx` |
| Supporter entity | `keeper/api/src/Models/Supporter.cs` |
| Donations / allocations | `keeper/api/src/Models/Donation.cs`, `DonationAllocation.cs` |
| EF context | `keeper/api/src/Data/AppDbContext.cs` |
| Prior admin API pattern | `keeper/api/src/Controllers/AdminController.cs` |

This plan lets you ship **read-only accuracy first**, then **incremental writes** without blocking on a full CRM schema for volunteer/social tracking.
