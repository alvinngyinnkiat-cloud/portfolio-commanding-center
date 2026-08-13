import type { OptionsTrade } from "@/core/domain/types/options";
import { normalizeOptionsTradesForStorage } from "@/core/calculations/options/trade-dates";
import type { OptionsTradesLoadState } from "./options-load-state";
import {
  readLocalOptionsTrades,
  readSafetyHistory,
} from "./options-safety-backup";

export type OptionsHydrationSource =
  | "supabase"
  | "local"
  | "safety-history"
  | "none";

export interface OptionsHydrationResult {
  trades: OptionsTrade[];
  source: OptionsHydrationSource;
  supabaseCount: number;
  localCount: number;
  safetyHistoryCount: number;
  safetyHistoryLatestCount: number;
  warning: string | null;
  loadState: OptionsTradesLoadState;
}

export function resolveSafestOptionsTrades(
  supabaseTrades: OptionsTrade[],
  options?: { bootstrapError?: string | null }
): OptionsHydrationResult {
  const supabase = normalizeOptionsTradesForStorage(supabaseTrades);
  const local = readLocalOptionsTrades();
  const safetyHistory = readSafetyHistory();
  const safetyLatest = safetyHistory[0]?.trades ?? [];

  const supabaseCount = supabase.length;
  const localCount = local.length;
  const safetyHistoryCount = safetyHistory.length;
  const safetyHistoryLatestCount = safetyLatest.length;

  if (process.env.NODE_ENV === "development") {
    console.log("[Options Hydration] Supabase:", supabaseCount);
    console.log("[Options Hydration] Local:", localCount);
    console.log("[Options Hydration] Safety versions:", safetyHistoryCount);
    console.log("[Options Hydration] Safety latest trades:", safetyHistoryLatestCount);
  }

  if (options?.bootstrapError && supabaseCount === 0 && localCount === 0) {
    if (safetyHistoryLatestCount > 0) {
      return {
        trades: [],
        source: "none",
        supabaseCount,
        localCount,
        safetyHistoryCount,
        safetyHistoryLatestCount,
        warning:
          "Cloud options data unavailable. Safety backup versions exist — restore manually.",
        loadState: {
          status: "error",
          error: options.bootstrapError,
          source: null,
          supabaseCount: 0,
          localCount: 0,
          finalCount: 0,
          recoveryRequired: true,
        },
      };
    }

    return {
      trades: [],
      source: "none",
      supabaseCount,
      localCount,
      safetyHistoryCount,
      safetyHistoryLatestCount,
      warning: null,
      loadState: {
        status: "error",
        error: options.bootstrapError,
        source: null,
        supabaseCount: 0,
        localCount: 0,
        finalCount: 0,
        recoveryRequired: false,
      },
    };
  }

  if (supabaseCount > 0) {
    return {
      trades: supabase,
      source: "supabase",
      supabaseCount,
      localCount,
      safetyHistoryCount,
      safetyHistoryLatestCount,
      warning: null,
      loadState: {
        status: "loaded",
        error: null,
        source: "supabase",
        supabaseCount,
        localCount,
        finalCount: supabaseCount,
        recoveryRequired: false,
      },
    };
  }

  if (localCount > 0) {
    return {
      trades: local,
      source: "local",
      supabaseCount,
      localCount,
      safetyHistoryCount,
      safetyHistoryLatestCount,
      warning: "Cloud options data is empty. Local recovery data preserved.",
      loadState: {
        status: "loaded",
        error: null,
        source: "local-merge",
        supabaseCount: 0,
        localCount,
        finalCount: localCount,
        recoveryRequired: false,
      },
    };
  }

  if (safetyHistoryLatestCount > 0) {
    return {
      trades: [],
      source: "none",
      supabaseCount,
      localCount,
      safetyHistoryCount,
      safetyHistoryLatestCount,
      warning:
        "Cloud and local options data are empty. Safety backup versions are available for manual restore.",
      loadState: {
        status: "error",
        error: "Options recovery required — safety backups contain historical trades.",
        source: null,
        supabaseCount: 0,
        localCount: 0,
        finalCount: 0,
        recoveryRequired: true,
      },
    };
  }

  return {
    trades: [],
    source: "none",
    supabaseCount,
    localCount,
    safetyHistoryCount,
    safetyHistoryLatestCount,
    warning: null,
    loadState: {
      status: "loaded",
      error: null,
      source: "supabase",
      supabaseCount: 0,
      localCount: 0,
      finalCount: 0,
      recoveryRequired: false,
    },
  };
}
