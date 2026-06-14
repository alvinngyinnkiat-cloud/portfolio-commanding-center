# Supabase Setup — Portfolio Command Center

This app persists portfolio data to Supabase when these environment variables are set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If they are missing, the app falls back to **localStorage** (same behaviour as before).

---

## Step 1 — Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Choose an organisation, name (e.g. `portfolio-command-center`), database password, and region.
4. Wait for the project to finish provisioning.

---

## Step 2 — Copy API credentials

1. In the Supabase dashboard, open **Project Settings** → **API**.
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

4. Restart the dev server: `npm run dev`

> Do **not** use the `service_role` key in this app. Only the anon key is supported.

---

## Step 3 — Run the SQL schema

1. In Supabase, open **SQL Editor**.
2. Click **New query**.
3. Open `supabase/schema.sql` from this repository.
4. Copy the entire file contents into the SQL editor.
5. Click **Run**.
6. Confirm success — you should see tables:
   - `settings`
   - `contributions`
   - `goals`
   - `portfolio_snapshots`
   - `stock_transactions`
   - `crypto_transactions`
   - `options_trades`
   - `watchlist_items`

---

## Step 4 — Verify Row Level Security

The schema enables RLS with permissive policies for a **single-user personal app** using the anon key only.

In **Table Editor**, confirm each table shows **RLS enabled** and policies named `pcc_*_all`.

---

## Step 5 — First app load

1. Open the app (`http://localhost:3000`).
2. You will briefly see **“Loading portfolio data…”**.
3. If you had data in **localStorage** and Supabase tables were empty:
   - Data is imported automatically once.
   - A green banner appears: *“Local portfolio data was imported to Supabase.”*
4. New writes sync to Supabase in the background.

---

## Table mapping

| Supabase table | App data |
|----------------|----------|
| `settings` | Dashboard settings, options settings, crypto allocation, scanner/stock schedules, stock instruments/prices/candles, scanner results |
| `contributions` | Settings → Contribution transactions |
| `goals` | Settings → Goals |
| `portfolio_snapshots` | Daily portfolio snapshots |
| `stock_transactions` | Stock Tracker ledger |
| `crypto_transactions` | Crypto Tracker holdings (manual valuation rows) |
| `options_trades` | Options Tracker ledger |
| `watchlist_items` | Scanner watchlist (default 24 tickers preserved) |

Row payloads are stored as JSONB in a `data` column (except `settings`, which uses typed JSONB columns).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Failed to load portfolio data” on startup | Confirm env vars, schema applied, and project is not paused |
| “Supabase sync error” banner after edits | Check browser network tab for 401/403 — re-run `schema.sql` policies |
| Data still in localStorage only | Env vars not loaded — restart dev server after editing `.env.local` |
| Empty app after migration | Expected for a fresh install with no prior localStorage data |

---

## Architecture notes

- Repositories keep the same synchronous interface; an in-memory cache is hydrated from Supabase on load.
- Writes update the cache immediately (UI unchanged), then sync to Supabase asynchronously.
- Calculations and business rules are unchanged — only the persistence layer moved.
