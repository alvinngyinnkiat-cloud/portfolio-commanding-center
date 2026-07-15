"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { List } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { ScannerTickerDataStatus } from "@/core/calculations/scanner/scanner-ticker-records";
import type { ScannerRefreshProgress } from "@/core/services/scanner-refresh-orchestrator";
import {
  ScannerHealthCard,
  mapRefreshProgressToUiStatus,
  type ScannerRefreshUiStatus,
} from "./ScannerHealthCard";
import { ScannerRankingDashboard } from "./ScannerRankingDashboard";
import {
  ScannerFilterBar,
  matchesFilters,
  type CategoryFilter,
  type StrategyFilter,
  type SystemFilter,
} from "./ScannerFilterBar";
import { ScannerOpportunityCards } from "./ScannerOpportunityCards";

function ScannerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 rounded-lg bg-surface-border/50 animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-40 rounded-2xl border border-surface-border/50 bg-surface-card/50 animate-pulse"
        />
      ))}
    </div>
  );
}

function formatScanTime(iso: string | null | undefined): string {
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

function mapMetadataToUiStatus(
  status: "running" | "partial_success" | "success" | "failed"
): ScannerRefreshUiStatus {
  if (status === "partial_success") return "partial_success";
  if (status === "success") return "success";
  if (status === "failed") return "failed";
  return "refreshing";
}

export function ScannerView() {
  const { scannerData, services, refreshScannerPricesOnly, isLoaded } = usePortfolio();
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [systemFilter, setSystemFilter] = useState<SystemFilter>("all");
  const [tradableOnly, setTradableOnly] = useState(false);
  const [refreshStatus, setRefreshStatus] =
    useState<ScannerRefreshUiStatus>("idle");
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [failedTickers, setFailedTickers] = useState<string[]>([]);
  const [tickerStatuses, setTickerStatuses] = useState<
    Record<string, ScannerTickerDataStatus>
  >({});
  const refreshInFlightRef = useRef(false);

  const displayRun = scannerData?.latestRun ?? scannerData?.previousRun ?? null;

  const filteredResults = useMemo(() => {
    if (!displayRun) {
      return [];
    }

    return displayRun.results
      .filter((result) =>
        matchesFilters(
          strategyFilter,
          categoryFilter,
          systemFilter,
          tradableOnly,
          result
        )
      )
      .sort((a, b) => {
        if (a.tradable !== b.tradable) {
          return a.tradable ? -1 : 1;
        }
        return a.ticker.localeCompare(b.ticker);
      });
  }, [displayRun, strategyFilter, categoryFilter, systemFilter, tradableOnly]);

  const runRefresh = useCallback(
    async (mode: "all" | "failed") => {
      if (refreshInFlightRef.current || services.scannerRefresh.isRefreshRunning()) {
        return;
      }

      refreshInFlightRef.current = true;
      setRefreshStatus("refreshing");
      setProgressMessage("Refreshing 0/0");

      try {
        const onProgress = (progress: ScannerRefreshProgress) => {
          setProgressMessage(progress.message);
          setRefreshStatus(mapRefreshProgressToUiStatus(progress));
        };

        const result =
          mode === "failed" && failedTickers.length > 0
            ? await services.retryFailedScannerTickers(failedTickers, new Date(), onProgress)
            : await services.refreshScannerNow(new Date(), onProgress);

        await refreshScannerPricesOnly();

        setFailedTickers(result.refreshRun.failedTickers.map((row) => row.ticker));
        setTickerStatuses(result.tickerStatuses);
        setRefreshStatus(mapMetadataToUiStatus(result.metadataStatus));
        setProgressMessage(
          result.metadataStatus === "partial_success"
            ? `Partial success — ${result.refreshRun.successfulTickers.length}/${result.refreshRun.totalTickers} tickers updated`
            : result.metadataStatus === "success"
              ? "Refresh complete"
              : "Refresh failed"
        );
      } catch {
        setRefreshStatus("failed");
        setProgressMessage("Refresh failed");
      } finally {
        refreshInFlightRef.current = false;
      }
    },
    [services, refreshScannerPricesOnly, failedTickers]
  );

  const handleManualRefresh = useCallback(async () => {
    await runRefresh("all");
  }, [runRefresh]);

  const handleRetryFailed = useCallback(async () => {
    await runRefresh("failed");
  }, [runRefresh]);

  if (!isLoaded) {
    return <ScannerSkeleton />;
  }

  const showWarning =
    scannerData?.lastRefreshFailed && displayRun != null;

  return (
    <div className="space-y-6 overflow-x-hidden pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Watchlist Scanner
          </h1>
          <p className="text-sm text-slate-500">
            Daily opportunity scan · completed session only · auto refresh 6:00 AM
            SGT
          </p>
        </div>
        <Link
          href="/scanner/watchlist"
          className="inline-flex items-center gap-2 rounded-xl border border-surface-border/80 bg-surface-card px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-accent/40 hover:text-white"
        >
          <List size={16} />
          Manage Watchlist
        </Link>
      </header>

      {showWarning && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          Today&apos;s scan failed. Showing results from{" "}
          {formatScanTime(displayRun?.scanTime)}.
        </div>
      )}

      <ScannerHealthCard
        health={displayRun?.health ?? null}
        refreshStatus={refreshStatus}
        progressMessage={progressMessage}
        failedTickers={failedTickers}
        onRefresh={handleManualRefresh}
        onRetryFailed={handleRetryFailed}
      />

      {!displayRun ? (
        <div className="rounded-2xl border border-dashed border-surface-border/80 bg-surface-card/40 p-8 text-center text-slate-500">
          Scanner has not run yet. Use <strong>Refresh Scanner Now</strong> or
          wait for the automatic 6:00 AM SGT refresh after market data is
          available.
        </div>
      ) : (
        <>
          <ScannerRankingDashboard
            results={displayRun.results}
            bullPut={displayRun.rankings.bullPut}
            bearCall={displayRun.rankings.bearCall}
            ironCondor={displayRun.rankings.ironCondor}
          />
          <ScannerFilterBar
            strategyFilter={strategyFilter}
            categoryFilter={categoryFilter}
            systemFilter={systemFilter}
            tradableOnly={tradableOnly}
            onStrategyChange={setStrategyFilter}
            onCategoryChange={setCategoryFilter}
            onSystemChange={setSystemFilter}
            onTradableOnlyChange={setTradableOnly}
          />
          <ScannerOpportunityCards
            results={filteredResults}
            tickerStatuses={tickerStatuses}
          />
        </>
      )}
    </div>
  );
}
