"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { CryptoHoldingRow } from "@/core/domain/types";
import { formatPercent, formatSgd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { AlertTriangle, Wallet, Coins, PiggyBank, TrendingUp, Receipt } from "lucide-react";

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

type RankingRow = {
  id: string;
  rank: number;
  assetName: string;
  primaryValue: number;
  secondaryValue: number;
  colorize?: boolean;
};

function HoldingsRankingCard({
  title,
  subtitle,
  primaryLabel,
  secondaryLabel,
  rows,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  rows: RankingRow[];
  emptyMessage: string;
}) {
  return (
    <div className="flex min-h-[22rem] min-w-0 flex-col rounded-2xl border border-surface-border/80 bg-surface-card/90 p-5 shadow-md shadow-black/15 sm:min-h-[24rem] sm:p-6">
      <div className="border-b border-surface-border/40 pb-4">
        <h4 className="text-base font-semibold tracking-tight text-white">
          {title}
        </h4>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          {subtitle}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 flex flex-1 items-center justify-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-4 flex flex-1 flex-col">
          <div className="mb-2 grid grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_3.25rem] items-center gap-x-2 text-[10px] font-medium uppercase tracking-wide text-slate-600 sm:grid-cols-[2rem_minmax(0,1fr)_5rem_3.5rem] sm:gap-x-3">
            <span>#</span>
            <span>Asset</span>
            <span className="text-right">{primaryLabel}</span>
            <span className="text-right">{secondaryLabel}</span>
          </div>

          <ul className="divide-y divide-surface-border/30">
            {rows.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_3.25rem] items-center gap-x-2 py-3 sm:grid-cols-[2rem_minmax(0,1fr)_5rem_3.5rem] sm:gap-x-3"
              >
                <span className="text-xs font-medium text-slate-500">
                  {row.rank}
                </span>
                <span className="truncate text-sm font-medium text-slate-200">
                  {row.assetName}
                </span>
                <span
                  className={`text-right text-sm font-semibold tabular-nums ${
                    row.colorize
                      ? plColorClass(row.primaryValue)
                      : "text-white"
                  }`}
                >
                  {formatSgd(row.primaryValue)}
                </span>
                <span
                  className={`text-right text-xs tabular-nums ${
                    row.colorize
                      ? plColorClass(row.secondaryValue)
                      : "text-slate-400"
                  }`}
                >
                  {formatPercent(row.secondaryValue)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function toValueRows(rows: CryptoHoldingRow[]): RankingRow[] {
  return rows.map((row) => ({
    id: row.id,
    rank: row.rank,
    assetName: row.assetName,
    primaryValue: row.currentValueSgd,
    secondaryValue: row.portfolioPercent,
  }));
}

function toProfitLossRows(rows: CryptoHoldingRow[]): RankingRow[] {
  return rows.map((row) => ({
    id: row.id,
    rank: row.rank,
    assetName: row.assetName,
    primaryValue: row.profitLossSgd,
    secondaryValue: row.profitLossPercent,
    colorize: true,
  }));
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

  const cryptoCash = coerceNumber(summary.availableTradingCashSgd);
  const buySpendWithFees =
    summary.cryptoContributionSgd - summary.availableTradingCashSgd;

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Total Crypto Net Value"
          value={formatSgd(summary.totalValueSgd)}
          highlight
          icon={<Wallet size={18} />}
          subValue={`Total Holdings ${formatSgd(summary.cryptoHoldingsValueSgd)} + Crypto Cash ${formatSgd(cryptoCash)}`}
        />
        <SummaryCard
          label="Total Holdings"
          value={formatSgd(summary.cryptoHoldingsValueSgd)}
          icon={<Coins size={18} />}
          subValue={`${summary.holdingCount} holding${summary.holdingCount === 1 ? "" : "s"} · current value SGD`}
        />
        <SummaryCard
          label="Crypto Cash"
          value={formatSgd(cryptoCash)}
          icon={<PiggyBank size={18} />}
          trend={cryptoCash >= 0 ? "neutral" : "negative"}
          subValue={`Contribution ${formatSgd(summary.cryptoContributionSgd)} − buys & fees ${formatSgd(buySpendWithFees)}`}
        />
        <SummaryCard
          label="Profit & Loss"
          value={formatSgd(summary.cryptoProfitLossSgd)}
          trend={plTrend(summary.cryptoProfitLossSgd)}
          icon={<TrendingUp size={18} />}
          subValue={formatPercent(summary.cryptoProfitLossPercent)}
        />
        <SummaryCard
          label="Contribution"
          value={formatSgd(summary.cryptoContributionSgd)}
          icon={<Coins size={18} />}
          subValue="Deposits − withdrawals · net capital injected"
        />
        <SummaryCard
          label="Fees Paid"
          value={formatSgd(summary.totalFeesPaidSgd)}
          icon={<Receipt size={18} />}
          subValue={`This month ${formatSgd(summary.feesThisMonthSgd)} · This year ${formatSgd(summary.feesThisYearSgd)} · informational only`}
        />
      </div>

      {cryptoCash < 0 && (
        <div
          className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
          role="alert"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <p>
            Crypto Cash is negative. Check deposits, withdrawals, buys, or fees.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <HoldingsRankingCard
          title="Top Holdings By Value"
          subtitle={`${summary.holdingCount} holding${summary.holdingCount === 1 ? "" : "s"} · ${formatSgd(summary.cryptoHoldingsValueSgd)} total value`}
          primaryLabel="Value"
          secondaryLabel="Port. %"
          rows={toValueRows(topHoldingsByValue)}
          emptyMessage="No holdings yet."
        />
        <HoldingsRankingCard
          title="Top 5 Winners"
          subtitle="Open holdings ranked by P/L (current value − cost basis)"
          primaryLabel="P/L"
          secondaryLabel="P/L %"
          rows={toProfitLossRows(topWinners)}
          emptyMessage="No open holdings with P/L yet."
        />
        <HoldingsRankingCard
          title="Top 5 Losers"
          subtitle="Open holdings ranked by lowest P/L (current value − cost basis)"
          primaryLabel="P/L"
          secondaryLabel="P/L %"
          rows={toProfitLossRows(topLosers)}
          emptyMessage="No open holdings with P/L yet."
        />
      </div>
    </div>
  );
}
