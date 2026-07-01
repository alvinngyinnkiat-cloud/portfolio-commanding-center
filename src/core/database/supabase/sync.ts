import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersistenceCache } from "./cache";
import { watchlistStorageKey } from "./local-export";
import {
  dailySnapshotToRow,
  rowToDailySnapshot,
} from "./daily-snapshot-db";
import { normalizeDailySnapshot } from "@/core/calculations/snapshots";
import { isMissingSupabaseTableError } from "./supabase-errors";
import type { DailySnapshot } from "@/core/domain/types";

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

export async function syncSnapshots(
  client: SupabaseClient,
  rows: PersistenceCache["snapshots"]
): Promise<void> {
  const dailyRes = await client.from("daily_snapshots").delete().neq("snapshot_date", "");
  if (!dailyRes.error) {
    if (rows.length === 0) return;
    const payload = rows.map((row) => dailySnapshotToRow(normalizeDailySnapshot(row)));
    const insertRes = await client.from("daily_snapshots").insert(payload);
    if (insertRes.error) throw insertRes.error;
    return;
  }

  if (!isMissingSupabaseTableError(dailyRes.error, "daily_snapshots")) {
    throw dailyRes.error;
  }

  await replaceTable(client, "portfolio_snapshots", "date", rows);
}

/** Upsert a single snapshot row — used by cron after capture. */
export async function upsertDailySnapshotRow(
  client: SupabaseClient,
  snapshot: DailySnapshot
): Promise<void> {
  const normalized = normalizeDailySnapshot(snapshot);
  const payload = dailySnapshotToRow(normalized);
  const res = await client
    .from("daily_snapshots")
    .upsert(payload, { onConflict: "snapshot_date" });
  if (res.error) throw res.error;
}

export async function loadDailySnapshots(
  client: SupabaseClient
): Promise<DailySnapshot[]> {
  const dailyRes = await client
    .from("daily_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: true });

  if (!dailyRes.error) {
    return (dailyRes.data ?? []).map((row) => rowToDailySnapshot(row));
  }

  if (!isMissingSupabaseTableError(dailyRes.error, "daily_snapshots")) {
    throw dailyRes.error;
  }

  const legacyRes = await client.from("portfolio_snapshots").select("data");
  if (legacyRes.error) throw legacyRes.error;
  return (legacyRes.data ?? []).map((row) => normalizeDailySnapshot(row.data));
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
