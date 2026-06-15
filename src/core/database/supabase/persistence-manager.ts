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
import { rebuildHoldingsFromTrades } from "@/core/calculations/crypto/trades";
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
  private pendingSync = false;
  private cryptoTradesSyncAvailable = true;

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
      this.status = "local";
      return;
    }

    this.client = getSupabaseClient();
    if (!this.client) {
      this.cache = exportLocalStorageCache();
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
      if (this.status === "supabase_migrated") {
        this.cache.migratedFromLocal = true;
      }

      await this.refreshOptionalTableAvailability();
      await this.applyStockCashFlowMigrationIfNeeded();
      await this.applyCryptoTradesMigrationIfNeeded();
      this.cache = normalizeCache(this.cache);
    } catch (error) {
      logPersistenceError("bootstrap failed — falling back to local cache", error);
      this.lastWarning = `Cloud persistence unavailable (${formatPersistenceError(error)}). Loaded local data instead.`;
      this.cache = exportLocalStorageCache();
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
    this.cache.dashboardSettings = {
      ...this.cache.dashboardSettings,
      cryptoLegacyTradesMigrated: true,
    };
    this.queueSettingsSync();

    if (!this.client || !this.cryptoTradesSyncAvailable) {
      return;
    }

    try {
      await syncCryptoTrades(this.client, this.cache.cryptoTrades);
      await syncCryptoHoldings(this.client, this.cache.cryptoHoldings);
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
      await this.applyStockCashFlowMigrationIfNeeded();
      await this.applyCryptoTradesMigrationIfNeeded();
      this.cache = normalizeCache(this.cache);
    } catch (error) {
      logPersistenceError("server bootstrap failed", error);
      throw error;
    }
  }

  /** Wait for queued Supabase writes to finish (used by cron routes). */
  async drainSyncQueue(timeoutMs = 30_000): Promise<void> {
    const started = Date.now();
    while (this.syncing || this.pendingSync) {
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
    void this.runSync(() =>
      this.client ? syncSettingsRow(this.client, this.cache) : Promise.resolve()
    );
  }

  queueContributionsSync(): void {
    void this.runSync(() =>
      this.client
        ? syncContributions(this.client, this.cache.contributions)
        : Promise.resolve()
    );
  }

  queueGoalsSync(): void {
    void this.runSync(() =>
      this.client ? syncGoals(this.client, this.cache.goals) : Promise.resolve()
    );
  }

  queueSnapshotsSync(): void {
    void this.runSync(() =>
      this.client
        ? syncSnapshots(this.client, this.cache.snapshots)
        : Promise.resolve()
    );
  }

  queueStockTransactionsSync(): void {
    void this.runSync(() =>
      this.client
        ? syncStockTransactions(this.client, this.cache.stockTransactions)
        : Promise.resolve()
    );
  }

  queueCryptoHoldingsSync(): void {
    void this.runSync(() =>
      this.client
        ? syncCryptoHoldings(this.client, this.cache.cryptoHoldings)
        : Promise.resolve()
    );
  }

  queueCryptoTradesSync(): void {
    if (!this.cryptoTradesSyncAvailable) {
      console.warn(
        "[PersistenceManager] Skipping crypto_trades sync — table unavailable"
      );
      return;
    }
    void this.runSync(() =>
      this.client
        ? syncCryptoTrades(this.client, this.cache.cryptoTrades)
        : Promise.resolve()
    );
  }

  queueOptionsTradesSync(): void {
    void this.runSync(() =>
      this.client
        ? syncOptionsTrades(this.client, this.cache.optionsTrades)
        : Promise.resolve()
    );
  }

  queueStockFxConversionsSync(): void {
    void this.runSync(() =>
      this.client
        ? syncStockFxConversions(this.client, this.cache.stockFxConversions)
        : Promise.resolve()
    );
  }

  queueWatchlistSync(): void {
    void this.runSync(() =>
      this.client
        ? syncWatchlist(this.client, this.cache.scannerWatchlist)
        : Promise.resolve()
    );
  }

  private async runSync(task: () => Promise<void>): Promise<void> {
    if (!this.client) return;
    if (this.syncing) {
      this.pendingSync = true;
      return;
    }

    this.syncing = true;
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
    } finally {
      this.syncing = false;
      if (this.pendingSync) {
        this.pendingSync = false;
        await this.runSync(task);
      }
    }
  }
}
