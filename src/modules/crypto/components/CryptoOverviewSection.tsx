"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { formatPercent, formatSgd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { Wallet, Coins, PiggyBank, TrendingUp, Receipt } from "lucide-react";

function plTrend(value: number): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function CryptoOverviewSection() {
  const { cryptoData } = usePortfolio();
  const summary = cryptoData?.summary;
  const rows = cryptoData?.rows ?? [];

  if (!summary) return null;

  const topHoldings = rows.slice(0, 5);

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Crypto Value"
          value={formatSgd(summary.totalValueSgd)}
          highlight
          icon={<Wallet size={18} />}
          subValue={`Holdings ${formatSgd(summary.cryptoHoldingsValueSgd)} + Cash ${formatSgd(summary.availableTradingCashSgd)}`}
        />
        <SummaryCard
          label="Crypto P/L"
          value={formatSgd(summary.cryptoProfitLossSgd)}
          trend={plTrend(summary.cryptoProfitLossSgd)}
          icon={<TrendingUp size={18} />}
          subValue={formatPercent(summary.cryptoProfitLossPercent)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Crypto Contribution"
          value={formatSgd(summary.cryptoContributionSgd)}
          icon={<Coins size={18} />}
          subValue="Deposits − withdrawals · personal capital injected"
        />
        <SummaryCard
          label="Available Trading Cash"
          value={formatSgd(summary.availableTradingCashSgd)}
          icon={<PiggyBank size={18} />}
          trend={
            coerceNumber(summary.availableTradingCashSgd) >= 0
              ? "neutral"
              : "negative"
          }
          subValue={`Contribution ${formatSgd(summary.cryptoContributionSgd)} − buy/sell totals ${formatSgd(summary.cryptoContributionSgd - summary.availableTradingCashSgd)}`}
        />
        <SummaryCard
          label="Total Fees Paid"
          value={formatSgd(summary.totalFeesPaidSgd)}
          icon={<Receipt size={18} />}
          subValue={`This month ${formatSgd(summary.feesThisMonthSgd)} · This year ${formatSgd(summary.feesThisYearSgd)}`}
        />
      </div>

      <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-4">
        <h4 className="text-sm font-semibold text-white">Holdings Summary</h4>
        <p className="mt-1 text-xs text-slate-500">
          {summary.holdingCount} holding{summary.holdingCount === 1 ? "" : "s"} ·{" "}
          {formatSgd(summary.cryptoHoldingsValueSgd)} total value
        </p>
        {topHoldings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No holdings yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {topHoldings.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate text-slate-300">
                  #{row.rank} {row.assetName}
                </span>
                <span className="shrink-0 font-medium text-white">
                  {formatSgd(row.currentValueSgd)}
                </span>
                <span className="shrink-0 text-slate-500">
                  {formatPercent(row.portfolioPercent)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
