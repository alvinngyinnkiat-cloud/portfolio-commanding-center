"use client";

import { formatPercent, formatUsd } from "@/shared/lib/format";
import { capacityBadgeClass, capacityLabel } from "./options-utils";
import { usePortfolio } from "@/context/PortfolioContext";

export function RiskManagementTab() {
  const { optionsData } = usePortfolio();
  const risk = optionsData?.risk;
  if (!risk) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-surface-border/60 bg-surface/30 p-4 text-sm text-slate-300">
        <p>
          Open trades: <strong>{risk.openTradeCount}</strong> · Total risk:{" "}
          <strong>{formatUsd(risk.totalOpenRiskUsd)}</strong> · Avg/trade:{" "}
          {formatUsd(risk.avgRiskPerTradeUsd)}
        </p>
        <p className="mt-1">
          Largest: {risk.largestRiskUnderlying} {formatUsd(risk.largestRiskUsd)} · Capacity:{" "}
          {formatUsd(risk.remainingCapacityUsd)}{" "}
          <span
            className={`ml-2 rounded px-2 py-0.5 text-xs ${capacityBadgeClass(
              risk.capacityStatus
            )}`}
          >
            {capacityLabel(risk.capacityStatus)}
          </span>
        </p>
      </div>

      <SectionTable
        title="Open risk by trade"
        headers={["Underlying", "Strategy", "Max risk", "Your risk", "% pool"]}
        rows={(risk.byTrade ?? []).map((row) => [
          row.underlying,
          row.strategyDisplay,
          formatUsd(row.maxRiskUsd),
          formatUsd(row.userRiskUsd),
          formatPercent(row.percentOfPool, 1),
        ])}
      />

      <SectionTable
        title="Open risk by strategy"
        headers={["Strategy", "Open", "Total risk", "Avg risk", "% pool"]}
        rows={(risk.byStrategy ?? []).map((row) => [
          row.strategyDisplay,
          String(row.openCount),
          formatUsd(row.totalRiskUsd),
          formatUsd(row.avgRiskUsd),
          formatPercent(row.percentOfPool, 1),
        ])}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-surface-border/60 p-4 text-sm text-slate-400">
          <p>Personal risk: {formatUsd(risk.personalRiskUsd)}</p>
          <p>Shared risk: {formatUsd(risk.sharedRiskUsd)}</p>
          <p>Your risk leg: {formatUsd(risk.userRiskLegUsd)}</p>
          <p>Client risk leg: {formatUsd(risk.clientRiskLegUsd)}</p>
        </div>
        <div className="rounded-xl border border-surface-border/60 p-4 text-sm text-slate-400">
          <p>Expiring ≤7d risk: {formatUsd(risk.expiring7DayRiskUsd)}</p>
          <p>Expiring ≤30d risk: {formatUsd(risk.expiring30DayRiskUsd)}</p>
        </div>
      </div>
    </div>
  );
}

function SectionTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
      <div className="overflow-x-auto rounded-2xl border border-surface-border/80">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface/60 text-xs uppercase text-slate-500">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/60 text-slate-300">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-6 text-center text-slate-500">
                  No data
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
