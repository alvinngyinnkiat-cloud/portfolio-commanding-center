"use client";

import { useMemo, type ReactNode } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { CryptoHoldingRow } from "@/core/domain/types";
import { formatPercent, formatSgd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { Wallet, Coins, PiggyBank, TrendingUp, Receipt } from "lucide-react";

function plTrend(value: number): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function plColorClass(value: number | null | undefined): string {
  const n = coerceNumber(value);
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-accent-red";
  return "text-slate-300";
}

function openHoldings(rows: CryptoHoldingRow[]): CryptoHoldingRow[] {
  return rows.filter((row) => coerceNumber(row.currentValueSgd) > 0);
}

function rankByProfitLoss(
  rows: CryptoHoldingRow[],
  direction: "desc" | "asc",
  limit: number
): CryptoHoldingRow[] {
  const sorted = [...rows].sort((a, b) =>
    direction === "desc"
      ? b.profitLossSgd - a.profitLossSgd
      : a.profitLossSgd - b.profitLossSgd
  );
  return sorted.slice(0, limit).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

function OverviewPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-4">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      {subtitle ? (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      ) : null}
      {children}
    </div>
  );
}

function ValueHoldingsList({ rows }: { rows: CryptoHoldingRow[] }) {
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">No holdings yet.</p>;
  }

  return (
    <ul className="mt-4 space-y-2">
      {rows.map((row) => (
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
  );
}

function ProfitLossHoldingsTable({ rows }: { rows: CryptoHoldingRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[280px] text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th className="pb-2 pr-3 font-medium">Rank</th>
            <th className="pb-2 pr-3 font-medium">Asset</th>
            <th className="pb-2 pr-3 text-right font-medium">P/L SGD</th>
            <th className="pb-2 text-right font-medium">P/L %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-surface-border/40">
              <td className="py-2 pr-3 text-slate-400">#{row.rank}</td>
              <td className="py-2 pr-3 text-slate-300">{row.assetName}</td>
              <td
                className={`py-2 pr-3 text-right font-medium ${plColorClass(row.profitLossSgd)}`}
              >
                {formatSgd(row.profitLossSgd)}
              </td>
              <td
                className={`py-2 text-right ${plColorClass(row.profitLossPercent)}`}
              >
                {formatPercent(row.profitLossPercent)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CryptoOverviewSection() {
  const { cryptoData } = usePortfolio();
  const summary = cryptoData?.summary;
  const rows = cryptoData?.rows ?? [];

  const topHoldingsByValue = useMemo(() => rows.slice(0, 5), [rows]);

  const openRows = useMemo(() => openHoldings(rows), [rows]);

  const topWinners = useMemo(
    () => rankByProfitLoss(openRows, "desc", 5),
    [openRows]
  );

  const topLosers = useMemo(
    () => rankByProfitLoss(openRows, "asc", 5),
    [openRows]
  );

  if (!summary) return null;

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <OverviewPanel
        title="Top Holdings By Value"
        subtitle={`${summary.holdingCount} holding${summary.holdingCount === 1 ? "" : "s"} · ${formatSgd(summary.cryptoHoldingsValueSgd)} total value`}
      >
        <ValueHoldingsList rows={topHoldingsByValue} />
      </OverviewPanel>

      <OverviewPanel
        title="Top 5 Winners"
        subtitle="Open holdings ranked by P/L (current value − cost basis)"
      >
        {topWinners.length > 0 ? (
          <ProfitLossHoldingsTable rows={topWinners} />
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            No open holdings with P/L yet.
          </p>
        )}
      </OverviewPanel>

      <OverviewPanel
        title="Top 5 Losers"
        subtitle="Open holdings ranked by lowest P/L (current value − cost basis)"
      >
        {topLosers.length > 0 ? (
          <ProfitLossHoldingsTable rows={topLosers} />
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            No open holdings with P/L yet.
          </p>
        )}
      </OverviewPanel>
    </div>
  );
}
