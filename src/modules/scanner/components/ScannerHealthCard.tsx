"use client";

import type { ScannerHealth } from "@/core/domain/types/scanner";
import { Card } from "@/shared/components/ui/Card";
import { RefreshCw } from "lucide-react";

export type ScannerRefreshUiStatus = "idle" | "refreshing" | "success" | "failed";

interface ScannerHealthCardProps {
  health: ScannerHealth | null;
  refreshStatus?: ScannerRefreshUiStatus;
  onRefresh?: () => void;
}

const STATUS_LABELS = {
  healthy: "Healthy",
  stale: "Stale",
  unavailable: "Unavailable",
} as const;

const STATUS_COLORS = {
  healthy: "text-accent-green",
  stale: "text-yellow-400",
  unavailable: "text-accent-red",
} as const;

const REFRESH_STATUS_LABELS: Record<
  Exclude<ScannerRefreshUiStatus, "idle">,
  string
> = {
  refreshing: "Refreshing...",
  success: "Refresh successful",
  failed: "Refresh failed",
};

function formatScanTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(",", "");
}

export function ScannerHealthCard({
  health,
  refreshStatus = "idle",
  onRefresh,
}: ScannerHealthCardProps) {
  const status = health?.dataSourceStatus ?? "unavailable";
  const isRefreshing = refreshStatus === "refreshing";

  return (
    <Card
      title="Scanner Health"
      subtitle="Data pipeline status"
      action={
        onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-surface-border/80 bg-surface-card px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-accent/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin" : undefined}
            />
            Refresh Scanner Now
          </button>
        ) : undefined
      }
    >
      {refreshStatus !== "idle" && (
        <p
          className={`mb-4 text-sm ${
            refreshStatus === "success"
              ? "text-accent-green"
              : refreshStatus === "failed"
                ? "text-accent-red"
                : "text-slate-400"
          }`}
        >
          {REFRESH_STATUS_LABELS[refreshStatus]}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Data Source Status
          </p>
          <p className={`mt-1 text-lg font-semibold ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Last Successful Refresh
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {formatScanTime(health?.lastSuccessfulRefresh ?? null)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Failed Refresh Count
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {health?.failedRefreshCount ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Indicators Calculated
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {health?.indicatorsCalculated ?? 0}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Missing Tickers
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {health?.missingTickers.length
              ? health.missingTickers.join(", ")
              : "—"}
          </p>
        </div>
      </div>
    </Card>
  );
}
