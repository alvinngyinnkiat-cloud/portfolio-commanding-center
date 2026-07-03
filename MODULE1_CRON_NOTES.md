# Module 1 — Manual Snapshots

Snapshots are **manual only**. There is no automatic capture and no Vercel Cron for snapshots.

## Storage

| Layer | Location |
|-------|----------|
| Primary (when Supabase configured) | `portfolio_snapshots` table (JSON `data` column) |
| Local backup on capture | `portfolio:snapshots_backup` in localStorage |
| Legacy local key (preserved) | `portfolio:snapshots` |

Empty local snapshot lists **never** wipe Supabase data.

## Manual capture flow

1. **Capture Snapshot Now** calculates current portfolio metrics.
2. Saves to app cache + queues Supabase sync (`portfolio_snapshots`).
3. Writes/merges local backup (`portfolio:snapshots_backup`).

Success: **Saved to Supabase ✓**  
Supabase failure: **Saved locally only — Supabase failed: [error]**

## Backup export / import

- **Export Snapshots Backup** — downloads merged JSON (app + local backup).
- **Import Snapshots Backup** — loads JSON, dedupes by date (newer `createdAt` wins), saves to `portfolio_snapshots`.

## Related files

- `src/core/database/supabase/sync.ts` — `loadPortfolioSnapshots`, `syncSnapshots`
- `src/core/database/snapshots/snapshot-backup.ts` — local backup + export/import helpers
- `src/core/services/snapshot-service.ts` — manual capture only
- `src/modules/dashboard/settings/DailySnapshotTrigger.tsx` — Settings UI
