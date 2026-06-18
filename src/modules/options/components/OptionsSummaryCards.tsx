"use client";

import { formatSgd, formatUsd } from "@/shared/lib/format";
import { formatUsCashComparisonSubValue } from "@/shared/lib/us-cash-display";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import {
  capacityBadgeClass,
  capacityLabel,
  formatSignedPercent,
  plTrend,
} from "./options-utils";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  Wallet,
  Shield,
  TrendingUp,
  PiggyBank,
  Gauge,
  Users,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

export function OptionsSummaryCards() {
  const { optionsData } = usePortfolio();
  const summary = optionsData?.summary;
  if (!summary) return null;

  const hasNoTrades =
    coerceNumber(summary.openTradeCount) === 0 &&
    coerceNumber(summary.closedTradeCount) === 0;

  return (
    <div className="space-y-4">
      {hasNoTrades && (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface/40 px-6 py-5 text-center">
          <p className="text-sm text-slate-300">No open trades. No closed trades.</p>
          <p className="mt-2 text-xs text-slate-500">
            Add your first options trade.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Trades Requiring Action"
          value={String(coerceNumber(summary.tradesRequiringActionCount))}
          subValue="DTE ≤ 7 · review and normally close"
          trend={
            summary.tradesRequiringActionCount > 0 ? "negative" : "neutral"
          }
          icon={<AlertTriangle size={18} />}
        />
        <SummaryCard
          label="Open Risk Requiring Action"
          value={formatUsd(summary.openRiskRequiringActionUsd)}
          subValue="Sum of max risk where DTE ≤ 7"
          trend={
            summary.openRiskRequiringActionUsd > 0 ? "negative" : "neutral"
          }
          icon={<Shield size={18} />}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="US Available Cash"
          value={formatUsd(summary.usAvailableCashUsd)}
          subValue={[
            optionsData.fxRateValid
              ? `≈ ${formatSgd(summary.usAvailableCashSgd)}`
              : "FX required for SGD",
            formatUsCashComparisonSubValue(summary),
          ]
            .filter(Boolean)
            .join("\n")}
          icon={<Wallet size={18} />}
        />
        <SummaryCard
          label="Total Open Risk"
          value={formatUsd(summary.totalOpenRiskUsd)}
          subValue={`${summary.openTradeCount} open`}
          icon={<Shield size={18} />}
        />
        <SummaryCard
          label="Net Options Market Value"
          value={
            summary.netOptionsMarketValueUsd != null
              ? formatUsd(summary.netOptionsMarketValueUsd)
              : "—"
          }
          subValue="Broker Style Valuation"
          trend={
            summary.netOptionsMarketValueUsd != null
              ? plTrend(summary.netOptionsMarketValueUsd)
              : "neutral"
          }
          icon={<BarChart3 size={18} />}
        />
        <SummaryCard
          label="Total Unrealized P/L"
          value={
            summary.totalUnrealizedPlUsd != null
              ? formatUsd(summary.totalUnrealizedPlUsd)
              : "—"
          }
          subValue={`${summary.markedOpenCount}/${summary.openTradeCount} marked`}
          trend={
            summary.totalUnrealizedPlUsd != null
              ? plTrend(summary.totalUnrealizedPlUsd)
              : "neutral"
          }
          icon={<TrendingUp size={18} />}
        />
        <SummaryCard
          label="Total Realized P/L"
          value={formatUsd(summary.totalRealizedPlUsd)}
          subValue={`${summary.closedTradeCount} closed · all time`}
          trend={plTrend(summary.totalRealizedPlUsd)}
          icon={<PiggyBank size={18} />}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Self Unrealized P/L"
          value={
            summary.userUnrealizedPlUsd != null
              ? formatUsd(summary.userUnrealizedPlUsd)
              : "—"
          }
          subValue="Personal + shared leg"
          trend={
            summary.userUnrealizedPlUsd != null
              ? plTrend(summary.userUnrealizedPlUsd)
              : "neutral"
          }
          icon={<TrendingUp size={18} />}
        />
        <SummaryCard
          label="Client Unrealized P/L"
          value={
            summary.clientUnrealizedPlUsd != null
              ? formatUsd(summary.clientUnrealizedPlUsd)
              : "—"
          }
          subValue="Shared trades only"
          trend={
            summary.clientUnrealizedPlUsd != null
              ? plTrend(summary.clientUnrealizedPlUsd)
              : "neutral"
          }
          icon={<Users size={18} />}
        />
        <SummaryCard
          label="Self Realized P/L"
          value={formatUsd(summary.userRealizedPlUsd)}
          subValue="Personal + shared leg"
          trend={plTrend(summary.userRealizedPlUsd)}
          icon={<PiggyBank size={18} />}
        />
        <SummaryCard
          label="Client Realized P/L"
          value={formatUsd(summary.clientRealizedPlUsd)}
          subValue="Shared trades only"
          trend={plTrend(summary.clientRealizedPlUsd)}
          icon={<Users size={18} />}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Personal Return %"
          value={formatSignedPercent(summary.personalReturnPercent, 1)}
          subValue="Based on realized P/L ÷ max risk"
          trend={plTrend(summary.personalReturnPercent)}
        />
        <SummaryCard
          label="Shared Return %"
          value={formatSignedPercent(summary.sharedReturnPercent, 1)}
          subValue="Based on realized P/L ÷ max risk"
          trend={plTrend(summary.sharedReturnPercent)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Remaining Capacity"
          value={formatUsd(summary.remainingCapacityUsd)}
          subValue="US cash − open risk DTE ≤ 45"
          trend={plTrend(summary.remainingCapacityUsd)}
          icon={<Gauge size={18} />}
        />
        <div className="rounded-2xl border border-surface-border/80 bg-surface-card/90 p-5 sm:p-6">
          <p className="text-sm text-slate-400">Capacity Status</p>
          <span
            className={`mt-3 inline-block rounded-lg px-3 py-1.5 text-lg font-bold ${capacityBadgeClass(
              summary.capacityStatus
            )}`}
          >
            {capacityLabel(summary.capacityStatus)}
          </span>
        </div>
      </div>
    </div>
  );
}
