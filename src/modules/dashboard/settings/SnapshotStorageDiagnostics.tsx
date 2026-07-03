"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  probeSnapshotStorage,
  type SnapshotLoadDiagnostics,
} from "@/core/database/supabase/snapshot-storage";

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

export function SnapshotStorageDiagnostics({
  persistenceStatus,
  loadedCount,
}: {
  persistenceStatus: string | null;
  loadedCount: number;
}) {
  const [diagnostics, setDiagnostics] = useState<SnapshotLoadDiagnostics | null>(
    null
  );
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setDiagnostics({
        supabaseConfigured: false,
        dailyTableReachable: false,
        legacyTableReachable: false,
        dailyRowCount: 0,
        legacyRowCount: 0,
        mergedRowCount: loadedCount,
        lastFetchError: null,
        environment: process.env.NODE_ENV ?? "unknown",
        supabaseUrlHost: null,
      });
      return;
    }

    let cancelled = false;
    setProbing(true);
    probeSnapshotStorage(getSupabaseClient())
      .then((result) => {
        if (!cancelled) setDiagnostics(result);
      })
      .finally(() => {
        if (!cancelled) setProbing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadedCount, persistenceStatus]);

  return (
    <div className="rounded-xl border border-surface-border/60 bg-surface/30 px-4 py-3 text-xs text-slate-400">
      <p className="mb-2 font-medium uppercase tracking-wide text-slate-500">
        Snapshot storage diagnostics
      </p>
      <dl className="grid gap-1 sm:grid-cols-2">
        <div>
          <dt>Supabase connected</dt>
          <dd className="text-slate-200">
            {yesNo(diagnostics?.supabaseConfigured ?? isSupabaseConfigured())}
          </dd>
        </div>
        <div>
          <dt>daily_snapshots reachable</dt>
          <dd className="text-slate-200">
            {probing ? "…" : yesNo(diagnostics?.dailyTableReachable ?? false)}
          </dd>
        </div>
        <div>
          <dt>Rows in daily_snapshots</dt>
          <dd className="text-slate-200">{diagnostics?.dailyRowCount ?? "—"}</dd>
        </div>
        <div>
          <dt>Rows in legacy portfolio_snapshots</dt>
          <dd className="text-slate-200">{diagnostics?.legacyRowCount ?? "—"}</dd>
        </div>
        <div>
          <dt>Snapshots loaded in app</dt>
          <dd className="text-slate-200">{loadedCount}</dd>
        </div>
        <div>
          <dt>Persistence status</dt>
          <dd className="text-slate-200">{persistenceStatus ?? "—"}</dd>
        </div>
        <div>
          <dt>Environment</dt>
          <dd className="text-slate-200">{diagnostics?.environment ?? "—"}</dd>
        </div>
        <div>
          <dt>Supabase host</dt>
          <dd className="break-all text-slate-200">
            {diagnostics?.supabaseUrlHost ?? "—"}
          </dd>
        </div>
      </dl>
      {diagnostics?.lastFetchError ? (
        <p className="mt-2 text-accent-red">
          Failed to load Supabase snapshots: {diagnostics.lastFetchError}
        </p>
      ) : null}
    </div>
  );
}
