# Module 1 — Vercel Cron & Daily Snapshots

## Storage model

| Mode | Manual capture | Auto capture (11:59 PM SGT) |
|------|----------------|----------------------------|
| **Supabase configured** | `daily_snapshots` table | Vercel Cron → `/api/cron/daily-snapshot` → `daily_snapshots` |
| **Local only (no Supabase)** | Browser localStorage | Not available — cron returns error |

Vercel Cron runs on the **server** and cannot write browser localStorage. Automatic snapshots require **Supabase** with the `daily_snapshots` table.

## Supabase table: `daily_snapshots`

One row per **Singapore calendar date** (`snapshot_date` UNIQUE). Re-capturing the same date overwrites that row.

Run the `daily_snapshots` block in `supabase/schema.sql` in your Supabase SQL editor.

Legacy `portfolio_snapshots` (JSON blob) is still read for migration; new writes go to `daily_snapshots`.

## Cron schedule

| Route | Vercel cron | Singapore time |
|-------|-------------|----------------|
| `GET` or `POST `/api/cron/daily-snapshot` | `59 15 * * *` | 11:59 PM SGT |

Security: `Authorization: Bearer ${CRON_SECRET}`

## Environment variables

| Variable | Required for auto snapshot |
|----------|---------------------------|
| `CRON_SECRET` | Yes (Vercel Cron auth) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |

## Manual capture

**Capture Snapshot Now** (Settings → Snapshots) still works:

- With Supabase: saves to `daily_snapshots` and syncs across devices after refresh.
- Without Supabase: saves to localStorage in the current browser only.

## Deploy checklist

1. Run `daily_snapshots` DDL from `supabase/schema.sql`.
2. Set Supabase env vars on Vercel.
3. Set `CRON_SECRET` on Vercel.
4. Deploy — cron is configured in `vercel.json`.

## Test cron locally

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/daily-snapshot
```

Expected without Supabase: HTTP 500, `reason: "supabase_required"`.

Expected with Supabase + valid portfolio data: HTTP 200, `captured: true`.

## Related files

- `src/app/api/cron/daily-snapshot/route.ts`
- `src/lib/daily-snapshot-cron.ts`
- `src/core/database/supabase/daily-snapshot-db.ts`
- `src/core/services/snapshot-service.ts`
- `src/core/calculations/snapshot-schedule.ts`
