"use client";

import { useMemo, useRef, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatSgd, formatDate, formatDateTime } from "@/shared/lib/format";
import { Button } from "@/shared/components/ui/Button";
import { FxRateErrorBanner } from "@/shared/components/ui/FxRateErrorBanner";
import { Camera, Download, Upload } from "lucide-react";
import { getPersistenceManager } from "@/core/database/supabase";
import {
  appendSnapshotBackup,
  downloadSnapshotsJson,
  parseSnapshotsImportFile,
  readSnapshotBackup,
  writeSnapshotBackup,
} from "@/core/database/snapshots/snapshot-backup";

export function DailySnapshotTrigger() {
  const { data, services, refresh, persistenceStatus } = usePortfolio();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fxRateValid = data?.fxRateValid ?? false;
  const usesSupabase =
    persistenceStatus === "supabase" || persistenceStatus === "supabase_migrated";

  const [captureFeedback, setCaptureFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const snapshots = useMemo(
    () =>
      [...(data?.snapshots ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [data?.snapshots]
  );

  const latest = snapshots[0];

  const handleCapture = async () => {
    setCaptureFeedback(null);
    if (!services) {
      setCaptureFeedback({
        type: "error",
        message: "Portfolio services not ready. Refresh the page and try again.",
      });
      return;
    }

    try {
      const snapshot = services.snapshots.captureNow();
      if (!snapshot) {
        setCaptureFeedback({
          type: "error",
          message:
            "Capture failed — ensure the FX rate is valid and portfolio metrics are available.",
        });
        return;
      }

      appendSnapshotBackup(snapshot);

      if (usesSupabase) {
        const manager = getPersistenceManager();
        try {
          if (manager) {
            await manager.drainSyncQueue(15_000);
          }
          refresh();
          setCaptureFeedback({
            type: "success",
            message: "Saved to Supabase ✓",
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown Supabase error";
          refresh();
          setCaptureFeedback({
            type: "error",
            message: `Saved locally only — Supabase failed: ${message}`,
          });
        }
      } else {
        refresh();
        setCaptureFeedback({
          type: "success",
          message: "Saved locally ✓",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setCaptureFeedback({
        type: "error",
        message: `Capture failed: ${message}`,
      });
    }
  };

  const handleExport = () => {
    if (!services) return;
    const exportRows = services.snapshots.exportSnapshots(readSnapshotBackup());
    downloadSnapshotsJson(exportRows);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportFeedback(null);
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !services) return;

    try {
      const text = await file.text();
      const imported = parseSnapshotsImportFile(text);
      const merged = services.snapshots.importSnapshots(imported);
      writeSnapshotBackup(merged);

      if (usesSupabase) {
        const manager = getPersistenceManager();
        if (manager) {
          await manager.drainSyncQueue(15_000);
        }
      }

      refresh();
      setImportFeedback(`Imported ${imported.length} snapshot(s). ${merged.length} total after dedupe.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed";
      setImportFeedback(message);
    }
  };

  const handleDelete = (date: string) => {
    services?.snapshots.delete(date);
    refresh();
  };

  return (
    <div className="space-y-6">
      {!fxRateValid && <FxRateErrorBanner />}

      {captureFeedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            captureFeedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-accent-red/30 bg-accent-red/10 text-accent-red"
          }`}
        >
          {captureFeedback.message}
        </div>
      )}

      {importFeedback && (
        <div className="rounded-xl border border-surface-border/60 bg-surface/40 px-4 py-3 text-sm text-slate-300">
          {importFeedback}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          onClick={() => void handleCapture()}
          disabled={!fxRateValid}
          className="inline-flex items-center gap-2"
        >
          <Camera size={16} />
          Capture Snapshot Now
        </Button>
        <Button
          variant="secondary"
          onClick={handleExport}
          className="inline-flex items-center gap-2"
        >
          <Download size={16} />
          Export Snapshots Backup
        </Button>
        <Button
          variant="secondary"
          onClick={handleImportClick}
          className="inline-flex items-center gap-2"
        >
          <Upload size={16} />
          Import Snapshots Backup
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleImportFile(event)}
        />
      </div>

      {latest && (
        <div className="rounded-xl border border-surface-border/60 bg-surface/50 px-4 py-3 text-sm">
          <span className="text-slate-500">Latest snapshot · </span>
          <span className="text-slate-300">{formatDate(latest.date)}</span>
          <span className="text-slate-500"> · My Portfolio </span>
          <span className="font-semibold text-white">
            {formatSgd(latest.ownPortfolio)}
          </span>
        </div>
      )}

      <p className="text-sm text-slate-500">
        {snapshots.length} snapshot(s) loaded
        {usesSupabase ? " from Supabase (portfolio_snapshots)" : " locally"}.
        Manual capture saves to Supabase when connected and always writes a local
        backup to portfolio:snapshots_backup.
      </p>

      <div className="overflow-x-auto rounded-xl border border-surface-border/60">
        <table className="w-full text-sm">
          <thead className="bg-surface/60">
            <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Created At</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">My Portfolio</th>
              <th className="px-4 py-3">US Stocks</th>
              <th className="px-4 py-3">SG Stocks</th>
              <th className="px-4 py-3">Crypto</th>
              <th className="px-4 py-3">Personal Cash</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  No snapshots yet. Capture one to start tracking daily worth.
                </td>
              </tr>
            ) : (
              snapshots.map((snapshot) => (
                <tr
                  key={snapshot.date}
                  className="border-b border-surface-border/40 last:border-0 hover:bg-surface/30"
                >
                  <td className="px-4 py-3 text-slate-300">
                    {formatDate(snapshot.date)}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {formatDateTime(snapshot.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {snapshot.snapshotType}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {formatSgd(snapshot.ownPortfolio)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatSgd(snapshot.usStocksEtfSgd)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatSgd(snapshot.sgStocksSgd)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatSgd(snapshot.cryptoSgd)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatSgd(snapshot.personalCashSgd)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(snapshot.date)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
