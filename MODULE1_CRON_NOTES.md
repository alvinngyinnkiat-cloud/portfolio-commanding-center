# Module 1 — Vercel Cron & Daily Snapshots

## Why browser localStorage cannot be updated by Vercel Cron

Daily snapshots in v1 are stored in **browser localStorage** when you use **Capture Snapshot Now** in Settings. That storage exists only in the user's browser tab.

**Vercel Cron** runs on the server at a scheduled time (15:59 UTC = 11:59 PM Singapore Time). Server code has **no access** to any user's localStorage. A cron job cannot write snapshots into a browser.

## What the cron route does today

| Route | Schedule (Vercel) | SGT equivalent |
|-------|-------------------|----------------|
| `GET /api/cron/daily-snapshot` | `59 15 * * *` | 11:59 PM SGT |

The route is protected with:

```
Authorization: Bearer ${CRON_SECRET}
```

### Option B (current default)

If **Supabase is not configured** (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` missing):

- Cron returns **200** with `enabled: false` and a clear message.
- **No snapshot is written** — the route is prepared but disabled.
- Manual **Capture Snapshot Now** still works in the browser via localStorage.

### When Supabase is configured (future auto snapshot)

If Supabase **is** configured and the `portfolio_snapshots` table exists:

- Cron loads portfolio data from Supabase on the server.
- It runs the same automatic snapshot logic as the in-app scheduler.
- The snapshot is persisted to **`portfolio_snapshots`** in Supabase.
- Browsers that sync with Supabase will see the new snapshot after hydration.

## Manual snapshots (unchanged)

**Capture Snapshot Now** in Settings → Snapshots:

- Works without Supabase.
- Writes to localStorage in the current browser.
- Powers the Daily Portfolio Worth chart for that browser/session.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Bearer token for all `/api/cron/*` routes |
| `NEXT_PUBLIC_SUPABASE_URL` | Enables server-side snapshot persistence |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client for cron hydration/sync |

Set `CRON_SECRET` in Vercel project settings. Vercel Cron sends it automatically when configured; for manual testing:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/daily-snapshot
```

## Migration path

1. **Now:** Manual snapshots in localStorage; cron route returns disabled message without Supabase.
2. **Next:** Configure Supabase + run `supabase/schema.sql` (includes `portfolio_snapshots`).
3. **Then:** Cron at 11:59 PM SGT writes automatic snapshots to Supabase; clients sync on load.

## Related files

- `src/app/api/cron/daily-snapshot/route.ts` — cron entry point
- `src/lib/daily-snapshot-cron.ts` — server handler (disabled vs Supabase capture)
- `src/lib/cron-auth.ts` — `CRON_SECRET` validation
- `src/core/services/snapshot-service.ts` — snapshot creation logic
- `vercel.json` — cron schedule

## Deprecated route

`GET /api/cron/capture-snapshot` delegates to the same handler but is **not** scheduled. Use `/api/cron/daily-snapshot` instead.
