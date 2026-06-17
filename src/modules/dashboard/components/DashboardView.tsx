"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { formatSgd, formatUsd, formatPercent } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { FxRateErrorBanner } from "@/shared/components/ui/FxRateErrorBanner";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { DailyPortfolioChart } from "./DailyPortfolioChart";
import { MonthlyContributionChart } from "./MonthlyContributionChart";
import { GoalProgressCards } from "./GoalProgressCards";
import { isEmptyPortfolio } from "@/shared/lib/portfolio-empty";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  PiggyBank,
  Bitcoin,
  Banknote,
  Globe,
  PieChart,
} from "lucide-react";

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-surface-border/50 animate-pulse" />
        <div className="h-4 w-64 rounded bg-surface-border/30 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl border border-surface-border/50 bg-surface-card/50 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export function DashboardView() {
  const { data, isLoaded } = usePortfolio();

  if (!isLoaded || !data) {
    return <DashboardSkeleton />;
  }

  const {
    metrics,
    settings,
    allocation,
    goalProgress,
    contributions,
    snapshots,
    fxRateValid,
  } = data;

  if (!fxRateValid || !metrics) {
    return (
      <div className="min-w-0 space-y-8 pb-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Portfolio Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Read-only overview · All values in SGD · Edit in Settings
          </p>
        </header>
        <FxRateErrorBanner />
        <DailyPortfolioChart snapshots={snapshots} />
      </div>
    );
  }

  const plTrend = coerceNumber(metrics.totalPL) >= 0 ? "positive" : "negative";
  const assetAllocationTotal = (allocation ?? []).reduce(
    (sum, item) => sum + coerceNumber(item?.value),
    0
  );

  return (
    <div className="min-w-0 space-y-8 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Portfolio Dashboard
        </h1>
        <p className="text-sm text-slate-500">
          Read-only overview · All values in SGD · Edit in Settings
        </p>
      </header>

      {isEmptyPortfolio(metrics) && (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface/40 px-6 py-5 text-center">
          <p className="text-sm text-slate-400">
            Add your first contribution or holding to begin.
          </p>
        </div>
      )}

      <section>
        <SectionHeader
          title="Portfolio Ownership"
          description="Own Portfolio = Total Portfolio − Client Equity"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Own Portfolio"
            value={formatSgd(metrics.ownPortfolio)}
            subValue="Total Portfolio − Client Equity"
            highlight
            icon={<Wallet size={18} />}
          />
          <SummaryCard
            label="Total Portfolio"
            value={formatSgd(metrics.totalPortfolio)}
            subValue="US + SG + Crypto net value (holdings + cash)"
            icon={<Wallet size={18} />}
          />
          <SummaryCard
            label="Client Equity"
            value={formatSgd(metrics.clientPortfolio)}
            subValue={`Module 5 · ${formatUsd(metrics.clientPortfolioUsd)}`}
            icon={<Users size={18} />}
          />
          <SummaryCard
            label="Client Ownership %"
            value={formatPercent(metrics.clientOwnershipPercent)}
            subValue="Client Equity ÷ Total Portfolio × 100"
            icon={<PieChart size={18} />}
          />
        </div>
      </section>

      <section>
        <SectionHeader
          title="Performance & Contributions"
          description="Capital model P/L and contribution from Stock + Crypto trackers"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            label="Total P/L"
            value={formatSgd(metrics.totalPL)}
            trend={plTrend}
            icon={
              metrics.totalPL >= 0 ? (
                <TrendingUp size={18} />
              ) : (
                <TrendingDown size={18} />
              )
            }
          />
          <SummaryCard
            label="Total P/L %"
            value={formatPercent(metrics.totalPLPercent)}
            trend={plTrend}
            icon={<TrendingUp size={18} />}
          />
          <SummaryCard
            label="Total Contribution"
            value={formatSgd(metrics.totalContribution)}
            subValue={`Stock ${formatSgd(metrics.totalStockContributionSgd)} · Crypto ${formatSgd(metrics.cryptoContributionSgd)}`}
            icon={<PiggyBank size={18} />}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Asset Breakdown & Allocation"
          description="Module-owned holdings and available cash — excludes client equity"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            compact
            label="US Holding Value (SGD)"
            value={formatSgd(metrics.usStocksEtfSgd)}
            icon={<Globe size={16} />}
          />
          <SummaryCard
            compact
            label="SG Holding Value (SGD)"
            value={formatSgd(metrics.sgStocksSgd)}
            icon={<Globe size={16} />}
          />
          <SummaryCard
            compact
            label="Crypto Holding Value (SGD)"
            value={formatSgd(metrics.cryptoHoldingsValueSgd)}
            icon={<Bitcoin size={16} />}
          />
          <SummaryCard
            compact
            label="Total Cash"
            value={formatSgd(metrics.totalCashSgd)}
            subValue={`US ${formatSgd(metrics.usdTradingCashSgd)} · SG ${formatSgd(metrics.sgdTradingCashSgd)} · Crypto ${formatSgd(metrics.cryptoCashSgd)}`}
            icon={<Banknote size={16} />}
          />
        </div>
        <AssetAllocationChart
          data={allocation}
          total={assetAllocationTotal}
        />
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Charts"
          description="Daily worth and contribution history"
        />
        <DailyPortfolioChart snapshots={snapshots} />
        <MonthlyContributionChart
          contributions={contributions}
          fxRate={settings.usdSgdFxRate!}
          totalContribution={metrics.totalContribution}
        />
      </section>

      <section>
        <SectionHeader
          title="Goal Progress"
          description="Track progress toward your portfolio targets"
        />
        <GoalProgressCards goals={goalProgress} />
      </section>
    </div>
  );
}
