import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
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
  syncGoals,
  syncOptionsTrades,
  syncSettingsRow,
  syncSnapshots,
  syncStockTransactions,
  syncWatchlist,
} from "./sync";

export type PersistenceStatus = "local" | "supabase" | "supabase_migrated";

export class PersistenceManager {
  private cache: PersistenceCache = createEmptyCache();
  private client: SupabaseClient | null = null;
  private status: PersistenceStatus = "local";
  private lastError: string | null = null;
  private syncing = false;
  private pendingSync = false;

  static async initialize(): Promise<PersistenceManager> {
    const manager = new PersistenceManager();
    await manager.bootstrap();
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

  clearError(): void {
    this.lastError = null;
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
    this.cache = normalizeCache(this.cache);
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

  queueOptionsTradesSync(): void {
    void this.runSync(() =>
      this.client
        ? syncOptionsTrades(this.client, this.cache.optionsTrades)
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
      this.lastError =
        error instanceof Error ? error.message : "Failed to sync with Supabase";
    } finally {
      this.syncing = false;
      if (this.pendingSync) {
        this.pendingSync = false;
        await this.runSync(task);
      }
    }
  }
}
