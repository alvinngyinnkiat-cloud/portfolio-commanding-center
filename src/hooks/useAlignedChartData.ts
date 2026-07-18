"use client";

import { useEffect, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { AlignedChartData } from "@/core/domain/types/aligned-chart-data";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

export interface UseAlignedChartDataResult {
  chart: AlignedChartData | null;
  loading: boolean;
}

/**
 * Resolves session-aligned chart data atomically for Scanner and Income charts.
 * Re-runs when shared market-data version bumps after refresh.
 */
export function useAlignedChartData(ticker: string): UseAlignedChartDataResult {
  const { services, marketDataVersion } = usePortfolio();
  const normalized = normalizeTicker(ticker);
  const [chart, setChart] = useState<AlignedChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    services.alignedChart
      .resolve(normalized)
      .then((resolved) => {
        if (!cancelled) {
          setChart(resolved);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("[useAlignedChartData] resolve failed", error);
        if (!cancelled) {
          setChart(services.alignedChart.resolveSync(normalized));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [services, normalized, marketDataVersion]);

  return { chart, loading };
}
