"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  buildStockPortfolioSummary,
  plTrend,
} from "@/core/calculations/stocks/summary";
import { formatSgd, formatUsd } from "@/shared/lib/format";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { FxRateErrorBanner } from "@/shared/components/ui/FxRateErrorBanner";
import { TrendingUp, Wallet, PiggyBank } from "lucide-react";

export function StockOverviewSection() {
  const { data, stockData, optionsData } = usePortfolio();

  const fxRateValid = stockData?.fxRateValid ?? false;
  const fxRate = stockData?.fxRate ?? null;
  const holdings = stockData?.holdings ?? [];
  const transactions = stockData?.transactions ?? [];
  const contributions = data?.contributions ?? [];

  const summary = useMemo(
    () =>
      buildStockPortfolioSummary(
        holdings,
        contributions,
        transactions,
        fxRate,
        optionsData?.trades ?? [],
        stockData?.cashFlow.fxConversions ?? []
      ),
    [
      holdings,
      contributions,
      transactions,
      fxRate,
      optionsData?.trades,
      stockData?.cashFlow.fxConversions,
    ]
  );

  return (
    <div className="min-w-0 space-y-4">
      {!fxRateValid && holdings.some((h) => h.market === "US") && (
        <FxRateErrorBanner />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Total Stock Value"
          value={formatSgd(summary.allMarketTotalValueSgd)}
          highlight
          icon={<Wallet size={18} />}
          subValue={`Holdings ${formatSgd(summary.totalStockHoldingsSgd)}`}
        />
        <SummaryCard
          label="Stock P/L"
          value={formatSgd(summary.allMarketPLSgd)}
          trend={plTrend(summary.allMarketPLSgd)}
          icon={<TrendingUp size={18} />}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Total Stock Contribution"
          value={formatSgd(summary.totalStockContributionSgd)}
          icon={<PiggyBank size={18} />}
          trend="neutral"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="US Total Value"
          value={formatSgd(summary.usTotalValueSgd)}
          subValue={formatUsd(summary.usTotalValueUsd)}
        />
        <SummaryCard
          label="US Available Cash"
          value={formatSgd(summary.usAvailableTradingCashSgd)}
          subValue={formatUsd(summary.usAvailableTradingCashUsd)}
          trend="neutral"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="SG Total Value"
          value={formatSgd(summary.sgTotalValueSgd)}
        />
        <SummaryCard
          label="SG Available Cash"
          value={formatSgd(summary.sgAvailableTradingCashSgd)}
          trend="neutral"
        />
      </div>
    </div>
  );
}
