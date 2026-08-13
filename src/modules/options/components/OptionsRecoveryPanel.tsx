"use client";

import type { OptionsRecoveryReport } from "@/core/database/options/options-recovery-diagnostics";
import { Button } from "@/shared/components/ui/Button";

function sumTradeRows(
  sources: OptionsRecoveryReport["backupLocalKeys"]
): number {
  return sources.reduce((sum, source) => sum + source.trades.length, 0);
}

function MetricLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-surface-border/40 py-2 font-mono text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

export function OptionsRecoveryPanel({
  report,
  checking,
  onRecheck,
}: {
  report: OptionsRecoveryReport | null;
  checking: boolean;
  onRecheck: () => void;
}) {
  if (checking && !report) {
    return (
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 px-6 py-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-200">
          Options Recovery Diagnostics
        </p>
        <p className="mt-2 text-sm text-slate-400">Running read-only recovery scan…</p>
      </div>
    );
  }

  if (!report) return null;

  const rawSupabase = report.supabaseRaw.rowCount;
  const parsedSupabase = report.filteredProductionRows.length;
  const mainLocal = report.mainLocalKey?.trades.length ?? 0;
  const backupRows = sumTradeRows(report.backupLocalKeys);
  const legacyRows = sumTradeRows(report.legacyLocalKeys);
  const finalHydrated = report.finalHydratedRows.length;
  const localRecoverable = mainLocal + backupRows + legacyRows;
  const schemaMismatch =
    rawSupabase > 0 && finalHydrated === 0 && parsedSupabase !== rawSupabase;

  return (
    <div className="space-y-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-200">
            Options Recovery Diagnostics
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Read-only · scanned {new Date(report.scannedAt).toLocaleString()}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onRecheck} disabled={checking}>
          {checking ? "Scanning…" : "Re-scan"}
        </Button>
      </div>

      <div className="rounded-xl border border-surface-border/60 bg-surface/40 px-4 py-2">
        <MetricLine label="Raw Supabase" value={rawSupabase} />
        <MetricLine label="Parsed Supabase" value={parsedSupabase} />
        <MetricLine label="Main Local" value={mainLocal} />
        <MetricLine label="Backup" value={backupRows} />
        <MetricLine label="Legacy" value={legacyRows} />
        <MetricLine label="Final Hydrated" value={finalHydrated} />
        <MetricLine
          label="Open Trades (hydrated)"
          value={report.finalHydratedOpenCount}
        />
        <MetricLine
          label="Closed Trades (hydrated)"
          value={report.finalHydratedClosedCount}
        />
        <MetricLine
          label="Open Trades (parsed Supabase)"
          value={report.filteredOpenCount}
        />
        <MetricLine
          label="Closed Trades (parsed Supabase)"
          value={report.filteredClosedCount}
        />
      </div>

      {(report.supabaseRaw.error || report.supabaseProductionError) && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <p className="font-medium">Supabase error</p>
          {report.supabaseRaw.errorCode && (
            <p className="mt-1 font-mono text-xs text-red-200/90">
              Code: {report.supabaseRaw.errorCode}
            </p>
          )}
          {report.supabaseRaw.error && (
            <p className="mt-1 font-mono text-xs">{report.supabaseRaw.error}</p>
          )}
          {report.supabaseProductionError &&
            report.supabaseProductionError !== report.supabaseRaw.error && (
              <p className="mt-1 font-mono text-xs">
                Production query: {report.supabaseProductionError}
              </p>
            )}
        </div>
      )}

      {rawSupabase === 0 && !report.supabaseRaw.error && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="font-mono text-sm font-semibold text-amber-100">
            NO OPTIONS TRADES FOUND IN SUPABASE
          </p>
        </div>
      )}

      {localRecoverable > 0 && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
          <p className="font-mono text-sm font-semibold text-emerald-100">
            RECOVERABLE LOCAL TRADES FOUND
          </p>
          <p className="mt-2 text-sm text-emerald-50/90">
            Main: {mainLocal} · Backup: {backupRows} · Legacy: {legacyRows} · Total:{" "}
            {localRecoverable}
          </p>
          {report.recoverableSourceKeys.length > 0 && (
            <p className="mt-1 font-mono text-xs text-emerald-200/80">
              Sources: {report.recoverableSourceKeys.join(", ")}
            </p>
          )}
        </div>
      )}

      {report.supabaseRaw.tradeSummaries.length > 0 && (
        <div className="rounded-xl border border-surface-border/60 bg-surface/40 px-4 py-3">
          <p className="text-sm font-medium text-slate-200">Supabase Trades</p>
          <ol className="mt-3 space-y-1 font-mono text-xs text-slate-300">
            {report.supabaseRaw.tradeSummaries.map((trade, index) => (
              <li key={`${trade.rowId ?? "row"}-${index}`}>
                {index + 1}. ID: {trade.tradeId ?? trade.rowId ?? "—"} | Status:{" "}
                {trade.status ?? "—"}
                {trade.tradeType ? ` | Type: ${trade.tradeType}` : ""}
              </li>
            ))}
          </ol>
        </div>
      )}

      {parsedSupabase > 0 && (
        <div className="rounded-xl border border-surface-border/60 bg-surface/40 px-4 py-3">
          <p className="text-sm font-medium text-slate-200">Parsed Supabase Trades</p>
          <ol className="mt-3 space-y-1 font-mono text-xs text-slate-300">
            {report.filteredProductionRows.map((trade, index) => (
              <li key={trade.id}>
                {index + 1}. ID: {trade.id} | Status: {trade.status} | Type:{" "}
                {trade.tradeType}
              </li>
            ))}
          </ol>
          {report.filteredOtherStatusCount > 0 && (
            <p className="mt-2 text-xs text-amber-300">
              {report.filteredOtherStatusCount} trade(s) with non-open/closed status.
            </p>
          )}
        </div>
      )}

      {(rawSupabase > 0 && finalHydrated === 0) || schemaMismatch ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-medium text-amber-100">
            Raw Supabase &gt; 0 but Final Hydrated = 0
          </p>
          <p className="mt-1 text-xs text-amber-100/80">
            Possible schema or hydration mismatch — sample raw row below (read-only).
          </p>
          {report.supabaseRaw.sampleRawRow != null && (
            <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-xs text-amber-50/90">
              {JSON.stringify(report.supabaseRaw.sampleRawRow, null, 2)}
            </pre>
          )}
          {report.supabaseRaw.sampleRowKeys.length > 0 && (
            <p className="mt-2 font-mono text-xs text-amber-200/70">
              Top-level keys: {report.supabaseRaw.sampleRowKeys.join(", ")}
            </p>
          )}
        </div>
      ) : null}

      {localRecoverable > 0 && (
        <div className="rounded-xl border border-surface-border/60 bg-surface/40 px-4 py-3">
          <p className="text-sm font-medium text-slate-200">Local / Legacy Sources</p>
          <ul className="mt-3 space-y-2 font-mono text-xs text-slate-300">
            {report.localSources
              .filter((source) => source.trades.length > 0)
              .map((source) => (
                <li key={source.key}>
                  {source.key}: {source.trades.length} trades ({source.openCount} open ·{" "}
                  {source.closedCount} closed)
                </li>
              ))}
          </ul>
        </div>
      )}

      {Object.keys(report.supabaseRaw.ownershipFieldValues).length > 0 && (
        <div className="rounded-xl border border-surface-border/60 bg-surface/40 px-4 py-3">
          <p className="text-sm font-medium text-slate-200">
            Supabase ownership / filter fields
          </p>
          <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs text-slate-400">
            {JSON.stringify(report.supabaseRaw.ownershipFieldValues, null, 2)}
          </pre>
        </div>
      )}

      {report.snapshotWipeRisk && (
        <p className="text-xs text-slate-500">{report.snapshotWipeRisk}</p>
      )}
    </div>
  );
}
