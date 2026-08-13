import type { SupabaseClient } from "@supabase/supabase-js";
import type { OptionsTrade } from "@/core/domain/types/options";
import { normalizeOptionsTradesForStorage } from "@/core/calculations/options/trade-dates";
import { STORAGE_KEYS } from "@/core/database/local/storage-keys";

export const OPTIONS_SUPABASE_TABLE = "options_trades";

const LOCAL_KEY_PATTERN =
  /option|options|trade|trades|portfolio|backup/i;

/** Known keys — current + historical candidates before standardisation. */
export const OPTIONS_LOCAL_KEY_CANDIDATES = [
  STORAGE_KEYS.optionsTrades,
  STORAGE_KEYS.optionsSettings,
  "portfolio:options_trades_backup",
  "portfolio:options_trade_backup",
  "portfolio:options_backup",
  "portfolio:option_trades",
  "portfolio:options",
  "options_trades",
  "options-trades",
] as const;

export interface OptionsLocalSourceReport {
  key: string;
  rawPresent: boolean;
  rawLength: number;
  parseError: string | null;
  trades: OptionsTrade[];
  openCount: number;
  closedCount: number;
  otherStatusCount: number;
  looksLikeOptionsTrades: boolean;
}

export interface SupabaseTradeSummary {
  rowId: string | null;
  tradeId: string | null;
  status: string | null;
  tradeType: string | null;
}

export interface OptionsSupabaseRawReport {
  rowCount: number;
  error: string | null;
  errorCode: string | null;
  sampleRowKeys: string[];
  sampleRawRow: unknown | null;
  tradeSummaries: SupabaseTradeSummary[];
  ownershipFieldValues: Record<string, unknown[]>;
  statusValues: string[];
  tradeTypeValues: string[];
}

export interface OptionsRecoveryReport {
  scannedAt: string;
  localStorageKeys: string[];
  localSources: OptionsLocalSourceReport[];
  mainLocalKey: OptionsLocalSourceReport | null;
  backupLocalKeys: OptionsLocalSourceReport[];
  legacyLocalKeys: OptionsLocalSourceReport[];
  supabaseRaw: OptionsSupabaseRawReport;
  supabaseProductionRows: OptionsTrade[];
  supabaseProductionError: string | null;
  filteredProductionRows: OptionsTrade[];
  filteredOpenCount: number;
  filteredClosedCount: number;
  filteredOtherStatusCount: number;
  finalHydratedRows: OptionsTrade[];
  finalHydratedOpenCount: number;
  finalHydratedClosedCount: number;
  investigationComplete: boolean;
  allSourcesEmpty: boolean;
  recoverableTrades: OptionsTrade[];
  recoverableSourceKeys: string[];
  snapshotWipeRisk: string | null;
}

function isOptionsTradeShape(value: unknown): value is OptionsTrade {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    (row.status === "open" ||
      row.status === "closed" ||
      typeof row.status === "string") &&
    typeof row.strategy === "string"
  );
}

function extractTradesFromParsed(value: unknown): OptionsTrade[] {
  if (Array.isArray(value)) {
    return value.filter(isOptionsTradeShape);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const field of ["trades", "optionsTrades", "options_trades", "data"]) {
      const nested = record[field];
      if (Array.isArray(nested)) {
        const trades = nested.filter(isOptionsTradeShape);
        if (trades.length > 0) return trades;
      }
    }
  }
  return [];
}

function countStatuses(trades: OptionsTrade[]): {
  openCount: number;
  closedCount: number;
  otherStatusCount: number;
} {
  let openCount = 0;
  let closedCount = 0;
  let otherStatusCount = 0;
  for (const trade of trades) {
    if (trade.status === "open") openCount += 1;
    else if (trade.status === "closed") closedCount += 1;
    else otherStatusCount += 1;
  }
  return { openCount, closedCount, otherStatusCount };
}

function inspectLocalKey(key: string): OptionsLocalSourceReport {
  if (typeof window === "undefined") {
    return {
      key,
      rawPresent: false,
      rawLength: 0,
      parseError: "Not in browser",
      trades: [],
      openCount: 0,
      closedCount: 0,
      otherStatusCount: 0,
      looksLikeOptionsTrades: false,
    };
  }

  const raw = localStorage.getItem(key);
  if (raw == null) {
    return {
      key,
      rawPresent: false,
      rawLength: 0,
      parseError: null,
      trades: [],
      openCount: 0,
      closedCount: 0,
      otherStatusCount: 0,
      looksLikeOptionsTrades: false,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      key,
      rawPresent: true,
      rawLength: raw.length,
      parseError: error instanceof Error ? error.message : "Invalid JSON",
      trades: [],
      openCount: 0,
      closedCount: 0,
      otherStatusCount: 0,
      looksLikeOptionsTrades: /option|trade|strategy|maxRiskUsd/i.test(raw),
    };
  }

  const trades = normalizeOptionsTradesForStorage(extractTradesFromParsed(parsed));
  const counts = countStatuses(trades);

  return {
    key,
    rawPresent: true,
    rawLength: raw.length,
    parseError: null,
    trades,
    ...counts,
    looksLikeOptionsTrades: trades.length > 0,
  };
}

function collectOwnershipFields(rows: unknown[]): Record<string, unknown[]> {
  const fields = [
    "user_id",
    "owner_id",
    "account_id",
    "client_id",
    "portfolio_id",
    "type",
    "status",
    "tradeType",
  ] as const;

  const result: Record<string, unknown[]> = {};
  for (const field of fields) {
    const values = new Set<unknown>();
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const top = row as Record<string, unknown>;
      if (field in top) values.add(top[field]);
      const data = top.data;
      if (data && typeof data === "object") {
        const nested = data as Record<string, unknown>;
        if (field in nested) values.add(nested[field]);
      }
    }
    if (values.size > 0) {
      result[field] = [...values];
    }
  }
  return result;
}

export function scanOptionsLocalStorage(): {
  allRelevantKeys: string[];
  sources: OptionsLocalSourceReport[];
} {
  if (typeof window === "undefined") {
    return { allRelevantKeys: [], sources: [] };
  }

  const dynamicKeys = Object.keys(localStorage).filter((key) =>
    LOCAL_KEY_PATTERN.test(key)
  );
  const allRelevantKeys = [
    ...new Set([...OPTIONS_LOCAL_KEY_CANDIDATES, ...dynamicKeys]),
  ].sort();

  if (process.env.NODE_ENV === "development") {
    console.log("[Options Recovery] localStorage keys:", Object.keys(localStorage));
    for (const key of allRelevantKeys) {
      const raw = localStorage.getItem(key);
      if (raw != null) {
        console.log("[Options Recovery]", key, raw);
      }
    }
  }

  return {
    allRelevantKeys,
    sources: allRelevantKeys.map(inspectLocalKey),
  };
}

export async function querySupabaseOptionsRaw(
  client: SupabaseClient | null
): Promise<OptionsSupabaseRawReport> {
  if (!client) {
    return {
      rowCount: 0,
      error: "Supabase client unavailable",
      errorCode: null,
      sampleRowKeys: [],
      sampleRawRow: null,
      tradeSummaries: [],
      ownershipFieldValues: {},
      statusValues: [],
      tradeTypeValues: [],
    };
  }

  const { data, error } = await client.from(OPTIONS_SUPABASE_TABLE).select("*");

  if (process.env.NODE_ENV === "development") {
    console.log("[Options Recovery] raw Supabase rows:", data);
    console.log("[Options Recovery] Supabase error:", error);
  }

  const rows = data ?? [];
  const statusValues = new Set<string>();
  const tradeTypeValues = new Set<string>();
  const tradeSummaries: SupabaseTradeSummary[] = [];

  for (const row of rows) {
    const record = row as Record<string, unknown>;
    const payload =
      record && typeof record === "object" && "data" in record
        ? (record.data as Record<string, unknown>)
        : null;
    if (payload) {
      if (typeof payload.status === "string") statusValues.add(payload.status);
      if (typeof payload.tradeType === "string") tradeTypeValues.add(payload.tradeType);
    }
    tradeSummaries.push({
      rowId: typeof record.id === "string" ? record.id : null,
      tradeId:
        typeof payload?.id === "string"
          ? payload.id
          : typeof record.id === "string"
            ? record.id
            : null,
      status: typeof payload?.status === "string" ? payload.status : null,
      tradeType: typeof payload?.tradeType === "string" ? payload.tradeType : null,
    });
  }

  return {
    rowCount: rows.length,
    error: error?.message ?? null,
    errorCode: error?.code ?? null,
    sampleRowKeys:
      rows[0] && typeof rows[0] === "object"
        ? Object.keys(rows[0] as object)
        : [],
    sampleRawRow: rows[0] ?? null,
    tradeSummaries,
    ownershipFieldValues: collectOwnershipFields(rows),
    statusValues: [...statusValues],
    tradeTypeValues: [...tradeTypeValues],
  };
}

export async function querySupabaseOptionsProduction(
  client: SupabaseClient | null
): Promise<{ trades: OptionsTrade[]; error: string | null }> {
  if (!client) {
    return { trades: [], error: "Supabase client unavailable" };
  }

  const { data, error } = await client.from(OPTIONS_SUPABASE_TABLE).select("data");
  const trades = normalizeOptionsTradesForStorage(
    data?.map((row) => row.data as OptionsTrade) ?? []
  );

  if (process.env.NODE_ENV === "development") {
    console.log("[Options Recovery] Filtered Supabase rows:", trades);
    console.log("[Options Recovery] Production query error:", error);
  }

  return { trades, error: error?.message ?? null };
}

export async function runOptionsRecoveryDiagnostics(
  client: SupabaseClient | null,
  finalHydratedTrades: OptionsTrade[]
): Promise<OptionsRecoveryReport> {
  const localScan = scanOptionsLocalStorage();
  const supabaseRaw = await querySupabaseOptionsRaw(client);
  const production = await querySupabaseOptionsProduction(client);

  const filteredProductionRows = production.trades;
  const filteredCounts = countStatuses(filteredProductionRows);
  const finalCounts = countStatuses(finalHydratedTrades);

  const mainLocalKey =
    localScan.sources.find((source) => source.key === STORAGE_KEYS.optionsTrades) ??
    null;

  const backupLocalKeys = localScan.sources.filter((source) =>
    /backup/i.test(source.key)
  );
  const legacyLocalKeys = localScan.sources.filter(
    (source) =>
      source.key !== STORAGE_KEYS.optionsTrades &&
      source.key !== STORAGE_KEYS.optionsSettings &&
      !/backup/i.test(source.key) &&
      source.looksLikeOptionsTrades
  );

  const recoverableByKey = new Map<string, OptionsTrade[]>();
  for (const source of localScan.sources) {
    if (source.trades.length === 0) continue;
    recoverableByKey.set(source.key, source.trades);
  }
  if (filteredProductionRows.length > 0) {
    recoverableByKey.set("supabase:production-query", filteredProductionRows);
  }

  const recoverableSourceKeys = [...recoverableByKey.keys()];
  const recoverableTrades =
    finalHydratedTrades.length > 0
      ? []
      : ([...recoverableByKey.entries()].sort(
          (a, b) => b[1].length - a[1].length
        )[0]?.[1] ?? []);

  const allSourcesEmpty =
    supabaseRaw.rowCount === 0 &&
    filteredProductionRows.length === 0 &&
    finalHydratedTrades.length === 0 &&
    localScan.sources.every((source) => source.trades.length === 0);

  const report: OptionsRecoveryReport = {
    scannedAt: new Date().toISOString(),
    localStorageKeys: localScan.allRelevantKeys,
    localSources: localScan.sources,
    mainLocalKey,
    backupLocalKeys,
    legacyLocalKeys,
    supabaseRaw,
    supabaseProductionRows: filteredProductionRows,
    supabaseProductionError: production.error,
    filteredProductionRows,
    filteredOpenCount: filteredCounts.openCount,
    filteredClosedCount: filteredCounts.closedCount,
    filteredOtherStatusCount: filteredCounts.otherStatusCount,
    finalHydratedRows: finalHydratedTrades,
    finalHydratedOpenCount: finalCounts.openCount,
    finalHydratedClosedCount: finalCounts.closedCount,
    investigationComplete: true,
    allSourcesEmpty,
    recoverableTrades,
    recoverableSourceKeys,
    snapshotWipeRisk:
      mainLocalKey?.rawPresent === true &&
      mainLocalKey.trades.length === 0 &&
      supabaseRaw.rowCount === 0
        ? "Main local key is empty while cloud is empty — a prior bootstrap may have overwritten portfolio:options_trades before merge."
        : null,
  };

  if (process.env.NODE_ENV === "development") {
    console.log("[Options Recovery] Raw Supabase rows:", supabaseRaw.rowCount);
    console.log("[Options Recovery] Filtered Supabase rows:", filteredProductionRows.length);
    console.log(
      "[Options Recovery] Main local key rows:",
      mainLocalKey?.trades.length ?? 0
    );
    console.log(
      "[Options Recovery] Backup key rows:",
      backupLocalKeys.reduce((sum, source) => sum + source.trades.length, 0)
    );
    console.log(
      "[Options Recovery] Legacy key rows:",
      legacyLocalKeys.reduce((sum, source) => sum + source.trades.length, 0)
    );
    console.log("[Options Recovery] Final hydrated rows:", finalHydratedTrades.length);
    console.log("[Options Recovery] Open count:", finalCounts.openCount);
    console.log("[Options Recovery] Closed count:", finalCounts.closedCount);
    console.log("[Options Recovery] Recoverable sources:", recoverableSourceKeys);
    console.log("[Options Recovery] Report:", report);
  }

  return report;
}
