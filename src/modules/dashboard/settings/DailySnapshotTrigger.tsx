"use client";

import { useMemo, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatSgd, formatDate, formatDateTime } from "@/shared/lib/format";
import { Button } from "@/shared/components/ui/Button";
import { FxRateErrorBanner } from "@/shared/components/ui/FxRateErrorBanner";
import { Camera } from "lucide-react";
import { SnapshotStorageDiagnostics } from "./SnapshotStorageDiagnostics";
import { getPersistenceManager } from "@/core/database/supabase";

export function DailySnapshotTrigger() {
  const {
    data,
    services,
    refresh,
    persistenceStatus,
    persistenceError,
    persistenceWarning,
  } = usePortfolio();

  const fxRateValid = data?.fxRateValid ?? false;
  const usesSupabase =
    persistenceStatus === "supabase" || persistenceStatus === "supabase_migrated";

  const [captureFeedback, setCaptureFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const snapshots = useMemo(
    () =>
      [...(data?.snapshots ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [data?.snapshots]
  );

  const latest = snapshots[0];

  const snapshotLoadError =
    persistenceError?.startsWith("Failed to load Supabase snapshots:")
      ? persistenceError
      : null;

  const emptyMessage = useMemo(() => {
    if (snapshotLoadError) return snapshotLoadError;
    if (snapshots.length === 0) {
      return "No snapshots yet. Capture one to start tracking daily worth.";
    }
    return null;
  }, [snapshotLoadError, snapshots.length]);

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

      refresh();

      const manager = getPersistenceManager();
      if (manager && usesSupabase) {
        try {
          await manager.drainSyncQueue(15_000);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Supabase sync failed";
          setCaptureFeedback({
            type: "error",
            message: `Snapshot saved locally but Supabase sync failed: ${message}`,
          });
          refresh();
          return;
        }
      }

      refresh();
      setCaptureFeedback({
        type: "success",
        message: `Snapshot saved for ${formatDate(snapshot.date)} (${snapshot.snapshotType}).`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setCaptureFeedback({
        type: "error",
        message: `Capture failed: ${message}`,
      });
    }
  };

  const handleDelete = (date: string) => {
    services?.snapshots.delete(date);
    refresh();
  };

  return (
    <div className="space-y-6">
      {!fxRateValid && <FxRateErrorBanner />}

      {persistenceWarning && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {persistenceWarning}
        </div>
      )}

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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          onClick={() => void handleCapture()}
          disabled={!fxRateValid}
          className="inline-flex items-center gap-2"
        >
          <Camera size={16} />
          Capture Snapshot Now
        </Button>
        {latest && (
          <div className="rounded-xl border border-surface-border/60 bg-surface/50 px-4 py-3 text-sm">
            <span className="text-slate-500">Latest snapshot · </span>
            <span className="text-slate-300">{formatDate(latest.date)}</span>
            <span className="text-slate-500"> · My Portfolio </span>
            <span className="font-semibold text-white">
              {formatSgd(latest.ownPortfolio)}
            </span>
            <span className="text-slate-500"> · {latest.snapshotType}</span>
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm text-slate-500">
        <p>
          {snapshots.length} snapshot(s) loaded
          {usesSupabase ? " from Supabase (daily_snapshots)" : " from this browser"}.
          Manual capture saves to Supabase when connected. Automatic capture runs
          at 11:59pm Singapore time via Vercel Cron. Re-capturing the same
          Singapore calendar date overwrites that date only.
        </p>
      </div>

      <SnapshotStorageDiagnostics
        persistenceStatus={persistenceStatus}
        loadedCount={snapshots.length}
      />

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
                <td
                  colSpan={9}
                  className={`px-4 py-8 text-center ${
                    snapshotLoadError ? "text-accent-red" : "text-slate-500"
                  }`}
                >
                  {emptyMessage}
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
