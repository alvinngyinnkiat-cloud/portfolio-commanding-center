"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  persistCryptoChanges,
  type CryptoPersistResult,
  type PersistCryptoChangesOptions,
} from "@/modules/crypto/lib/persist-crypto-changes";
import { formatDateTime } from "@/shared/lib/format";

export type CryptoSaveStatus = "idle" | "saving" | "saved" | "failed";

interface CryptoSaveContextValue {
  status: CryptoSaveStatus;
  lastSavedAt: string | null;
  error: string | null;
  commitCryptoChange: (
    mutate: () => boolean,
    options?: PersistCryptoChangesOptions
  ) => Promise<{ success: boolean; error: string | null }>;
}

const CryptoSaveContext = createContext<CryptoSaveContextValue | null>(null);

const CRYPTO_LAST_SAVED_KEY = "portfolio:crypto_last_saved_at";

export function CryptoSaveProvider({ children }: { children: ReactNode }) {
  const { refresh } = usePortfolio();
  const [status, setStatus] = useState<CryptoSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(CRYPTO_LAST_SAVED_KEY);
  });
  const [error, setError] = useState<string | null>(null);

  const commitCryptoChange = useCallback(
    async (
      mutate: () => boolean,
      options?: PersistCryptoChangesOptions
    ): Promise<{ success: boolean; error: string | null }> => {
      setStatus("saving");
      setError(null);

      try {
        const mutated = mutate();
        if (!mutated) {
          setStatus("idle");
          return { success: false, error: null };
        }

        const result: CryptoPersistResult = await persistCryptoChanges(options);
        refresh();

        if (!result.ok) {
          setStatus("failed");
          setError(result.error);
          return { success: false, error: result.error };
        }

        setLastSavedAt(result.savedAt);
        sessionStorage.setItem(CRYPTO_LAST_SAVED_KEY, result.savedAt);
        setStatus("saved");
        return { success: true, error: null };
      } catch (cause) {
        refresh();
        const message =
          cause instanceof Error ? cause.message : "Failed to save crypto data.";
        setStatus("failed");
        setError(message);
        return { success: false, error: message };
      }
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      status,
      lastSavedAt,
      error,
      commitCryptoChange,
    }),
    [status, lastSavedAt, error, commitCryptoChange]
  );

  return (
    <CryptoSaveContext.Provider value={value}>
      {children}
    </CryptoSaveContext.Provider>
  );
}

export function useCryptoSave(): CryptoSaveContextValue {
  const context = useContext(CryptoSaveContext);
  if (!context) {
    throw new Error("useCryptoSave must be used within CryptoSaveProvider");
  }
  return context;
}

export function CryptoSaveStatusBar() {
  const { status, lastSavedAt, error } = useCryptoSave();

  if (status === "idle" && !lastSavedAt) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-surface-border/50 bg-surface/40 px-3 py-2 text-xs"
      role="status"
      aria-live="polite"
    >
      {status === "saving" && (
        <span className="text-slate-400">Saving…</span>
      )}
      {status === "saved" && (
        <span className="text-accent-green">Saved</span>
      )}
      {status === "failed" && (
        <span className="text-accent-red">Save failed</span>
      )}
      {lastSavedAt && (
        <span className="text-slate-500">
          Last saved: {formatDateTime(lastSavedAt)}
        </span>
      )}
      {error && status === "failed" && (
        <span className="text-accent-red">{error}</span>
      )}
    </div>
  );
}
