import { getPersistenceManager } from "@/core/database/supabase";
import type { PersistenceManager } from "@/core/database/supabase/persistence-manager";

export type CryptoPersistResult =
  | { ok: true; savedAt: string }
  | { ok: false; error: string };

export interface PersistCryptoChangesOptions {
  /** Reload crypto holdings + trades from Supabase after drain (ledger writes). */
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

export function assertCryptoTradesSyncAvailable(
  manager: PersistenceManager | null
): void {
  const requiresSupabase =
    manager?.getStatus() === "supabase" ||
    manager?.getStatus() === "supabase_migrated";

  if (requiresSupabase && manager && !manager.isCryptoTradesSyncAvailable()) {
    throw new Error(
      "crypto_trades table is unavailable in Supabase. Run the crypto_trades block in supabase/schema.sql before changing buy/sell transactions."
    );
  }
}

/**
 * Wait for queued writes to finish. Optionally rehydrate crypto ledger from cloud.
 * Serialized — concurrent calls run in order to avoid partial overwrites.
 */
export async function persistCryptoChanges(
  options: PersistCryptoChangesOptions = {}
): Promise<CryptoPersistResult> {
  return enqueuePersist(async () => {
    try {
      const manager = getPersistenceManager();
      if (options.rehydrate) {
        assertCryptoTradesSyncAvailable(manager);
      }

      await manager?.drainSyncQueue();

      if (options.rehydrate) {
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
