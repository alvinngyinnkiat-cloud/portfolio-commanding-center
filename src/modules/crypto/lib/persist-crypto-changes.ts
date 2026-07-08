import { getPersistenceManager } from "@/core/database/supabase";
import type { PersistenceManager } from "@/core/database/supabase/persistence-manager";

export type CryptoPersistResult =
  | { ok: true; savedAt: string }
  | { ok: false; error: string };

export interface PersistCryptoChangesOptions {
  /** Require crypto_trades table (buy/sell ledger writes). */
  rehydrate?: boolean;
}

let persistChain: Promise<unknown> = Promise.resolve();

function enqueuePersist<T>(task: () => Promise<T>): Promise<T> {
  const run = persistChain.then(task, task);
  persistChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function usesSupabasePersistence(manager: PersistenceManager | null): boolean {
  return (
    manager?.getStatus() === "supabase" ||
    manager?.getStatus() === "supabase_migrated"
  );
}

export function assertCryptoTradesSyncAvailable(
  manager: PersistenceManager | null
): void {
  if (usesSupabasePersistence(manager) && manager && !manager.isCryptoTradesSyncAvailable()) {
    throw new Error(
      "crypto_trades table is unavailable in Supabase. Run the crypto_trades block in supabase/schema.sql before changing buy/sell transactions."
    );
  }
}

/**
 * 1. Drain queued Supabase writes.
 * 2. When Supabase is configured, always refetch crypto from cloud (source of truth).
 * 3. Overwrite local draft cache from the refetched cloud data.
 */
export async function persistCryptoChanges(
  options: PersistCryptoChangesOptions = {}
): Promise<CryptoPersistResult> {
  return enqueuePersist(async () => {
    try {
      const manager = getPersistenceManager();
      const cloudMode = usesSupabasePersistence(manager);

      if (options.rehydrate) {
        assertCryptoTradesSyncAvailable(manager);
      }

      await manager?.drainSyncQueue();

      if (cloudMode || options.rehydrate) {
        await manager?.rehydrateCryptoFromSupabase();
      }

      return { ok: true, savedAt: new Date().toISOString() };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save crypto data.",
      };
    }
  });
}

/** @deprecated Use persistCryptoChanges({ rehydrate: true }) */
export async function persistCryptoTradeChanges(): Promise<void> {
  const result = await persistCryptoChanges({ rehydrate: true });
  if (!result.ok) {
    throw new Error(result.error);
  }
}

/** Reset serialized persist queue — for tests only. */
export function resetCryptoPersistQueueForTests(): void {
  persistChain = Promise.resolve();
}
