"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
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

interface PortfolioContextValue {
  data: PortfolioDashboardData | null;
  stockData: StockTrackerData | null;
  cryptoData: CryptoTrackerData | null;
  scannerData: ScannerTrackerData | null;
  optionsData: OptionsTrackerData | null;
  services: PortfolioServices;
  refresh: () => void;
  isLoaded: boolean;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

/** Poll interval for end-of-day snapshot while the app is open (v1.1 localStorage). */
const AUTO_SNAPSHOT_POLL_MS = 60_000;

/** Poll interval for scheduled stock price updates while the app is open. */
const AUTO_PRICE_UPDATE_POLL_MS = 60_000;

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const services = useMemo(() => createPortfolioServices(), []);
  const [data, setData] = useState<PortfolioDashboardData | null>(null);
  const [stockData, setStockData] = useState<StockTrackerData | null>(null);
  const [cryptoData, setCryptoData] = useState<CryptoTrackerData | null>(null);
  const [scannerData, setScannerData] = useState<ScannerTrackerData | null>(null);
  const [optionsData, setOptionsData] = useState<OptionsTrackerData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(() => {
    setData(services.aggregator.getDashboardData());
    setStockData(services.stockTracker.getData());
    setCryptoData(services.cryptoTracker.getData());
    setScannerData(services.scanner.getData());
    setOptionsData(services.optionsTracker.getData());
  }, [services]);

  useEffect(() => {
    refresh();
    setIsLoaded(true);
  }, [refresh]);

  /**
   * v1.1: client-side poll for 11:59pm SGT auto capture (SnapshotService.captureEndOfDayIfDue).
   * Future: remove this interval when Supabase cron runs the same capture server-side.
   */
  useEffect(() => {
    const tryAutoCapture = () => {
      const snapshot = services.snapshots.captureEndOfDayIfDue();
      if (snapshot) {
        refresh();
      }
    };

    tryAutoCapture();
    const intervalId = window.setInterval(tryAutoCapture, AUTO_SNAPSHOT_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [services, refresh]);

  /**
   * v1.1: client-side poll for scheduled stock price + candle updates and scanner refresh.
   * US 6:00 AM SGT — Stock Tracker data refresh, then Scanner recalculation.
   */
  useEffect(() => {
    const runScheduledMarketAndScan = async () => {
      let shouldRefresh = false;

      const priceResults = await services.stockPriceUpdates.updateAllDuePrices();
      if (priceResults.length > 0) {
        shouldRefresh = true;
      }

      const candleResult = await services.stockCandleUpdates.updateUsCandlesIfDue();
      if (candleResult.updated) {
        shouldRefresh = true;
      }

      const scanRun = services.scanner.runScanIfDue();
      if (scanRun) {
        shouldRefresh = true;
      }

      if (shouldRefresh) {
        refresh();
      }
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
      value={{ data, stockData, cryptoData, scannerData, optionsData, services, refresh, isLoaded }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}
