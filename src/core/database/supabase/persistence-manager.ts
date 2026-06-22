import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getServerSupabaseClient,
  getSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import type { PersistenceCache } from "./cache";
import { createEmptyCache, normalizeCache } from "./cache";
import {
  exportLocalStorageCache,
  localStorageHasExportableData,
} from "./local-export";
import {
  hydrateCacheFromSupabase,
  importCacheToSupabase,
  isSupabaseDatastoreEmpty,
} from "./hydrate";
import {
  syncContributions,
  syncCryptoHoldings,
  syncCryptoTrades,
  syncGoals,
  syncOptionsTrades,
  syncStockFxConversions,
  syncSettingsRow,
  syncSnapshots,
  syncStockTransactions,
  syncWatchlist,
} from "./sync";
import {
  hasLegacyStockDeposits,
  migrateLegacyStockDepositsToCashFlow,
} from "@/core/calculations/stocks/migrate-stock-cash-flow";
import { migrateLegacyCryptoHoldingsToTrades } from "@/core/calculations/crypto/migrate-crypto-trades";
import { rebuildHoldingsFromTrades, normalizeCryptoAssetName } from "@/core/calculations/crypto/trades";
import { normalizeCryptoHoldings } from "@/core/calculations/crypto/normalize";
import { normalizeCryptoTrades } from "@/core/calculations/crypto/trade-normalize";
import { normalizeStockTransactions } from "@/core/calculations/stocks/transaction-normalize";
import { coerceNumber } from "@/shared/lib/coerce-number";
import {
  DEFAULT_OPTIONS_SETTINGS,
  isUnsetOptionsSettings,
  normalizeOptionsSettings,
} from "@/core/domain/defaults-options";
import { STORAGE_KEYS } from "../local/storage-keys";
import { readJson, writeJson } from "../local/local-storage";
import {
  formatPersistenceError,
  isMissingSupabaseTableError,
  logPersistenceError,
} from "./supabase-errors";

export type PersistenceStatus = "local" | "supabase" | "supabase_migrated";

export class PersistenceManager {
  private cache: PersistenceCache = createEmptyCache();
  private client: SupabaseClient | null = null;
  private status: PersistenceStatus = "local";
  private lastError: string | null = null;
  private lastWarning: string | null = null;
  private syncing = false;
  private syncQueue: Array<() => Promise<void>> = [];
  private cryptoTradesSyncAvailable = true;
  private allowEmptyStockTransactionsSync = false;

  static async initialize(): Promise<PersistenceManager> {
    const manager = new PersistenceManager();
    await manager.bootstrap();
    return manager;
  }

  /** Server-only bootstrap — Supabase required, no localStorage migration. */
  static async initializeForServer(): Promise<PersistenceManager> {
    const manager = new PersistenceManager();
    await manager.bootstrapServer();
    return manager;
  }

  getCache(): PersistenceCache {
    return this.cache;
  }

  getStatus(): PersistenceStatus {
    return this.status;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getLastWarning(): string | null {
    return this.lastWarning;
  }

  isCryptoTradesSyncAvailable(): boolean {
    return this.cryptoTradesSyncAvailable;
  }

  clearError(): void {
    this.lastError = null;
    this.lastWarning = null;
  }

  private setOptionalTableWarning(message: string): void {
    this.lastWarning = message;
    console.warn(`[PersistenceManager] ${message}`);
  }

  private async bootstrap(): Promise<void> {
    if (!isSupabaseConfigured()) {
      this.cache = exportLocalStorageCache();
      this.reconcileCryptoHoldingsWithTrades();
      this.reconcileOptionsSettings();
      this.status = "local";
      return;
    }

    this.client = getSupabaseClient();
    if (!this.client) {
      this.cache = exportLocalStorageCache();
      this.reconcileCryptoHoldingsWithTrades();
      this.reconcileOptionsSettings();
      this.status = "local";
      return;
    }

    try {
      const empty = await isSupabaseDatastoreEmpty(this.client);
      if (empty && localStorageHasExportableData()) {
        const localCache = exportLocalStorageCache();
        await importCacheToSupabase(this.client, localCache);
        this.status = "supabase_migrated";
      } else {
        this.status = "supabase";
      }

      this.cache = await hydrateCacheFromSupabase(this.client);
      this.persistStockTransactionsLocalBackup();
      if (this.status === "supabase_migrated") {
        this.cache.migratedFromLocal = true;
      }

      await this.refreshOptionalTableAvailability();
      this.mergeLocalStockTransactionsIfSupabaseEmpty();
      this.mergeLocalCryptoTradesIfSupabaseEmpty();
      this.markCryptoLegacyMigratedIfTradesPresent();
      await this.applyStockCashFlowMigrationIfNeeded();
      await this.applyCryptoTradesMigrationIfNeeded();
      this.reconcileCryptoHoldingsWithTrades();
      this.cache = normalizeCache(this.cache);
      this.reconcileOptionsSettings();
    } catch (error) {
      logPersistenceError("bootstrap failed — falling back to local cache", error);
      this.lastWarning = `Cloud persistence unavailable (${formatPersistenceError(error)}). Loaded local data instead.`;
      this.cache = exportLocalStorageCache();
      this.reconcileCryptoHoldingsWithTrades();
      this.reconcileOptionsSettings();
      this.status = "local";
      this.client = getSupabaseClient();
      this.cryptoTradesSyncAvailable = false;
    }
  }

  /** One-time legacy deposit split — persisted to Supabase, not re-run on every load. */
  private async applyStockCashFlowMigrationIfNeeded(): Promise<void> {
    if (!hasLegacyStockDeposits(this.cache.contributions)) {
      return;
    }

    const fallbackFx =
      this.cache.dashboardSettings.usdSgdFxRate != null &&
      this.cache.dashboardSettings.usdSgdFxRate > 0
        ? this.cache.dashboardSettings.usdSgdFxRate
        : 1.32;

    const migrated = migrateLegacyStockDepositsToCashFlow(
      this.cache.contributions,
      this.cache.stockFxConversions,
      fallbackFx
    );

    this.cache.contributions = migrated.contributions;
    this.cache.stockFxConversions = migrated.fxConversions;

    if (!this.client) return;

    try {
      await syncContributions(this.client, this.cache.contributions);
      await syncStockFxConversions(this.client, this.cache.stockFxConversions);
    } catch (error) {
      logPersistenceError("stock cash-flow migration sync failed", error);
      this.lastError = formatPersistenceError(error);
    }
  }

  private async refreshOptionalTableAvailability(): Promise<void> {
    if (!this.client) {
      this.cryptoTradesSyncAvailable = false;
      return;
    }

    const res = await this.client
      .from("crypto_trades")
      .select("id", { head: true, count: "exact" });

    if (res.error && isMissingSupabaseTableError(res.error, "crypto_trades")) {
      this.cryptoTradesSyncAvailable = false;
      this.setOptionalTableWarning(
        "Optional table crypto_trades is missing in Supabase. Run the crypto_trades block in supabase/schema.sql. Crypto buy/sell sync is paused; holdings and dashboard still load."
      );
      return;
    }

    if (res.error) {
      throw res.error;
    }

    this.cryptoTradesSyncAvailable = true;
  }

  /** One-time legacy holding → buy trade migration for transaction ledger cash math. */
  private async applyCryptoTradesMigrationIfNeeded(): Promise<void> {
    const legacyMigrationComplete =
      this.cache.dashboardSettings.cryptoLegacyTradesMigrated === true;

    const migratedTrades = migrateLegacyCryptoHoldingsToTrades(
      this.cache.cryptoHoldings,
      this.cache.cryptoTrades,
      legacyMigrationComplete
    );
    if (migratedTrades.length === this.cache.cryptoTrades.length) {
      return;
    }

    this.cache.cryptoTrades = migratedTrades;
    this.cache.cryptoHoldings = rebuildHoldingsFromTrades(
      migratedTrades,
      this.cache.cryptoHoldings
    );
    this.persistCryptoTradesLocalBackup();

    if (!this.client || !this.cryptoTradesSyncAvailable) {
      this.cache.dashboardSettings = {
        ...this.cache.dashboardSettings,
        cryptoLegacyTradesMigrated: true,
      };
      this.queueSettingsSync();
      return;
    }

    try {
      await syncCryptoTrades(this.client, this.cache.cryptoTrades);
      await syncCryptoHoldings(this.client, this.cache.cryptoHoldings);
      this.cache.dashboardSettings = {
        ...this.cache.dashboardSettings,
        cryptoLegacyTradesMigrated: true,
      };
      this.queueSettingsSync();
    } catch (error) {
      if (isMissingSupabaseTableError(error, "crypto_trades")) {
        this.cryptoTradesSyncAvailable = false;
        this.setOptionalTableWarning(
          "Optional table crypto_trades is missing in Supabase. Run the crypto_trades block in supabase/schema.sql."
        );
        logPersistenceError("crypto trades migration sync skipped", error);
        return;
      }
      logPersistenceError("crypto trades migration sync failed", error);
      this.lastError = formatPersistenceError(error);
    }
  }

  private async bootstrapServer(): Promise<void> {
    const client = getServerSupabaseClient();
    if (!client) {
      throw new Error(
        "Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }

    this.client = client;
    this.status = "supabase";
    try {
      this.cache = await hydrateCacheFromSupabase(this.client);
      await this.refreshOptionalTableAvailability();
      this.mergeLocalStockTransactionsIfSupabaseEmpty();
      this.mergeLocalCryptoTradesIfSupabaseEmpty();
      this.markCryptoLegacyMigratedIfTradesPresent();
      await this.applyStockCashFlowMigrationIfNeeded();
      await this.applyCryptoTradesMigrationIfNeeded();
      this.reconcileCryptoHoldingsWithTrades();
      this.cache = normalizeCache(this.cache);
    } catch (error) {
      logPersistenceError("server bootstrap failed", error);
      throw error;
    }
  }

  /** Mirror options client settings to localStorage so refresh survives stale cloud cache. */
  persistOptionsSettingsLocalBackup(): void {
    if (typeof window === "undefined") return;
    writeJson(STORAGE_KEYS.optionsSettings, this.cache.optionsSettings);
  }

  /** Merge local options settings or defaults when cloud cache is empty/unset. */
  reconcileOptionsSettings(): void {
    if (typeof window !== "undefined") {
      const local = normalizeOptionsSettings(
        readJson(STORAGE_KEYS.optionsSettings, DEFAULT_OPTIONS_SETTINGS)
      );
      if (
        isUnsetOptionsSettings(this.cache.optionsSettings) &&
        !isUnsetOptionsSettings(local)
      ) {
        this.cache.optionsSettings = local;
      }
    }

    const normalized = normalizeOptionsSettings(this.cache.optionsSettings);
    const changed =
      JSON.stringify(normalized) !== JSON.stringify(this.cache.optionsSettings);
    this.cache.optionsSettings = normalized;
    this.persistOptionsSettingsLocalBackup();

    if (changed && this.client) {
      this.queueSettingsSync();
    }
  }

  /** Mirror stock transactions to localStorage so refresh survives stale cloud cache. */
  persistStockTransactionsLocalBackup(): void {
    if (typeof window === "undefined") return;
    writeJson(STORAGE_KEYS.stockTransactions, this.cache.stockTransactions);
  }

  /** Mirror crypto trades to localStorage so refresh survives when cloud sync is delayed. */
  persistCryptoTradesLocalBackup(): void {
    if (typeof window === "undefined") return;
    writeJson(STORAGE_KEYS.cryptoTrades, this.cache.cryptoTrades);
  }

  /** Mirror crypto holdings so manual valuations survive when cloud rows are stale or missing. */
  persistCryptoHoldingsLocalBackup(): void {
    if (typeof window === "undefined") return;
    writeJson(STORAGE_KEYS.cryptoHoldings, this.cache.cryptoHoldings);
  }

  /** Merge local holdings backup, then rebuild cost basis from the trade ledger. */
  private reconcileCryptoHoldingsWithTrades(): void {
    const before = JSON.stringify(this.cache.cryptoHoldings);
    this.mergeLocalCryptoHoldingsFromBackup();
    this.cache.cryptoHoldings = rebuildHoldingsFromTrades(
      this.cache.cryptoTrades,
      this.cache.cryptoHoldings
    );
    this.persistCryptoHoldingsLocalBackup();

    if (before !== JSON.stringify(this.cache.cryptoHoldings) && this.client) {
      this.queueCryptoHoldingsSync();
    }
  }

  private mergeLocalCryptoHoldingsFromBackup(): void {
    if (typeof window === "undefined") return;

    const local = normalizeCryptoHoldings(
      readJson<unknown[]>(STORAGE_KEYS.cryptoHoldings, [])
    );
    if (local.length === 0) return;

    const byAsset = new Map(
      this.cache.cryptoHoldings.map((holding) => [
        normalizeCryptoAssetName(holding.assetName),
        holding,
      ])
    );

    for (const localHolding of local) {
      const key = normalizeCryptoAssetName(localHolding.assetName);
      const existing = byAsset.get(key);
      if (!existing) {
        this.cache.cryptoHoldings.push(localHolding);
        byAsset.set(key, localHolding);
        continue;
      }

      const localValue = coerceNumber(localHolding.currentValueSgd);
      const existingValue = coerceNumber(existing.currentValueSgd);
      if (localValue <= existingValue) continue;

      const index = this.cache.cryptoHoldings.findIndex(
        (holding) => normalizeCryptoAssetName(holding.assetName) === key
      );
      if (index < 0) continue;

      this.cache.cryptoHoldings[index] = {
        ...existing,
        currentValueSgd: localValue,
        notes: localHolding.notes ?? existing.notes,
      };
      byAsset.set(key, this.cache.cryptoHoldings[index]!);
    }
  }

  /** Reload crypto holdings and trades from Supabase after a write (verifies persistence). */
  async rehydrateCryptoFromSupabase(): Promise<{
    holdings: boolean;
    trades: boolean;
  }> {
    const result = { holdings: false, trades: false };
    if (!this.client) {
      return result;
    }

    const [holdingsRes, tradesRes] = await Promise.all([
      this.client.from("crypto_transactions").select("data"),
      this.cryptoTradesSyncAvailable
        ? this.client.from("crypto_trades").select("data")
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (!holdingsRes.error) {
      this.cache.cryptoHoldings = normalizeCryptoHoldings(
        holdingsRes.data?.map((row) => row.data) ?? []
      );
      result.holdings = true;
    } else {
      logPersistenceError("rehydrate crypto holdings failed", holdingsRes.error);
    }

    if (!this.cryptoTradesSyncAvailable) {
      this.reconcileCryptoHoldingsWithTrades();
      return result;
    }

    if (tradesRes.error) {
      logPersistenceError("rehydrate crypto trades failed", tradesRes.error);
      this.reconcileCryptoHoldingsWithTrades();
      return result;
    }

    const remoteTrades = normalizeCryptoTrades(
      tradesRes.data?.map((row) => row.data) ?? []
    );

    if (remoteTrades.length === 0 && this.cache.cryptoTrades.length > 0) {
      this.setOptionalTableWarning(
        "Cloud transaction history is empty after save — kept local buy/sell records. Check crypto_trades sync."
      );
    } else {
      this.cache.cryptoTrades = remoteTrades;
      this.persistCryptoTradesLocalBackup();
      result.trades = true;
    }

    this.reconcileCryptoHoldingsWithTrades();
    result.holdings = true;
    return result;
  }

  /** @deprecated Use rehydrateCryptoFromSupabase */
  async rehydrateCryptoTradesFromSupabase(): Promise<boolean> {
    const result = await this.rehydrateCryptoFromSupabase();
    return result.trades;
  }

  private mergeLocalStockTransactionsIfSupabaseEmpty(): void {
    if (typeof window === "undefined") return;
    if (this.cache.stockTransactions.length > 0) return;

    const local = normalizeStockTransactions(
      readJson<unknown[]>(STORAGE_KEYS.stockTransactions, [])
    );
    if (local.length === 0) return;

    this.cache.stockTransactions = local;
    this.persistStockTransactionsLocalBackup();
    this.setOptionalTableWarning(
      "Restored stock transactions from local backup because cloud cache was empty."
    );

    if (this.client) {
      this.enqueueSync(() =>
        syncStockTransactions(this.client!, this.cache.stockTransactions)
      );
    }
  }

  private mergeLocalCryptoTradesIfSupabaseEmpty(): void {
    if (typeof window === "undefined") return;
    if (this.cache.cryptoTrades.length > 0) return;

    const local = readJson<unknown[]>(STORAGE_KEYS.cryptoTrades, []);
    const normalized = normalizeCryptoTrades(local);
    if (normalized.length === 0) return;

    this.cache.cryptoTrades = normalized;

    if (this.client && this.cryptoTradesSyncAvailable) {
      this.enqueueSync(() =>
        syncCryptoTrades(this.client!, this.cache.cryptoTrades)
      );
    }
  }

  private markCryptoLegacyMigratedIfTradesPresent(): void {
    if (
      this.cache.cryptoTrades.length === 0 ||
      this.cache.dashboardSettings.cryptoLegacyTradesMigrated === true
    ) {
      return;
    }

    this.cache.dashboardSettings = {
      ...this.cache.dashboardSettings,
      cryptoLegacyTradesMigrated: true,
    };
    this.queueSettingsSync();
  }

  /** Wait for queued Supabase writes to finish (used by cron routes). */
  async drainSyncQueue(timeoutMs = 30_000): Promise<void> {
    const started = Date.now();
    while (this.syncing || this.syncQueue.length > 0) {
      if (!this.syncing && this.syncQueue.length > 0) {
        void this.processSyncQueue();
      }
      if (Date.now() - started > timeoutMs) {
        throw new Error("Timed out waiting for Supabase sync");
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (this.lastError) {
      throw new Error(this.lastError);
    }
  }

  queueSettingsSync(): void {
    this.enqueueSync(() =>
      this.client ? syncSettingsRow(this.client, this.cache) : Promise.resolve()
    );
  }

  queueContributionsSync(): void {
    this.enqueueSync(() =>
      this.client
        ? syncContributions(this.client, this.cache.contributions)
        : Promise.resolve()
    );
  }

  queueGoalsSync(): void {
    this.enqueueSync(() =>
      this.client ? syncGoals(this.client, this.cache.goals) : Promise.resolve()
    );
  }

  queueSnapshotsSync(): void {
    this.enqueueSync(() =>
      this.client
        ? syncSnapshots(this.client, this.cache.snapshots)
        : Promise.resolve()
    );
  }

  queueStockTransactionsSync(allowEmpty = false): void {
    if (allowEmpty) {
      this.allowEmptyStockTransactionsSync = true;
    }
    this.enqueueSync(async () => {
      if (!this.client) return;
      const syncEmpty = this.allowEmptyStockTransactionsSync;
      this.allowEmptyStockTransactionsSync = false;
      await syncStockTransactions(this.client, this.cache.stockTransactions, {
        allowEmpty: syncEmpty,
      });
    });
  }

  queueCryptoHoldingsSync(): void {
    this.persistCryptoHoldingsLocalBackup();
    this.enqueueSync(() =>
      this.client
        ? syncCryptoHoldings(this.client, this.cache.cryptoHoldings)
        : Promise.resolve()
    );
  }

  queueCryptoTradesSync(): void {
    this.persistCryptoTradesLocalBackup();
    if (!this.cryptoTradesSyncAvailable) {
      console.warn(
        "[PersistenceManager] Skipping crypto_trades cloud sync — table unavailable"
      );
      return;
    }
    this.enqueueSync(() =>
      this.client
        ? syncCryptoTrades(this.client, this.cache.cryptoTrades)
        : Promise.resolve()
    );
  }

  queueOptionsTradesSync(): void {
    this.enqueueSync(() =>
      this.client
        ? syncOptionsTrades(this.client, this.cache.optionsTrades)
        : Promise.resolve()
    );
  }

  queueStockFxConversionsSync(): void {
    this.enqueueSync(() =>
      this.client
        ? syncStockFxConversions(this.client, this.cache.stockFxConversions)
        : Promise.resolve()
    );
  }

  queueWatchlistSync(): void {
    this.enqueueSync(() =>
      this.client
        ? syncWatchlist(this.client, this.cache.scannerWatchlist)
        : Promise.resolve()
    );
  }

  private enqueueSync(task: () => Promise<void>): void {
    this.syncQueue.push(task);
    void this.processSyncQueue();
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncing || !this.client) return;

    this.syncing = true;
    try {
      while (this.syncQueue.length > 0) {
        const task = this.syncQueue.shift();
        if (!task) continue;
        try {
          await task();
          this.lastError = null;
        } catch (error) {
          const message = formatPersistenceError(error);
          logPersistenceError("sync task failed", error);
          this.lastError = message;
          if (isMissingSupabaseTableError(error, "crypto_trades")) {
            this.cryptoTradesSyncAvailable = false;
          }
        }
      }
    } finally {
      this.syncing = false;
      if (this.syncQueue.length > 0) {
        void this.processSyncQueue();
      }
    }
  }
}
