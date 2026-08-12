"use client";

import type { OptionsRecoveryReport } from "@/core/database/options/options-recovery-diagnostics";
import { getPersistenceManager } from "@/core/database/supabase";
import { Button } from "@/shared/components/ui/Button";

function countLabel(report: OptionsRecoveryReport | null): string {
  if (!report) return "—";
  return `${report.finalHydratedOpenCount} open · ${report.finalHydratedClosedCount} closed`;
}

export function OptionsRecoveryPanel({
  report,
  checking,
  onRecheck,
  onRestored,
}: {
  report: OptionsRecoveryReport | null;
  checking: boolean;
  onRecheck: () => void;
  onRestored: () => void;
}) {
  const handleRestore = () => {
    if (!report || report.recoverableTrades.length === 0) return;
    const manager = getPersistenceManager();
    if (!manager) return;
    manager.restoreOptionsTradesFromRecovery(report.recoverableTrades);
    onRestored();
  };

  if (checking && !report) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-5">
        <p className="text-sm font-medium text-amber-100">
          Recovery check in progress…
        </p>
      </div>
    );
  }

  if (!report) return null;

  const recoverableOpen = report.recoverableTrades.filter(
    (trade) => trade.status === "open"
  ).length;
  const recoverableClosed = report.recoverableTrades.filter(
    (trade) => trade.status === "closed"
  ).length;

  return (
    <div className="space-y-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-5">
      <div>
        <p className="text-sm font-medium text-amber-100">
          Options data could not be located in the active Module 5 state.
        </p>
        <p className="mt-2 text-xs text-amber-100/80">
          Recovery check required — review diagnostics below before restoring.
        </p>
      </div>

      <dl className="grid gap-2 text-xs text-amber-50/90 sm:grid-cols-2">
        <div>
          <dt className="text-amber-200/70">Raw Supabase rows</dt>
          <dd className="font-mono">{report.supabaseRaw.rowCount}</dd>
        </div>
        <div>
          <dt className="text-amber-200/70">Filtered Supabase rows</dt>
          <dd className="font-mono">
            {report.filteredProductionRows.length} ({report.filteredOpenCount}{" "}
            open · {report.filteredClosedCount} closed)
          </dd>
        </div>
        <div>
          <dt className="text-amber-200/70">Main local key rows</dt>
          <dd className="font-mono">{report.mainLocalKey?.trades.length ?? 0}</dd>
        </div>
        <div>
          <dt className="text-amber-200/70">Backup / legacy local rows</dt>
          <dd className="font-mono">
            {report.backupLocalKeys.reduce((sum, row) => sum + row.trades.length, 0) +
              report.legacyLocalKeys.reduce((sum, row) => sum + row.trades.length, 0)}
          </dd>
        </div>
        <div>
          <dt className="text-amber-200/70">Final hydrated rows</dt>
          <dd className="font-mono">{countLabel(report)}</dd>
        </div>
        <div>
          <dt className="text-amber-200/70">Recoverable sources</dt>
          <dd className="font-mono">
            {report.recoverableSourceKeys.length > 0
              ? report.recoverableSourceKeys.join(", ")
              : "none"}
          </dd>
        </div>
      </dl>

      {Object.keys(report.supabaseRaw.ownershipFieldValues).length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-black/20 p-3 text-xs text-amber-50/90">
          <p className="font-medium text-amber-100">Supabase field values</p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono">
            {JSON.stringify(report.supabaseRaw.ownershipFieldValues, null, 2)}
          </pre>
        </div>
      )}

      {report.snapshotWipeRisk && (
        <p className="text-xs text-amber-100/90">{report.snapshotWipeRisk}</p>
      )}

      {report.supabaseRaw.error && (
        <p className="text-xs text-red-200">Supabase error: {report.supabaseRaw.error}</p>
      )}

      {report.allSourcesEmpty && report.recoverableTrades.length === 0 && (
        <p className="text-xs text-amber-100/90">
          All known Supabase and local sources returned zero trades after the recovery
          scan.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onRecheck} disabled={checking}>
          {checking ? "Checking…" : "Re-run recovery check"}
        </Button>
        {process.env.NODE_ENV === "development" &&
          report.recoverableTrades.length > 0 &&
          report.finalHydratedRows.length === 0 && (
            <Button onClick={handleRestore}>
              Restore {report.recoverableTrades.length} Options Trades ({recoverableOpen}{" "}
              open · {recoverableClosed} closed)
            </Button>
          )}
      </div>
    </div>
  );
}

export function OptionsRecoveryPreview({
  report,
}: {
  report: OptionsRecoveryReport;
}) {
  if (report.recoverableTrades.length === 0) return null;

  const preview = report.recoverableTrades.slice(0, 5);
  return (
    <div className="rounded-xl border border-surface-border/80 bg-surface/40 p-4 text-xs text-slate-300">
      <p className="font-medium text-slate-200">Recovery preview (first 5 trades)</p>
      <ul className="mt-2 space-y-1">
        {preview.map((trade) => (
          <li key={trade.id} className="font-mono">
            {trade.id} · {trade.status} · {trade.tradeType} · {trade.strategy}
          </li>
        ))}
      </ul>
      {report.recoverableTrades.length > 5 && (
        <p className="mt-2 text-slate-500">
          +{report.recoverableTrades.length - 5} more in recoverable source
        </p>
      )}
    </div>
  );
}
