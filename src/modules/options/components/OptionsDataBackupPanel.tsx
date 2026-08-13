"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPersistenceManager } from "@/core/database/supabase";
import {
  downloadOptionsBackupJson,
  getSafetyBackupStats,
  parseOptionsBackupImport,
  readLocalOptionsTrades,
  readSafetyHistory,
  type OptionsSafetyBackupVersion,
} from "@/core/database/options/options-safety-backup";
import { usePortfolio } from "@/context/PortfolioContext";
import { Button } from "@/shared/components/ui/Button";
import { formatDateTime } from "@/shared/lib/format";

function formatBackupDate(iso: string | null): string {
  if (!iso) return "—";
  return formatDateTime(iso);
}

export function OptionsDataBackupPanel() {
  const { optionsData, refresh, optionsTradesLoadState } = usePortfolio();
  const [cloudRecords, setCloudRecords] = useState<number | null>(null);
  const [localRecords, setLocalRecords] = useState(0);
  const [safetyVersions, setSafetyVersions] = useState(0);
  const [latestBackupAt, setLatestBackupAt] = useState<string | null>(null);
  const [latestBackupTradeCount, setLatestBackupTradeCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [versions, setVersions] = useState<OptionsSafetyBackupVersion[]>([]);
  const [importPreview, setImportPreview] = useState<{
    tradesFound: number;
    openCount: number;
    closedCount: number;
    backupVersions: number;
    raw: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshStats = useCallback(async () => {
    const manager = getPersistenceManager();
    const safety = getSafetyBackupStats();
    setLocalRecords(readLocalOptionsTrades().length);
    setSafetyVersions(safety.versionCount);
    setLatestBackupAt(safety.latestBackup?.createdAt ?? null);
    setLatestBackupTradeCount(safety.latestBackupTradeCount);
    setVersions(readSafetyHistory());

    if (manager) {
      const status = manager.getOptionsBackupPanelStatus();
      setLocalRecords(status.localRecords);
      setSafetyVersions(status.safetyVersions);
      setLatestBackupAt(status.latestBackupAt);
      setLatestBackupTradeCount(status.latestBackupTradeCount);
      try {
        setCloudRecords(await manager.fetchOptionsCloudRecordCount());
      } catch {
        setCloudRecords(status.cloudRecords);
      }
    } else {
      setCloudRecords(null);
    }
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats, optionsData?.trades.length, optionsTradesLoadState.status]);

  const handleCreateBackup = () => {
    const manager = getPersistenceManager();
    if (!manager) {
      setMessage("Persistence manager unavailable.");
      return;
    }
    const result = manager.createSafetyBackupNow();
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setMessage(`Safety backup created (${result.version.tradeCount} trades).`);
    void refreshStats();
  };

  const handleExport = () => {
    const manager = getPersistenceManager();
    if (!manager) return;
    downloadOptionsBackupJson(manager.exportOptionsBackupFile());
    setMessage("Options backup exported.");
  };

  const handleRestore = (versionId: string) => {
    const manager = getPersistenceManager();
    if (!manager) return;
    try {
      manager.restoreSafetyBackupVersion(versionId);
      setRestoreOpen(false);
      setMessage("Previous version restored locally. Supabase unchanged.");
      refresh();
      void refreshStats();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Restore failed.");
    }
  };

  const handleSyncRestored = async () => {
    const manager = getPersistenceManager();
    if (!manager) return;
    try {
      const result = await manager.syncRestoredTradesToSupabaseSafe();
      setMessage(
        `Synced to Supabase — inserted ${result.inserted}, skipped ${result.skipped}, invalid ${result.invalid}.`
      );
      void refreshStats();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Supabase sync failed.");
    }
  };

  const handleImportSelect = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseOptionsBackupImport(text);
    if (!parsed.ok) {
      setMessage(parsed.error);
      setImportPreview(null);
      return;
    }
    setImportPreview({
      tradesFound: parsed.file.trades.length,
      openCount: parsed.openCount,
      closedCount: parsed.closedCount,
      backupVersions: parsed.file.safetyHistory.length,
      raw: text,
    });
  };

  const confirmImport = () => {
    if (!importPreview) return;
    const manager = getPersistenceManager();
    if (!manager) return;
    const parsed = parseOptionsBackupImport(importPreview.raw);
    if (!parsed.ok) {
      setMessage(parsed.error);
      return;
    }
    try {
      manager.importOptionsBackupLocally(parsed.file);
      setImportPreview(null);
      setMessage("Backup imported locally. Supabase unchanged.");
      refresh();
      void refreshStats();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
  };

  return (
    <section className="rounded-2xl border border-surface-border/80 bg-surface-card/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Options Data Backup
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Versioned local safety copies — independent from Portfolio Snapshots.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refreshStats()}>
          Refresh
        </Button>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-slate-500">Cloud Records</dt>
          <dd className="font-mono text-white">{cloudRecords ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Local Records</dt>
          <dd className="font-mono text-white">{localRecords}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Safety Backup Versions</dt>
          <dd className="font-mono text-white">{safetyVersions}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Latest Safety Backup</dt>
          <dd className="font-mono text-white">{formatBackupDate(latestBackupAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Latest Backup Trade Count</dt>
          <dd className="font-mono text-white">{latestBackupTradeCount}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={handleCreateBackup}>
          Create Safety Backup Now
        </Button>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          Export Options Backup
        </Button>
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
          Import Options Backup
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setRestoreOpen((open) => !open)}
          disabled={versions.length === 0}
        >
          Restore Previous Version
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void handleSyncRestored()}>
          Sync Restored Trades to Supabase
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void handleImportSelect(event.target.files?.[0] ?? null)}
      />

      {restoreOpen && versions.length > 0 && (
        <div className="mt-4 rounded-xl border border-surface-border/60 bg-surface/40 p-3">
          <p className="text-xs font-medium text-slate-300">Select a version to restore locally</p>
          <ul className="mt-2 space-y-2">
            {versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-400">
                  {formatBackupDate(version.createdAt)} — {version.tradeCount} trades
                </span>
                <Button size="sm" variant="ghost" onClick={() => handleRestore(version.id)}>
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {importPreview && (
        <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm">
          <p className="font-medium text-cyan-100">Import preview</p>
          <p className="mt-2 text-slate-300">Trades Found: {importPreview.tradesFound}</p>
          <p className="text-slate-300">Open Trades: {importPreview.openCount}</p>
          <p className="text-slate-300">Closed Trades: {importPreview.closedCount}</p>
          <p className="text-slate-300">Backup Versions: {importPreview.backupVersions}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={confirmImport}>
              Confirm Import
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setImportPreview(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {message && <p className="mt-3 text-xs text-slate-400">{message}</p>}
    </section>
  );
}
