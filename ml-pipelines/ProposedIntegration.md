# Plan: Wire ML Pipelines into the Frontend + Nightly Retraining

## Context
The ML service (FastAPI), ASP.NET proxy (`MlController`), and all 6 trained `.sav` artifacts are fully in place. The gap is:
1. No ML predictions appear anywhere in the frontend UI
2. No nightly retraining schedule exists

The strategy: wire up a working ML Insights UI **now using hardcoded sample inputs** (no DB needed), then the DB person can swap in real data later as a one-line change per query. Notebooks are never touched — separate training scripts already exist in `ml-pipelines/scripts/`.

---

## Part 1 — ML Insights UI (no DB required)

### What we're adding to `reports.tsx`

A new **"ML Predictions"** section at the bottom of the page (above the mock-data note), with 4 stat cards. Each card fires a `useQuery` that calls `POST /api/ml/{pipeline}/predict` with a hardcoded representative donor or resident profile. The sample inputs are shown explicitly in small text under each card so it's clear these are illustrative until real data is wired.

| Card | Pipeline | What it shows |
|------|----------|---------------|
| **Donor Retention Score** | `retention` | Probability (0–100%) that a sample donor will give again. Color-coded: green ≥70%, yellow 40–69%, red <40%. |
| **Predicted Contribution** | `growth` | Forecasted total donation value (₱) for a sample mid-tier donor profile. |
| **Resident Education Progress** | `girls-progress` | Predicted education progress score (0–100) for a sample resident at program midpoint. |
| **At-Risk Residents** | `girls-trajectory` | Risk classification (Low / Medium / High) for a sample resident profile. |

Each card also has a small badge: **"Sample Input"** — replaced by a **"Live"** badge once DB data flows in.

**The key insight:** Because the ML endpoints accept raw feature values in the POST body, the frontend doesn't need the database at all to call them. Real data just replaces the hardcoded object inside `useQuery`'s `queryFn`. The UI, loading states, and error handling stay identical.

**Sample call pattern (using existing `apiGetJson`):**
```ts
const { data: retention } = useQuery({
  queryKey: ["ml", "retention", "sample"],
  queryFn: () =>
    apiGetJson<{ predicted_label: number; probability: number }>(
      "/api/ml/retention/predict",
      {
        method: "POST",
        body: JSON.stringify({
          frequency: 3,
          avg_monetary_value: 5000,
          social_referral_count: 1,
          is_recurring_donor: false,
          top_program_interest: "Education",
        }),
      }
    ),
  staleTime: Infinity, // sample inputs never change
});
```

When the DB person is ready, they replace the hardcoded object with real donor aggregates from `/api/donor/donations` — no other changes needed.

### Also fix in `reports.tsx`: auth query stub
Replace the hardcoded user return with the real auth endpoint:
```ts
queryFn: () => apiGetJson<AuthMeResponse>("/api/auth/me"),
```

---

## Part 2 — Per-entity predictions (add last, needs DB)

These are lower priority and blocked on the DB person adding endpoints. Wire them once data is available — the UI structure will already be clear from Part 1.

- `donors-contributions.tsx` → per-donor retention + growth predictions (uses donor feature data)
- `caseload.tsx` → per-resident girls-progress + girls-trajectory predictions (uses resident data)

---

## Part 3 — Nightly Retraining at 2am

### What already exists
- `ml-pipelines/scripts/train_*.py` — 5 standalone training scripts (NOT notebooks)
- `ml-pipelines/app/routers/admin.py` — `POST /admin/retrain/{model}` endpoint, already handles threading lock and hot-reload of `.sav` files without restart
- `.sav` files are in `ml-pipelines/pipelines/` — separate from notebooks

**Notebooks are never touched.** The `.ipynb` files in `notebooks/` are source documentation only. The `scripts/` directory contains the actual training code that runs in production.

### One gap: `train_social_causal.py` is missing
`admin.py` references `scripts.train_social_causal` but the file doesn't exist. We need to create `ml-pipelines/scripts/train_social_causal.py` (modeled after the other train scripts, mirroring the logic from `notebooks/social_media_causal_boost.ipynb`). This is a copy — the notebook is never modified.

### Retraining schedule: GitHub Actions cron workflow

Add a new file: **`.github/workflows/nightly-retrain.yml`**

```yaml
name: Nightly Model Retraining

on:
  schedule:
    - cron: '0 18 * * *'   # 2:00 AM Philippine Standard Time (UTC+8)
  workflow_dispatch:         # Allow manual trigger

jobs:
  retrain:
    runs-on: ubuntu-latest
    steps:
      - name: Retrain all models
        run: |
          ML_URL="${{ secrets.ML_SERVICE_URL }}"
          for model in retention growth social_engagement girls_progress girls_trajectory social_causal; do
            echo "Retraining $model..."
            curl -sf -X POST "$ML_URL/admin/retrain/$model" \
              -H "Content-Type: application/json" || echo "WARNING: $model retrain failed"
          done
```

This calls the existing `/admin/retrain/{model}` FastAPI endpoint for each model. The endpoint:
- Loads the dataset from `Dataset/lighthouse_csv_v7/` (already on the Azure server)
- Runs the corresponding `scripts/train_*.py`
- Writes new `.sav` files to `pipelines/`
- Hot-reloads into `app.state` — no service restart required

**One secret to add in GitHub:** `ML_SERVICE_URL` = the deployed Azure URL of `keeper-intex-pipeline`.

> ⚠️ **Dataset note**: The dataset must exist on the Azure App Service instance at the expected path. Confirm with your team that `Dataset/lighthouse_csv_v7/` is deployed alongside the app (currently the GitHub Actions workflow copies `app/`, `pipelines/`, and `requirements.txt` to the deploy package — the dataset directory may need to be added).

---

## Critical files

| File | Change |
|------|--------|
| `web/src/routes/reports.tsx` | Fix auth query; add ML Predictions section (4 cards, hardcoded inputs) |
| `ml-pipelines/scripts/train_social_causal.py` | **New file** — copy of causal notebook logic as a training script |
| `.github/workflows/nightly-retrain.yml` | **New file** — cron job hitting `/admin/retrain/{model}` |
| `web/src/routes/donors-contributions.tsx` | **Later** — per-donor predictions once DB endpoints exist |
| `web/src/routes/caseload.tsx` | **Later** — per-resident predictions once DB endpoints exist |

**Not touched:** `api/src/Controllers/MlController.cs`, `web/src/lib/api.ts`, any `.ipynb` notebook, any existing `.sav` file.

---

## Verification
1. Run all three services locally
2. `/reports` page shows 4 ML prediction cards with sample values (not loading/error state)
3. Check GitHub Actions → nightly-retrain workflow runs successfully (trigger manually with `workflow_dispatch`)
4. After retrain, `GET /health` on the ML service shows all pipelines still loaded
5. Confirm `.sav` file timestamps updated after retrain
