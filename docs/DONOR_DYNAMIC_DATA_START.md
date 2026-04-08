# Donor Page Dynamic Data Start Guide

This document outlines how to replace placeholder donor dashboard values with live API-backed data.

## Goals

- Replace placeholder calculations for **girls supported** with API-driven values.
- Update the **Donation Allocation** card to show **campaign contribution**.
- Ensure the **Donation History component** is fed by live donations data.
- Add a **Mission Impact** section sourced from real metrics.

## Current Donor Page Data Needs

Route: `web/src/routes/donor.tsx`

Components on the page:
- `DonorMetrics` (top metrics cards)
- `AllocationChart` (currently based on allocation field)
- `DonationHistory` (table)
- `OutcomesChart` (currently static visual)

## Target Data Contract

Use one donor-specific endpoint that returns dashboard-ready aggregates and details:

`GET /api/dashboard/donor-impact?email={donorEmail}`

Recommended response shape:

```json
{
  "donor": {
    "email": "donor@example.com",
    "name": "Donor Name"
  },
  "metrics": {
    "totalDonated": 25000,
    "girlsSupported": 42,
    "campaignsSupported": 3,
    "safehousesReached": 2
  },
  "campaignContributions": [
    { "campaign": "Back to School", "amount": 12000 },
    { "campaign": "Emergency Shelter", "amount": 8000 },
    { "campaign": "Health & Nutrition", "amount": 5000 }
  ],
  "donations": [
    {
      "id": "184",
      "date": "2026-03-01",
      "type": "Monetary",
      "campaign": "Back to School",
      "amount": 5000,
      "allocation": "Education"
    }
  ],
  "missionImpact": [
    { "label": "Girls retained in school", "value": 31, "unit": "%" },
    { "label": "Residents reintegrated", "value": 18, "unit": "" },
    { "label": "Safehouse occupancy supported", "value": 64, "unit": "%" }
  ]
}
```

## Implementation Steps

### 1) Replace placeholder metric logic

In `web/src/routes/donor.tsx`:
- Remove derived fallback formulas for `girlsSupported` and other cards.
- Bind `DonorMetrics` directly to `data.metrics`.

### 2) Change Donation Allocation to Campaign Contribution

In `web/src/components/donor/AllocationChart.tsx`:
- Group chart values by `campaign` (not `allocation`).
- Rename heading to `Campaign Contribution`.
- Keep fallback label for blank campaigns as `General / Unspecified`.

### 3) Feed Donation History from API

In `web/src/components/donor/DonationHistory.tsx`:
- Continue using donations array, but source it from `donor-impact.donations`.
- Ensure date formatting and amount formatting remain consistent.

### 4) Add Mission Impact section

Create new component:
- `web/src/components/donor/MissionImpact.tsx`

Expected props:
- `items: Array<{ label: string; value: number; unit?: string }>`

Render:
- 3-4 compact cards under charts showing outcomes tied to donor contributions.

### 5) Wire query in donor route

In `web/src/routes/donor.tsx`:
- Query `auth/me`.
- Query `donor-impact` using authenticated donor email.
- Drive all donor page components from this single payload.

## Suggested Frontend Types

```ts
type MissionImpactItem = {
  label: string;
  value: number;
  unit?: string;
};

type DonorImpactResponse = {
  donor: {
    email: string;
    name: string;
  };
  metrics: {
    totalDonated: number;
    girlsSupported: number;
    campaignsSupported: number;
    safehousesReached: number;
  };
  campaignContributions: Array<{
    campaign: string;
    amount: number;
  }>;
  donations: Array<{
    id: string;
    date: string;
    type?: string;
    campaign?: string;
    amount: number;
    allocation?: string;
  }>;
  missionImpact: MissionImpactItem[];
};
```

## Suggested Backend Notes

- Keep donor filtering on server side using authenticated user context whenever possible.
- Use `campaign_name` aggregation from donations for campaign contribution chart.
- Compute `girlsSupported` on backend with a transparent rule (or explicit stored metric), not a UI estimate.
- Return mission impact as explicit values from reporting tables or curated KPI logic.

## Definition of Done

- No placeholder math remains for donor metrics.
- Campaign chart shows campaign-based contribution totals.
- Donation table renders real donor donation records.
- Mission impact block renders with live values from API.
- Empty states are handled for new donors with no contributions yet.
