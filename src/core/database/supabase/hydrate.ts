import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersistenceCache } from "./cache";
import { createEmptyCache, normalizeCache } from "./cache";
import {
  normalizeCryptoAllocationSettings,
  normalizeCryptoHoldings,
} from "@/core/calculations/crypto/normalize";
import { normalizeCryptoTrades } from "@/core/calculations/crypto/trade-normalize";
import { DEFAULT_SCANNER_WATCHLIST } from "@/core/calculations/scanner/watchlist";
import { normalizeDashboardSettings } from "@/core/database/local/normalize-settings";
import { normalizeDailySnapshot } from "@/core/calculations/snapshots";
import { loadPortfolioSnapshots, syncSnapshots } from "./sync";
import { normalizeStockPrice } from "@/core/calculations/stocks/price-normalize";
import { normalizeStockTransactions } from "@/core/calculations/stocks/transaction-normalize";
import { normalizeOptionsSettings } from "@/core/domain/defaults-options";
import { normalizeOptionsTradesForStorage } from "@/core/calculations/options/trade-dates";
import type { WatchlistEntry } from "@/core/calculations/scanner/watchlist";
import {
  resolveFetchSymbol,
  SCANNER_CATEGORIES,
} from "@/core/calculations/scanner/watchlist";
import type { ScannerCategory } from "@/core/domain/types/scanner";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { watchlistStorageKey } from "./local-export";
import { isMissingSupabaseTableError } from "./supabase-errors";

function isOptionalTableQueryError(error: unknown, tableName: string): boolean {
  return isMissingSupabaseTableError(error, tableName);
}

function normalizeWatchlistEntry(raw: WatchlistEntry): WatchlistEntry {
  const ticker = normalizeTicker(raw.ticker);
  const category = SCANNER_CATEGORIES.includes(raw.category as ScannerCategory)
    ? (raw.category as ScannerCategory)
    : "Custom";
  return {
    ticker,
    fetchSymbol: resolveFetchSymbol(ticker, raw.fetchSymbol),
    category,
    market: "US",
    active: raw.active !== false,
  };
}

export async function isSupabaseDatastoreEmpty(
  client: SupabaseClient
): Promise<boolean> {
  const [
    settingsRes,
    contributionsRes,
    goalsRes,
    snapshotsRes,
    stockRes,
    cryptoRes,
    optionsRes,
    watchlistRes,
  ] = await Promise.all([
    client.from("settings").select("migrated_from_local").eq("id", "default").maybeSingle(),
    client.from("contributions").select("id", { count: "exact", head: true }),
    client.from("goals").select("id", { count: "exact", head: true }),
    client.from("portfolio_snapshots").select("date", { count: "exact", head: true }),
    client.from("stock_transactions").select("id", { count: "exact", head: true }),
    client.from("crypto_transactions").select("id", { count: "exact", head: true }),
    client.from("options_trades").select("id", { count: "exact", head: true }),
    client.from("watchlist_items").select("id", { count: "exact", head: true }),
  ]);

  if (settingsRes.error) throw settingsRes.error;
  if (contributionsRes.error) throw contributionsRes.error;
  if (goalsRes.error) throw goalsRes.error;

  if (snapshotsRes.error) throw snapshotsRes.error;

  if (stockRes.error) throw stockRes.error;
  if (cryptoRes.error) throw cryptoRes.error;
  if (optionsRes.error) throw optionsRes.error;
  if (watchlistRes.error) throw watchlistRes.error;

  const migrated = settingsRes.data?.migrated_from_local === true;
  const hasRows =
    (contributionsRes.count ?? 0) > 0 ||
    (goalsRes.count ?? 0) > 0 ||
    (snapshotsRes.count ?? 0) > 0 ||
    (stockRes.count ?? 0) > 0 ||
    (cryptoRes.count ?? 0) > 0 ||
    (optionsRes.count ?? 0) > 0 ||
    (watchlistRes.count ?? 0) > 0;

  return !migrated && !hasRows;
}

export async function hydrateCacheFromSupabase(
  client: SupabaseClient
): Promise<PersistenceCache> {
  const cache = createEmptyCache();

  const settingsRes = await client
    .from("settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  if (settingsRes.error) throw settingsRes.error;

  if (settingsRes.data) {
    const row = settingsRes.data;
    cache.dashboardSettings = normalizeDashboardSettings(
      row.dashboard_settings ?? cache.dashboardSettings
    );
    cache.optionsSettings = normalizeOptionsSettings(
      row.options_settings ?? cache.optionsSettings
    );
    cache.cryptoAllocation = normalizeCryptoAllocationSettings(
      row.crypto_allocation_settings
    );
    cache.scannerSchedule = row.scanner_schedule ?? cache.scannerSchedule;
    cache.stockPriceSchedule = row.stock_price_schedule ?? cache.stockPriceSchedule;
    cache.stockInstruments = row.stock_instruments ?? [];
    cache.stockPrices = (row.stock_prices ?? []).map((item: unknown) =>
      normalizeStockPrice(item as Parameters<typeof normalizeStockPrice>[0])
    );
    cache.stockDailyCandles = row.stock_daily_candles ?? [];
    cache.stockWeeklyCandles = row.stock_weekly_candles ?? [];
    cache.scannerResults = row.scanner_results ?? cache.scannerResults;
    cache.migratedFromLocal = row.migrated_from_local === true;
  }

  const [contributionsRes, goalsRes, stockRes, cryptoRes, cryptoTradesRes, optionsRes, fxRes, watchlistRes] =
    await Promise.all([
      client.from("contributions").select("data"),
      client.from("goals").select("data"),
      client.from("stock_transactions").select("data"),
      client.from("crypto_transactions").select("data"),
      client.from("crypto_trades").select("data"),
      client.from("options_trades").select("data"),
      client.from("stock_fx_conversions").select("data"),
      client.from("watchlist_items").select("data, sort_order").order("sort_order"),
    ]);

  for (const res of [
    contributionsRes,
    goalsRes,
    stockRes,
    cryptoRes,
    optionsRes,
    watchlistRes,
  ]) {
    if (res.error) throw res.error;
  }

  if (fxRes.error && !isOptionalTableQueryError(fxRes.error, "stock_fx_conversions")) {
    throw fxRes.error;
  }

  if (
    cryptoTradesRes.error &&
    !isOptionalTableQueryError(cryptoTradesRes.error, "crypto_trades")
  ) {
    throw cryptoTradesRes.error;
  }

  cache.contributions = contributionsRes.data?.map((row) => row.data) ?? [];
  cache.goals = goalsRes.data?.map((row) => row.data) ?? [];
  cache.snapshots = await loadPortfolioSnapshots(client);
  cache.stockTransactions = normalizeStockTransactions(
    stockRes.data?.map((row) => row.data) ?? []
  );
  cache.cryptoHoldings = normalizeCryptoHoldings(
    cryptoRes.data?.map((row) => row.data) ?? []
  );
  cache.cryptoTrades = cryptoTradesRes.error
    ? []
    : normalizeCryptoTrades(cryptoTradesRes.data?.map((row) => row.data) ?? []);
  cache.optionsTrades = normalizeOptionsTradesForStorage(
    optionsRes.data?.map((row) => row.data) ?? []
  );
  cache.stockFxConversions = fxRes.error
    ? []
    : fxRes.data?.map((row) => row.data) ?? [];

  const watchlistRows = watchlistRes.data ?? [];
  if (watchlistRows.length > 0) {
    cache.scannerWatchlist = watchlistRows.map((row) =>
      normalizeWatchlistEntry(row.data as WatchlistEntry)
    );
  } else if (!cache.migratedFromLocal) {
    cache.scannerWatchlist = DEFAULT_SCANNER_WATCHLIST.map((row) => ({ ...row }));
  }

  return normalizeCache(cache);
}

export async function importCacheToSupabase(
  client: SupabaseClient,
  cache: PersistenceCache
): Promise<void> {
  const settingsPayload = {
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
    migrated_from_local: true,
    updated_at: new Date().toISOString(),
  };

  const settingsRes = await client.from("settings").upsert(settingsPayload);
  if (settingsRes.error) throw settingsRes.error;

  await replaceJsonRows(client, "contributions", cache.contributions, (row) => row.id);
  await replaceJsonRows(client, "goals", cache.goals, (row) => row.id);
  await syncSnapshots(client, cache.snapshots);
  await replaceJsonRows(
    client,
    "stock_transactions",
    cache.stockTransactions,
    (row) => row.id
  );
  await replaceJsonRows(
    client,
    "crypto_transactions",
    cache.cryptoHoldings,
    (row) => row.id
  );
  try {
    await replaceJsonRows(
      client,
      "crypto_trades",
      cache.cryptoTrades,
      (row) => row.id
    );
  } catch (error) {
    if (!isMissingSupabaseTableError(error, "crypto_trades")) {
      throw error;
    }
    console.warn(
      "[hydrate] crypto_trades table missing — skipped import for optional ledger"
    );
  }
  await replaceJsonRows(client, "options_trades", cache.optionsTrades, (row) => row.id);
  await replaceJsonRows(
    client,
    "stock_fx_conversions",
    cache.stockFxConversions,
    (row) => row.id
  );

  const watchlistRows = cache.scannerWatchlist.map((entry, index) => ({
    id: watchlistStorageKey(entry, index),
    ticker: entry.ticker,
    data: entry,
    sort_order: index,
    updated_at: new Date().toISOString(),
  }));

  const deleteWatchlist = await client
    .from("watchlist_items")
    .delete()
    .neq("id", "");
  if (deleteWatchlist.error) throw deleteWatchlist.error;

  if (watchlistRows.length > 0) {
    const watchlistRes = await client.from("watchlist_items").insert(watchlistRows);
    if (watchlistRes.error) throw watchlistRes.error;
  }
}

async function replaceJsonRows<T>(
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
  rows: T[],
  idFor: (row: T) => string
): Promise<void> {
  const deleteRes = await client.from(table).delete().neq(
    table === "portfolio_snapshots" ? "date" : "id",
    ""
  );
  if (deleteRes.error) throw deleteRes.error;

  if (rows.length === 0) return;

  const payload = rows.map((row) => ({
    [table === "portfolio_snapshots" ? "date" : "id"]: idFor(row),
    data: row,
    updated_at: new Date().toISOString(),
  }));

  const insertRes = await client.from(table).insert(payload);
  if (insertRes.error) throw insertRes.error;
}
