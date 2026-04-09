# Admin dashboard — follow-up data work

This document tracks the next slice of analytics and UX for the admin dashboard after the main metrics and list endpoints (`/api/admin/residents`, `/api/admin/donations/recent`, `/api/admin/safehouses`). **Quick actions** and **recent activity** are intentionally deferred.

## Donation trends

**Current behavior:** The chart aggregates whatever donation rows the client loads (see `DonationTrends` + `GET /api/admin/donations/recent`). The summary card “Recent Donations” sums the **first 30** rows (newest first).

**Improvements to consider:**

- **Dedicated time series API** — e.g. `GET /api/admin/donations/by-month?from=…&to=…` returning `{ month, totalAmount, count }` so the chart does not depend on pulling hundreds of raw rows and the UI can show consistent windows (FY, calendar year, trailing 12 months).
- **In-kind vs cash in charts** — monetary totals are **PHP (pesos)** site-wide; still clarify whether series should separate cash `amount` from in-kind `estimated_value` where both appear; split series or label tooltips if needed.
- **Compare to prior period** — optional second series or delta for “vs last month / vs last year.”
- **Empty states** — explicit copy when there are no donations in range.

## Safehouse occupancy

**Current behavior:** Occupancy uses `safehouses.capacity_girls` and `safehouses.current_occupancy` from the API (`AdminSafehouseDto`). The progress bar is `current_occupancy / capacity` when `capacity > 0`.

**Improvements to consider:**

- **Ground truth vs snapshot** — if `current_occupancy` can drift, derive occupancy from **`residents`** (`date_closed IS NULL` grouped by `safehouse_id`) and compare to the stored column; reconcile or document which is authoritative.
- **Alerts** — flag safehouses above a threshold (e.g. 90% of capacity) or at zero with active intakes.
- **Staff capacity** — `capacity_staff` exists in the schema but is not surfaced; add if operations cares.
- **Historical occupancy** — `safehouse_monthly_metrics` (if populated) can back a sparkline or month-over-month chart.

## Cases needing attention

**Current behavior:** The “Cases Needing Attention” table (`CasesTable`) filters client-side: **Active** residents with **High** or **Critical** risk, or **Assessment** case status. **Pending Reviews** on the metric strip counts `case_status` in `Assessment` or `Active Care`.

**Improvements to consider:**

- **Server-side rules** — move the “needs attention” predicate into SQL or a small domain service so lists, counts, and exports stay consistent (and pagination works when resident volume grows).
- **Define “Active”** — aligned with API: `date_closed IS NULL` → `status = Active`. Document any exceptions (e.g. administrative closure).
- **Risk normalization** — DB values may vary in casing; API already title-cases a single word; multi-word levels may need a mapping table.
- **SLA / aging** — incorporate `date_of_admission`, `date_case_study_prepared`, or review due dates if those fields gain reliable usage.
- **Staff assignment** — surface `assigned_social_worker` in the table or filters when ready.

---

When implementing, prefer **one source of truth** for each metric (either computed columns, views, or explicit API DTOs) so the dashboard cards and detail widgets cannot disagree.
