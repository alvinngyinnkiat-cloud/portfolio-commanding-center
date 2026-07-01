"use client";

import type { ScannerRankedEntry, ScannerTickerResult } from "@/core/domain/types/scanner";
import { formatUsd } from "@/shared/lib/format";
import { Card } from "@/shared/components/ui/Card";
import {
  buildEmaSummaryEntries,
  type EmaSummaryEntry,
} from "@/modules/scanner/lib/build-ema-summary-entries";

function formatPremium(value: number | null): string {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatEma20(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

interface StrategyGroupHeaderProps {
  badge: string;
  badgeClassName: string;
  title: string;
  subtitle: string;
}

function StrategyGroupHeader({
  badge,
  badgeClassName,
  title,
  subtitle,
}: StrategyGroupHeaderProps) {
  return (
    <div className="space-y-2">
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${badgeClassName}`}
      >
        {badge}
      </span>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

interface RankingTableProps {
  title: string;
  entries: ScannerRankedEntry[];
}

function RankingTable({ title, entries }: RankingTableProps) {
  return (
    <Card title={title} noPadding>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-surface-border/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Trade</th>
              <th className="px-4 py-3">Width</th>
              <th className="px-4 py-3">Premium</th>
              <th className="px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No eligible opportunities today.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.ticker}
                  className="border-b border-surface-border/40 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {entry.ticker}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">
                    {entry.trade}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {entry.width ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatPremium(entry.targetPremium)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {entry.maxRiskUsd != null
                      ? formatUsd(entry.maxRiskUsd)
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface EmaRankingTableProps {
  title: string;
  entries: EmaSummaryEntry[];
}

function EmaRankingTable({ title, entries }: EmaRankingTableProps) {
  return (
    <Card title={title} noPadding>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-surface-border/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">EMA20</th>
              <th className="px-4 py-3">Trade</th>
              <th className="px-4 py-3">Width</th>
              <th className="px-4 py-3">Premium</th>
              <th className="px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No eligible opportunities today.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.ticker}
                  className="border-b border-surface-border/40 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {entry.ticker}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatEma20(entry.ema20)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">
                    {entry.trade}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {entry.width ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatPremium(entry.targetPremium)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {entry.maxRiskUsd != null
                      ? formatUsd(entry.maxRiskUsd)
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface ScannerRankingDashboardProps {
  results: ScannerTickerResult[];
  bullPut: ScannerRankedEntry[];
  bearCall: ScannerRankedEntry[];
  ironCondor: ScannerRankedEntry[];
}

export function ScannerRankingDashboard({
  results,
  bullPut,
  bearCall,
  ironCondor,
}: ScannerRankingDashboardProps) {
  const emaSellPut = buildEmaSummaryEntries(results, "SELL PUT");
  const emaSellCall = buildEmaSummaryEntries(results, "SELL CALL");

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <StrategyGroupHeader
          badge="🟢 EARLY REVERSAL"
          badgeClassName="bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
          title="20 EMA EARLY REVERSAL"
          subtitle="Early reversal opportunities around the 20 EMA."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <EmaRankingTable
            title="Top 5 Sell Put Reversal Candidates"
            entries={emaSellPut}
          />
          <EmaRankingTable
            title="Top 5 Sell Call Reversal Candidates"
            entries={emaSellCall}
          />
        </div>
      </section>

      <section className="space-y-4">
        <StrategyGroupHeader
          badge="🔵 TREND FOLLOWING"
          badgeClassName="bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30"
          title="MAIN SYSTEM"
          subtitle="High-probability trend-following opportunities."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <RankingTable title="Top 5 Sell Put Candidates" entries={bullPut} />
          <RankingTable title="Top 5 Sell Call Candidates" entries={bearCall} />
        </div>
      </section>

      <section className="space-y-4">
        <StrategyGroupHeader
          badge="🟡 NEUTRAL MARKET"
          badgeClassName="bg-yellow-500/15 text-yellow-200 ring-1 ring-yellow-500/30"
          title="NEUTRAL MARKET"
          subtitle="Range-bound opportunities."
        />
        <RankingTable title="Top 5 Iron Condor Candidates" entries={ironCondor} />
      </section>
    </div>
  );
}
