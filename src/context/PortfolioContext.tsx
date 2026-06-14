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
  isLoaded: boolean;
  isLoading: boolean;
  initError: string | null;
  persistenceStatus: PersistenceStatus | null;
  persistenceError: string | null;
  clearPersistenceError: () => void;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

const AUTO_SNAPSHOT_POLL_MS = 60_000;
const AUTO_PRICE_UPDATE_POLL_MS = 60_000;

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<PortfolioServices | null>(null);
  const [data, setData] = useState<PortfolioDashboardData | null>(null);
  const [stockData, setStockData] = useState<StockTrackerData | null>(null);
  const [cryptoData, setCryptoData] = useState<CryptoTrackerData | null>(null);
  const [scannerData, setScannerData] = useState<ScannerTrackerData | null>(null);
  const [optionsData, setOptionsData] = useState<OptionsTrackerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [persistenceStatus, setPersistenceStatus] =
    useState<PersistenceStatus | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!services) return;
    setData(services.aggregator.getDashboardData());
    setStockData(services.stockTracker.getData());
    setCryptoData(services.cryptoTracker.getData());
    setScannerData(services.scanner.getData());
    setOptionsData(services.optionsTracker.getData());

    const manager = getPersistenceManager();
    if (manager) {
      setPersistenceStatus(manager.getStatus());
      setPersistenceError(manager.getLastError());
    }
  }, [services]);

  const clearPersistenceError = useCallback(() => {
    getPersistenceManager()?.clearError();
    setPersistenceError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    initializeRepositories()
      .then(({ repos, manager }) => {
        if (cancelled) return;
        setServices(createPortfolioServices(repos));
        setPersistenceStatus(manager?.getStatus() ?? "local");
        setInitError(null);
        setIsLoaded(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
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

    const tryAutoCapture = () => {
      const snapshot = services.snapshots.captureEndOfDayIfDue();
      if (snapshot) refresh();
    };

    tryAutoCapture();
    const intervalId = window.setInterval(tryAutoCapture, AUTO_SNAPSHOT_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [services, refresh]);

  useEffect(() => {
    if (!services) return;

    const runScheduledMarketAndScan = async () => {
      let shouldRefresh = false;
      if ((await services.stockPriceUpdates.updateAllDuePrices()).length > 0) {
        shouldRefresh = true;
      }
      if ((await services.stockCandleUpdates.updateUsCandlesIfDue()).updated) {
        shouldRefresh = true;
      }
      if (services.scanner.runScanIfDue()) {
        shouldRefresh = true;
      }
      if (shouldRefresh) refresh();
    };

    runScheduledMarketAndScan();
    const intervalId = window.setInterval(
      runScheduledMarketAndScan,
      AUTO_PRICE_UPDATE_POLL_MS
    );
    return () => window.clearInterval(intervalId);
  }, [services, refresh]);

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
        isLoaded,
        isLoading,
        initError,
        persistenceStatus,
        persistenceError,
        clearPersistenceError,
      }}
    >
      <PersistenceStatusBanner
        isLoading={isLoading}
        error={initError ?? persistenceError}
        status={persistenceStatus}
        onDismiss={clearPersistenceError}
      />
      {initError ? (
        <div className="rounded-2xl border border-accent-red/40 bg-accent-red/10 px-6 py-8 text-center">
          <p className="font-medium text-accent-red">Failed to load portfolio data</p>
          <p className="mt-2 text-sm text-accent-red/90">{initError}</p>
        </div>
      ) : isLoading || !services ? (
        <div className="space-y-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-border/50" />
          <div className="grid gap-4 sm:grid-cols-3">
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
