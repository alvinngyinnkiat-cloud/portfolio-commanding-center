"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { PortfolioDashboardData } from "@/core/services/portfolio-aggregator";
import type { StockTrackerData } from "@/core/services/stock-tracker-service";
import type { CryptoTrackerData } from "@/core/services/crypto-tracker-service";
import type { ScannerTrackerData } from "@/core/domain/types/scanner";
import type { OptionsTrackerData } from "@/core/domain/types/options";
import {
  createPortfolioServices,
  type PortfolioServices,
} from "@/core/services";
import {
  getPersistenceManager,
  initializeRepositories,
} from "@/core/database/supabase";
import type { PersistenceStatus } from "@/core/database/supabase/persistence-manager";
import { PersistenceStatusBanner } from "@/shared/components/ui/PersistenceStatusBanner";

interface PortfolioContextValue {
  data: PortfolioDashboardData | null;
  stockData: StockTrackerData | null;
  cryptoData: CryptoTrackerData | null;
  scannerData: ScannerTrackerData | null;
  optionsData: OptionsTrackerData | null;
  services: PortfolioServices | null;
  refresh: () => void;
  /** Refresh crypto tracker + dashboard totals only — does not touch snapshots or other modules. */
  refreshCryptoOnly: () => void;
  /** Refresh scanner + options tracker only — does not touch crypto, stocks, or snapshots. */
  refreshScannerPricesOnly: () => Promise<void>;
  /** Bumps when shared scanner snapshot reloads after refresh. */
  scannerSnapshotVersion: number;
  isLoaded: boolean;
  isLoading: boolean;
  initError: string | null;
  persistenceStatus: PersistenceStatus | null;
  persistenceError: string | null;
  persistenceWarning: string | null;
  clearPersistenceError: () => void;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

const AUTO_PRICE_UPDATE_POLL_MS = 60_000;

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<PortfolioServices | null>(null);
  const [data, setData] = useState<PortfolioDashboardData | null>(null);
  const [stockData, setStockData] = useState<StockTrackerData | null>(null);
  const [cryptoData, setCryptoData] = useState<CryptoTrackerData | null>(null);
  const [scannerData, setScannerData] = useState<ScannerTrackerData | null>(null);
  const [optionsData, setOptionsData] = useState<OptionsTrackerData | null>(null);
  const [scannerSnapshotVersion, setScannerSnapshotVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [persistenceStatus, setPersistenceStatus] =
    useState<PersistenceStatus | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(
    null
  );

  const refresh = useCallback(() => {
    if (!services) return;

    try {
      setData(services.aggregator.getDashboardData());
    } catch (error) {
      console.error("[PortfolioProvider] dashboard refresh failed", error);
    }

    try {
      setStockData(services.stockTracker.getData());
    } catch (error) {
      console.error("[PortfolioProvider] stock tracker refresh failed", error);
    }

    try {
      setCryptoData(services.cryptoTracker.getData());
    } catch (error) {
      console.error("[PortfolioProvider] crypto tracker refresh failed", error);
    }

    try {
      setScannerData(services.scanner.getData());
    } catch (error) {
      console.error("[PortfolioProvider] scanner refresh failed", error);
    }

    try {
      setOptionsData(services.optionsTracker.getData());
    } catch (error) {
      console.error("[PortfolioProvider] options tracker refresh failed", error);
    }

    const manager = getPersistenceManager();
    if (manager) {
      setPersistenceStatus(manager.getStatus());
      setPersistenceError(manager.getLastError());
      setPersistenceWarning(manager.getLastWarning());
    }
  }, [services]);

  const refreshCryptoOnly = useCallback(() => {
    if (!services) return;

    try {
      setCryptoData(services.cryptoTracker.getData());
    } catch (error) {
      console.error("[PortfolioProvider] crypto refresh failed", error);
    }

    try {
      setData(services.aggregator.getDashboardData());
    } catch (error) {
      console.error("[PortfolioProvider] dashboard refresh after crypto failed", error);
    }

    const manager = getPersistenceManager();
    if (manager) {
      setPersistenceError(manager.getLastError());
      setPersistenceWarning(manager.getLastWarning());
    }
  }, [services]);

  const refreshScannerPricesOnly = useCallback(async () => {
    if (!services) return;

    const manager = getPersistenceManager();
    if (manager) {
      await manager.drainSyncQueue();
    }

    services.scannerSnapshot.invalidate();

    try {
      setScannerData(services.scanner.getData());
    } catch (error) {
      console.error("[PortfolioProvider] scanner refresh failed", error);
    }

    try {
      setOptionsData(services.optionsTracker.getData());
    } catch (error) {
      console.error("[PortfolioProvider] options tracker refresh failed", error);
    }

    setScannerSnapshotVersion(services.scannerSnapshot.getVersion());
  }, [services]);

  const clearPersistenceError = useCallback(() => {
    getPersistenceManager()?.clearError();
    setPersistenceError(null);
    setPersistenceWarning(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    initializeRepositories()
      .then(({ repos, manager }) => {
        if (cancelled) return;
        setServices(createPortfolioServices(repos));
        setPersistenceStatus(manager?.getStatus() ?? "local");
        setPersistenceError(manager?.getLastError() ?? null);
        setPersistenceWarning(manager?.getLastWarning() ?? null);
        setInitError(null);
        setIsLoaded(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("[PortfolioProvider] persistence init failed", error);
        setInitError(
          error instanceof Error
            ? error.message
            : "Failed to initialize portfolio persistence"
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!services || !isLoaded) return;
    refresh();
  }, [services, isLoaded, refresh]);

  useEffect(() => {
    if (!services) return;

    const runScheduledMarketAndScan = async () => {
      let shouldRefreshAll = false;
      let shouldRefreshScannerPrices = false;
      if ((await services.stockPriceUpdates.updateAllDuePrices()).length > 0) {
        shouldRefreshAll = true;
      }
      if ((await services.stockCandleUpdates.updateUsCandlesIfDue()).updated) {
        shouldRefreshAll = true;
      }
      if (services.scanner.runScanIfDue()) {
        shouldRefreshScannerPrices = true;
      }
      if (shouldRefreshAll) {
        refresh();
      } else if (shouldRefreshScannerPrices) {
        await refreshScannerPricesOnly();
      }
    };

    runScheduledMarketAndScan();
    const intervalId = window.setInterval(
      runScheduledMarketAndScan,
      AUTO_PRICE_UPDATE_POLL_MS
    );
    return () => window.clearInterval(intervalId);
  }, [services, refresh, refreshScannerPricesOnly]);

  return (
    <PortfolioContext.Provider
      value={{
        data,
        stockData,
        cryptoData,
        scannerData,
        optionsData,
        services,
        refresh,
        refreshCryptoOnly,
        refreshScannerPricesOnly,
        scannerSnapshotVersion,
        isLoaded,
        isLoading,
        initError,
        persistenceStatus,
        persistenceError,
        persistenceWarning,
        clearPersistenceError,
      }}
    >
      <PersistenceStatusBanner
        isLoading={isLoading}
        error={initError ?? persistenceError}
        warning={persistenceWarning}
        status={persistenceStatus}
        onDismiss={clearPersistenceError}
      />
      {isLoading || !services ? (
        <div className="min-w-0 space-y-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-border/50" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-surface-border/50 bg-surface-card/50"
              />
            ))}
          </div>
        </div>
      ) : (
        children
      )}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  if (!ctx.services) {
    throw new Error("Portfolio services are not ready yet");
  }
  return { ...ctx, services: ctx.services };
}
