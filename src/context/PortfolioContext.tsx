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
import {
  createPortfolioServices,
  type PortfolioServices,
} from "@/core/services";

interface PortfolioContextValue {
  data: PortfolioDashboardData | null;
  services: PortfolioServices;
  refresh: () => void;
  isLoaded: boolean;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const services = useMemo(() => createPortfolioServices(), []);
  const [data, setData] = useState<PortfolioDashboardData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(() => {
    setData(services.aggregator.getDashboardData());
  }, [services]);

  useEffect(() => {
    refresh();
    setIsLoaded(true);
  }, [refresh]);

  return (
    <PortfolioContext.Provider value={{ data, services, refresh, isLoaded }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error("usePortfolio must be used within PortfolioProvider");
  return ctx;
}
