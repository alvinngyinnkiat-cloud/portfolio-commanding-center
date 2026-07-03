import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersistenceCache } from "./cache";
import { watchlistStorageKey } from "./local-export";
import { normalizeDailySnapshot } from "@/core/calculations/snapshots";
import type { DailySnapshot } from "@/core/domain/types";

export async function loadPortfolioSnapshots(
  client: SupabaseClient
): Promise<DailySnapshot[]> {
  const res = await client
    .from("portfolio_snapshots")
    .select("data")
    .order("date", { ascending: true });

  if (res.error) throw res.error;
  return (res.data ?? []).map((row) => normalizeDailySnapshot(row.data));
}

export async function syncSettingsRow(
  client: SupabaseClient,
  cache: PersistenceCache
): Promise<void> {
  const res = await client.from("settings").upsert({
    id: "default",
    dashboard_settings: cache.dashboardSettings,
    options_settings: cache.optionsSettings,
    crypto_allocation_settings: cache.cryptoAllocation,
    scanner_schedule: cache.scannerSchedule,
    stock_price_schedule: cache.stockPriceSchedule,
    stock_instruments: cache.stockInstruments,
    stock_prices: cache.stockPrices,
    stock_daily_candles: cache.stockDailyCandles,
    stock_weekly_candles: cache.stockWeeklyCandles,
    scanner_results: cache.scannerResults,
    migrated_from_local: cache.migratedFromLocal,
    updated_at: new Date().toISOString(),
  });
  if (res.error) throw res.error;
}

export async function syncContributions(
  client: SupabaseClient,
  rows: PersistenceCache["contributions"]
): Promise<void> {
  await replaceTable(client, "contributions", "id", rows);
}

export async function syncGoals(
  client: SupabaseClient,
  rows: PersistenceCache["goals"]
): Promise<void> {
  await replaceTable(client, "goals", "id", rows);
}

/** Sync snapshots to portfolio_snapshots — never wipes when rows is empty. */
export async function syncSnapshots(
  client: SupabaseClient,
  rows: PersistenceCache["snapshots"]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const normalized = rows.map((row) => normalizeDailySnapshot(row));

  for (const snapshot of normalized) {
    const res = await client.from("portfolio_snapshots").upsert(
      {
        date: snapshot.date,
        data: snapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "date" }
    );
    if (res.error) throw res.error;
  }

  const keepDates = new Set(normalized.map((row) => row.date));
  const existingRes = await client.from("portfolio_snapshots").select("date");
  if (!existingRes.error && existingRes.data) {
    for (const row of existingRes.data) {
      if (!keepDates.has(row.date)) {
        const del = await client
          .from("portfolio_snapshots")
          .delete()
          .eq("date", row.date);
        if (del.error) throw del.error;
      }
    }
  }
}

export async function syncStockTransactions(
  client: SupabaseClient,
  rows: PersistenceCache["stockTransactions"],
  options?: { allowEmpty?: boolean }
): Promise<void> {
  await replaceTable(client, "stock_transactions", "id", rows, options?.allowEmpty);
}

export async function syncCryptoHoldings(
  client: SupabaseClient,
  rows: PersistenceCache["cryptoHoldings"],
  options?: { allowEmpty?: boolean }
): Promise<void> {
  await replaceTable(client, "crypto_transactions", "id", rows, options?.allowEmpty);
}

export async function syncCryptoTrades(
  client: SupabaseClient,
  rows: PersistenceCache["cryptoTrades"],
  options?: { allowEmpty?: boolean }
): Promise<void> {
  await replaceTable(client, "crypto_trades", "id", rows, options?.allowEmpty);
}

export async function syncOptionsTrades(
  client: SupabaseClient,
  rows: PersistenceCache["optionsTrades"]
): Promise<void> {
  await replaceTable(client, "options_trades", "id", rows);
}

export async function syncStockFxConversions(
  client: SupabaseClient,
  rows: PersistenceCache["stockFxConversions"]
): Promise<void> {
  await replaceTable(client, "stock_fx_conversions", "id", rows);
}

export async function syncWatchlist(
  client: SupabaseClient,
  rows: PersistenceCache["scannerWatchlist"]
): Promise<void> {
  const deleteRes = await client.from("watchlist_items").delete().neq("id", "");
  if (deleteRes.error) throw deleteRes.error;

  if (rows.length === 0) return;

  const payload = rows.map((entry, index) => ({
    id: watchlistStorageKey(entry, index),
    ticker: entry.ticker,
    data: entry,
    sort_order: index,
    updated_at: new Date().toISOString(),
  }));

  const insertRes = await client.from("watchlist_items").insert(payload);
  if (insertRes.error) throw insertRes.error;
}

async function replaceTable<T extends { id?: string; date?: string }>(
  client: SupabaseClient,
  table:
    | "contributions"
    | "goals"
    | "portfolio_snapshots"
    | "stock_transactions"
    | "crypto_transactions"
    | "crypto_trades"
    | "options_trades"
    | "stock_fx_conversions",
  key: "id" | "date",
  rows: T[],
  allowEmpty = false
): Promise<void> {
  if (rows.length === 0 && !allowEmpty) {
    return;
  }

  const deleteRes = await client.from(table).delete().neq(key, "");
  if (deleteRes.error) throw deleteRes.error;

  if (rows.length === 0) return;

  const payload = rows.map((row) => ({
    [key]: key === "date" ? (row as { date: string }).date : (row as { id: string }).id,
    data: row,
    updated_at: new Date().toISOString(),
  }));

  const insertRes = await client.from(table).insert(payload);
  if (insertRes.error) throw insertRes.error;
}
