"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { formatSgd, formatUsd, formatPercent } from "@/shared/lib/format";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { DailyPortfolioChart } from "./DailyPortfolioChart";
import { MonthlyContributionChart } from "./MonthlyContributionChart";
import { GoalProgressCards } from "./GoalProgressCards";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  PiggyBank,
  BarChart3,
} from "lucide-react";

export function DashboardView() {
  const { data, isLoaded } = usePortfolio();

  if (!isLoaded || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  const { metrics, settings, allocation, goalProgress, contributions, snapshots } =
    data;
  const plTrend = metrics.ownPL >= 0 ? "positive" : "negative";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Portfolio Dashboard</h2>
        <p className="text-sm text-slate-500">
          Read-only view · Edit values in Settings
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Own Portfolio"
          value={formatSgd(metrics.ownPortfolio)}
          subValue="Total Portfolio minus Client Portfolio"
          icon={<Wallet size={18} className="text-accent" />}
        />
        <SummaryCard
          label="Total Portfolio"
          value={formatSgd(metrics.totalPortfolio)}
          subValue="All assets including client funds"
          icon={<BarChart3 size={18} className="text-slate-400" />}
        />
        <SummaryCard
          label="Client Portfolio"
          value={formatSgd(metrics.clientPortfolio)}
          subValue={`Ref: ${formatUsd(settings.manualValues.clientPortfolioUsd)}`}
          icon={<Users size={18} className="text-slate-400" />}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Own P/L"
          value={formatSgd(metrics.ownPL)}
          trend={plTrend}
          icon={
            metrics.ownPL >= 0 ? (
              <TrendingUp size={18} className="text-accent-green" />
            ) : (
              <TrendingDown size={18} className="text-accent-red" />
            )
          }
        />
        <SummaryCard
          label="Own P/L %"
          value={formatPercent(metrics.ownPLPercent)}
          trend={plTrend}
        />
        <SummaryCard
          label="Total Contribution"
          value={formatSgd(metrics.totalContribution)}
          subValue={`Stock: ${formatSgd(metrics.stockDeposits)} · Crypto: ${formatSgd(metrics.cryptoDeposits)} · Withdrawals: ${formatSgd(metrics.withdrawals)}`}
          icon={<PiggyBank size={18} className="text-slate-400" />}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="US Stocks & ETFs"
          value={formatSgd(metrics.usStocksEtfSgd)}
          subValue={`Ref: ${formatUsd(metrics.usStocksEtfUsd)}`}
        />
        <SummaryCard label="SG Stocks" value={formatSgd(metrics.sgStocksSgd)} />
        <SummaryCard label="Crypto" value={formatSgd(metrics.cryptoSgd)} />
        <SummaryCard
          label="Cash"
          value={formatSgd(metrics.totalCashSgd)}
          subValue={`Stock cash: ${formatUsd(settings.stockCashUsd)} · Crypto cash: ${formatSgd(settings.cryptoCashSgd)}`}
        />
      </div>

      <AssetAllocationChart data={allocation} total={metrics.ownPortfolio} />
      <DailyPortfolioChart snapshots={snapshots} />
      <MonthlyContributionChart contributions={contributions} />
      <GoalProgressCards goals={goalProgress} />
    </div>
  );
}
