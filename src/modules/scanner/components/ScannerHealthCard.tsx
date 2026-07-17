"use client";

import type { ScannerRefreshRunMetadata } from "@/core/calculations/scanner/scanner-ticker-records";
import type { ScannerRefreshProgress } from "@/core/services/scanner-refresh-orchestrator";
import { Card } from "@/shared/components/ui/Card";
import { RefreshCw } from "lucide-react";

export type ScannerRefreshUiStatus =
  | "idle"
  | "refreshing"
  | "saving"
  | "verifying"
  | "success"
  | "partial_success"
  | "failed";

interface ScannerHealthCardProps {
  health: import("@/core/domain/types/scanner").ScannerHealth | null;
  refreshStatus?: ScannerRefreshUiStatus;
  progressMessage?: string | null;
  failedTickers?: string[];
  lastRefreshRun?: ScannerRefreshRunMetadata | null;
  onRefresh?: () => void;
  onRetryFailed?: () => void;
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
  saving: "Saving...",
  verifying: "Verifying...",
  success: "Refresh complete",
  partial_success: "Partial success — some tickers failed",
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
  progressMessage,
  failedTickers = [],
  lastRefreshRun = null,
  onRefresh,
  onRetryFailed,
}: ScannerHealthCardProps) {
  const status = health?.dataSourceStatus ?? "unavailable";
  const isRunning =
    refreshStatus === "refreshing" ||
    refreshStatus === "saving" ||
    refreshStatus === "verifying";

  return (
    <Card
      title="Scanner Health"
      subtitle="Data pipeline status"
      action={
        <div className="flex flex-wrap gap-2">
          {onRetryFailed && failedTickers.length > 0 && !isRunning && (
            <button
              type="button"
              onClick={onRetryFailed}
              className="inline-flex items-center gap-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm font-medium text-yellow-200 transition-colors hover:border-yellow-400/60"
            >
              Retry Failed Tickers
            </button>
          )}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded-xl border border-surface-border/80 bg-surface-card px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-accent/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={14}
                className={isRunning ? "animate-spin" : undefined}
              />
              Refresh Scanner Now
            </button>
          ) : undefined}
        </div>
      }
    >
      {refreshStatus !== "idle" && (
        <p
          className={`mb-4 text-sm ${
            refreshStatus === "success"
              ? "text-accent-green"
              : refreshStatus === "partial_success"
                ? "text-yellow-300"
                : refreshStatus === "failed"
                  ? "text-accent-red"
                  : "text-slate-400"
          }`}
        >
          {progressMessage ?? REFRESH_STATUS_LABELS[refreshStatus]}
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
            {formatScanTime(
              lastRefreshRun?.completedAt ??
                health?.lastSuccessfulRefresh ??
                null
            )}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Successful Tickers
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {lastRefreshRun?.successfulTickers.length ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Failed Tickers
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {lastRefreshRun?.failedTickers.length ?? failedTickers.length ?? 0}
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

export function mapRefreshProgressToUiStatus(
  progress: ScannerRefreshProgress
): ScannerRefreshUiStatus {
  if (progress.phase === "saving") return "saving";
  if (progress.phase === "verifying") return "verifying";
  if (progress.phase === "complete") return "success";
  return "refreshing";
}
