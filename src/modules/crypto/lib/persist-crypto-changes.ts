import { getPersistenceManager } from "@/core/database/supabase";
import type { PersistenceManager } from "@/core/database/supabase/persistence-manager";

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

/** Drain Supabase sync and reload crypto holdings + transaction ledger. */
export async function persistCryptoTradeChanges(): Promise<void> {
  const manager = getPersistenceManager();
  assertCryptoTradesSyncAvailable(manager);
  await manager?.drainSyncQueue();
  await manager?.rehydrateCryptoFromSupabase();
}
