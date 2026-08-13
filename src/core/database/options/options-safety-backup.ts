import type { OptionsTrade } from "@/core/domain/types/options";
import { normalizeOptionsTradesForStorage } from "@/core/calculations/options/trade-dates";
import { STORAGE_KEYS } from "@/core/database/local/storage-keys";
import { readJson, writeJson } from "@/core/database/local/local-storage";

export const OPTIONS_SAFETY_HISTORY_KEY = STORAGE_KEYS.optionsTradesHistory;
export const OPTIONS_BACKUP_EXPORT_VERSION = 1;
export const MAX_SAFETY_BACKUP_VERSIONS = 14;

export interface OptionsSafetyBackupVersion {
  id: string;
  createdAt: string;
  tradeCount: number;
  trades: OptionsTrade[];
}

export interface OptionsSafetyBackupStats {
  versionCount: number;
  latestBackup: OptionsSafetyBackupVersion | null;
  latestBackupTradeCount: number;
}

export interface OptionsBackupExportFile {
  version: number;
  exportedAt: string;
  trades: OptionsTrade[];
  safetyHistory: OptionsSafetyBackupVersion[];
}

function isValidTradeArray(value: unknown): value is OptionsTrade[] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        row &&
        typeof row === "object" &&
        typeof (row as OptionsTrade).id === "string" &&
        typeof (row as OptionsTrade).status === "string"
    )
  );
}

function normalizeVersion(raw: unknown): OptionsSafetyBackupVersion | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<OptionsSafetyBackupVersion>;
  if (
    typeof row.id !== "string" ||
    typeof row.createdAt !== "string" ||
    !isValidTradeArray(row.trades) ||
    row.trades.length === 0
  ) {
    return null;
  }
  const trades = normalizeOptionsTradesForStorage(row.trades);
  if (trades.length === 0) return null;
  return {
    id: row.id,
    createdAt: row.createdAt,
    tradeCount: trades.length,
    trades,
  };
}

export function readSafetyHistory(): OptionsSafetyBackupVersion[] {
  if (typeof window === "undefined") return [];
  const raw = readJson<unknown[]>(OPTIONS_SAFETY_HISTORY_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeVersion)
    .filter((row): row is OptionsSafetyBackupVersion => row != null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function writeSafetyHistory(versions: OptionsSafetyBackupVersion[]): void {
  if (typeof window === "undefined") return;
  writeJson(OPTIONS_SAFETY_HISTORY_KEY, versions.slice(0, MAX_SAFETY_BACKUP_VERSIONS));
}

export function getSafetyBackupStats(): OptionsSafetyBackupStats {
  const history = readSafetyHistory();
  const latestBackup = history[0] ?? null;
  return {
    versionCount: history.length,
    latestBackup,
    latestBackupTradeCount: latestBackup?.tradeCount ?? 0,
  };
}

export function readLocalOptionsTrades(): OptionsTrade[] {
  if (typeof window === "undefined") return [];
  return normalizeOptionsTradesForStorage(
    readJson<OptionsTrade[]>(STORAGE_KEYS.optionsTrades, [])
  );
}

/** Never creates empty backups. Keeps newest 14 non-empty versions. */
export function createSafetyBackup(trades: OptionsTrade[]): OptionsSafetyBackupVersion | null {
  if (typeof window === "undefined") return null;
  if (!Array.isArray(trades) || trades.length === 0) return null;

  const normalized = normalizeOptionsTradesForStorage(structuredClone(trades));
  if (normalized.length === 0) return null;

  const version: OptionsSafetyBackupVersion = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    tradeCount: normalized.length,
    trades: normalized,
  };

  const history = readSafetyHistory();
  const next = [version, ...history].slice(0, MAX_SAFETY_BACKUP_VERSIONS);
  writeSafetyHistory(next);

  if (process.env.NODE_ENV === "development") {
    console.log("[Options Safety] Created backup:", version.id, version.tradeCount, "trades");
  }

  return version;
}

export function verifyLatestSafetyBackup(): boolean {
  const latest = readSafetyHistory()[0];
  if (!latest) return false;
  return latest.tradeCount === latest.trades.length && latest.trades.length > 0;
}

export function getSafetyBackupById(id: string): OptionsSafetyBackupVersion | null {
  return readSafetyHistory().find((version) => version.id === id) ?? null;
}

export function buildOptionsBackupExport(
  currentTrades: OptionsTrade[]
): OptionsBackupExportFile {
  return {
    version: OPTIONS_BACKUP_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    trades: normalizeOptionsTradesForStorage(structuredClone(currentTrades)),
    safetyHistory: readSafetyHistory(),
  };
}

export function parseOptionsBackupImport(text: string): {
  ok: true;
  file: OptionsBackupExportFile;
  openCount: number;
  closedCount: number;
} | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "Invalid JSON file." };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Backup file must be a JSON object." };
  }

  const file = parsed as Partial<OptionsBackupExportFile>;
  if (file.version !== OPTIONS_BACKUP_EXPORT_VERSION) {
    return { ok: false, error: "Unsupported backup file version." };
  }
  if (!isValidTradeArray(file.trades)) {
    return { ok: false, error: "Backup trades array is missing or invalid." };
  }

  const trades = normalizeOptionsTradesForStorage(file.trades);
  const safetyHistory = Array.isArray(file.safetyHistory)
    ? file.safetyHistory
        .map(normalizeVersion)
        .filter((row): row is OptionsSafetyBackupVersion => row != null)
    : [];

  let openCount = 0;
  let closedCount = 0;
  for (const trade of trades) {
    if (trade.status === "open") openCount += 1;
    else if (trade.status === "closed") closedCount += 1;
  }

  return {
    ok: true,
    file: {
      version: OPTIONS_BACKUP_EXPORT_VERSION,
      exportedAt: typeof file.exportedAt === "string" ? file.exportedAt : new Date().toISOString(),
      trades,
      safetyHistory,
    },
    openCount,
    closedCount,
  };
}

export function downloadOptionsBackupJson(exportFile: OptionsBackupExportFile): void {
  const blob = new Blob([JSON.stringify(exportFile, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `options-backup-${exportFile.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
