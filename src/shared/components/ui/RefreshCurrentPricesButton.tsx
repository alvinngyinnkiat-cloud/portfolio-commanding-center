"use client";

import { useCallback, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { CurrentPriceRefreshBatchResult } from "@/core/domain/types/current-price";
import type { CurrentPriceTickerInput } from "@/core/services/current-price-service";

export type CurrentPriceRefreshUiStatus =
  | "idle"
  | "refreshing"
  | "saving"
  | "updated"
  | "partial_success"
  | "failed";

interface RefreshCurrentPricesButtonProps {
  tickers: CurrentPriceTickerInput[];
  onRefresh: (
    tickers: CurrentPriceTickerInput[]
  ) => Promise<CurrentPriceRefreshBatchResult>;
  label?: string;
  className?: string;
}

const STATUS_LABELS: Record<
  Exclude<CurrentPriceRefreshUiStatus, "idle">,
  string
> = {
  refreshing: "Refreshing...",
  saving: "Saving...",
  updated: "Updated",
  partial_success: "Partial success",
  failed: "Failed",
};

export function RefreshCurrentPricesButton({
  tickers,
  onRefresh,
  label = "Refresh Current Prices",
  className = "",
}: RefreshCurrentPricesButtonProps) {
  const [status, setStatus] = useState<CurrentPriceRefreshUiStatus>("idle");
  const [failedTickers, setFailedTickers] = useState<
    Array<{ ticker: string; error: string }>
  >([]);
  const runningRef = useRef(false);

  const isRunning = status === "refreshing" || status === "saving";

  const runRefresh = useCallback(
    async (targets: CurrentPriceTickerInput[]) => {
      if (runningRef.current || targets.length === 0) return;
      runningRef.current = true;
      setStatus("refreshing");
      setFailedTickers([]);

      try {
        const result = await onRefresh(targets);
        setFailedTickers(result.failedTickers);
        if (result.status === "success") {
          setStatus("updated");
        } else if (result.status === "partial_success") {
          setStatus("partial_success");
        } else {
          setStatus("failed");
        }
      } catch (error) {
        console.error("[RefreshCurrentPricesButton] refresh failed", error);
        setStatus("failed");
      } finally {
        runningRef.current = false;
      }
    },
    [onRefresh]
  );

  const handleRefresh = () => {
    void runRefresh(tickers);
  };

  const handleRetryFailed = () => {
    if (failedTickers.length === 0) return;
    const failedSet = new Set(failedTickers.map((row) => row.ticker));
    const retryTargets = tickers.filter((row) => failedSet.has(row.ticker));
    void runRefresh(retryTargets);
  };

  const statusLabel = status === "idle" ? null : STATUS_LABELS[status];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {failedTickers.length > 0 && !isRunning && (
        <button
          type="button"
          onClick={handleRetryFailed}
          className="inline-flex items-center gap-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm font-medium text-yellow-200 transition-colors hover:border-yellow-400/60"
        >
          Retry Failed Tickers
        </button>
      )}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRunning || tickers.length === 0}
        className="inline-flex items-center gap-2 rounded-xl border border-surface-border/80 bg-surface/40 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-surface/70 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw size={16} className={isRunning ? "animate-spin" : ""} />
        {isRunning && status === "saving" ? "Saving..." : isRunning ? "Refreshing..." : label}
      </button>
      {statusLabel && (
        <span
          className={`text-xs ${
            status === "updated"
              ? "text-accent-green"
              : status === "partial_success"
                ? "text-yellow-300"
                : status === "failed"
                  ? "text-accent-red"
                  : "text-slate-400"
          }`}
        >
          {statusLabel}
        </span>
      )}
    </div>
  );
}
