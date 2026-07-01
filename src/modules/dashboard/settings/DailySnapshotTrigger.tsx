"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatSgd, formatDate, formatDateTime } from "@/shared/lib/format";
import { Button } from "@/shared/components/ui/Button";
import { FxRateErrorBanner } from "@/shared/components/ui/FxRateErrorBanner";
import { Camera } from "lucide-react";

export function DailySnapshotTrigger() {
  const { data, services, refresh } = usePortfolio();

  const fxRateValid = data?.fxRateValid ?? false;

  const snapshots = useMemo(
    () =>
      [...(data?.snapshots ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [data?.snapshots]
  );

  const latest = snapshots[0];

  const handleCapture = () => {
    const snapshot = services.snapshots.captureNow();
    if (snapshot) {
      refresh();
    }
  };

  const handleDelete = (date: string) => {
    services.snapshots.delete(date);
    refresh();
  };

  return (
    <div className="space-y-6">
      {!fxRateValid && <FxRateErrorBanner />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          onClick={handleCapture}
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
          {snapshots.length} snapshot(s) stored locally. Each capture records
          date, createdAt timestamp, snapshot type (manual / automatic), My
          Portfolio, totals, contribution, and US / SG / Crypto / Personal Cash
          (SGD). Snapshots power the Daily Portfolio Worth chart. Use{" "}
          <strong className="text-slate-400">Capture Snapshot Now</strong> for
          manual saves in this browser. Auto snapshot requires server storage
          such as Supabase — Vercel Cron cannot update localStorage.
        </p>
        <p className="text-xs text-slate-600">
          <strong className="text-slate-500">v1 limitations:</strong> Historical
          USD cash is valued using the current app-wide FX rate unless stored in
          the snapshot (fxRateUsed). Capturing again on the same calendar date
          overwrites the existing snapshot for that date.
        </p>
      </div>

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
