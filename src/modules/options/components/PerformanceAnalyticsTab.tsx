"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  OptionsMonthlyPerformanceRow,
  OptionsPerformanceScopeDetail,
  OptionsStrategyBreakdownRow,
} from "@/core/domain/types/options";
import {
  buildMonthlyPerformance,
  buildPerformanceScopeDetail,
  buildStrategyBreakdown,
  type PerformanceScope,
} from "@/core/calculations/options";
import { formatUsd, formatPercent } from "@/shared/lib/format";
import {
  formatSignedPercent,
  plColorClass,
  profitFactorColorClass,
} from "./options-utils";
import { usePortfolio } from "@/context/PortfolioContext";

type MonthlyTab = "total" | "personal" | "client";

const MONTHLY_TAB_SCOPE: Record<MonthlyTab, PerformanceScope> = {
  total: "total",
  personal: "personal",
  client: "client",
};

function PerformanceStats({
  title,
  detail,
  returnLabel = "Return %",
}: {
  title: string;
  detail: OptionsPerformanceScopeDetail;
  returnLabel?: string;
}) {
  const items = [
    { label: "Total Trades", value: String(detail.closedCount) },
    { label: "Winning Trades", value: String(detail.winCount) },
    { label: "Losing Trades", value: String(detail.lossCount) },
    { label: "Win Rate %", value: formatPercent(detail.winRatePercent, 1) },
    { label: "Average Win", value: formatUsd(detail.avgWinUsd) },
    { label: "Average Loss", value: formatUsd(detail.avgLossUsd) },
    {
      label: "Total Realized P/L",
      value: formatUsd(detail.totalRealizedPlUsd),
      className: plColorClass(detail.totalRealizedPlUsd),
    },
    { label: "Average Days Held", value: detail.avgDaysHeld.toFixed(1) },
    {
      label: returnLabel,
      value: formatSignedPercent(detail.returnPercent, 1),
      className: plColorClass(detail.returnPercent),
      sub: "Realized P/L ÷ max risk",
    },
    {
      label: "Profit Factor",
      value: detail.profitFactorLabel,
      className: profitFactorColorClass(
        detail.profitFactorKind,
        detail.profitFactorValue
      ),
      sub: "Gross Profit ÷ Gross Loss",
    },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-surface-border/60 bg-surface-card p-4"
          >
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className={`mt-1 text-lg font-semibold ${item.className ?? "text-white"}`}>
              {item.value}
            </p>
            {item.sub && <p className="mt-1 text-xs text-slate-500">{item.sub}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function StrategyBreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: OptionsStrategyBreakdownRow[];
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
      <div className="overflow-x-auto rounded-2xl border border-surface-border/80">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface/60 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Strategy</th>
              <th className="px-4 py-3">Trades</th>
              <th className="px-4 py-3">Win Rate</th>
              <th className="px-4 py-3">Avg Win</th>
              <th className="px-4 py-3">Avg Loss</th>
              <th className="px-4 py-3">Total Realized P/L</th>
              <th className="px-4 py-3">Return %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/60 text-slate-300">
            {rows.map((row) => (
              <tr key={row.strategy}>
                <td className="px-4 py-3">{row.strategyDisplay}</td>
                <td className="px-4 py-3">{row.closedCount}</td>
                <td className="px-4 py-3">{formatPercent(row.winRatePercent, 1)}</td>
                <td className="px-4 py-3">{formatUsd(row.avgWinUsd)}</td>
                <td className="px-4 py-3">{formatUsd(row.avgLossUsd)}</td>
                <td
                  className={`px-4 py-3 ${plColorClass(row.totalRealizedPlUsd, row.closedCount === 0)}`}
                >
                  {row.closedCount > 0 ? formatUsd(row.totalRealizedPlUsd) : "—"}
                </td>
                <td
                  className={`px-4 py-3 ${plColorClass(row.returnPercent, row.closedCount === 0)}`}
                >
                  {row.closedCount > 0
                    ? formatSignedPercent(row.returnPercent, 1)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MonthlyPerformancePanel({
  rows,
  activeTab,
}: {
  rows: OptionsMonthlyPerformanceRow[];
  activeTab: MonthlyTab;
}) {
  const chartData = rows.map((row) => ({
    label: row.label,
    value: row.realizedPlUsd,
  }));

  const tabLabel =
    activeTab === "total"
      ? "Total"
      : activeTab === "personal"
        ? "Personal"
        : "Client";

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-surface-border/60 bg-surface-card px-4 py-6 text-center text-sm text-slate-500">
        No monthly closed-trade data for {tabLabel.toLowerCase()} performance.
      </p>
    );
  }

  if (rows.length < 3) {
    return (
      <div className="overflow-x-auto rounded-2xl border border-surface-border/80">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface/60 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Realized P/L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/60 text-slate-300">
            {rows.map((row) => (
              <tr key={row.monthKey}>
                <td className="px-4 py-3">{row.label}</td>
                <td className={`px-4 py-3 ${plColorClass(row.realizedPlUsd)}`}>
                  {formatUsd(row.realizedPlUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="h-64 rounded-2xl border border-surface-border/80 bg-surface-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 8,
            }}
          />
          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PerformanceAnalyticsTab() {
  const { optionsData } = usePortfolio();
  const [year, setYear] = useState<string>("all");
  const [monthlyTab, setMonthlyTab] = useState<MonthlyTab>("total");

  const yearFilter = year === "all" ? undefined : Number(year);
  const filter = useMemo(() => ({ year: yearFilter }), [yearFilter]);

  const totalPerformance = useMemo(() => {
    if (!optionsData) return null;
    return buildPerformanceScopeDetail(optionsData.trades, "total", filter);
  }, [optionsData, filter]);

  const personalPerformance = useMemo(() => {
    if (!optionsData) return null;
    return buildPerformanceScopeDetail(optionsData.trades, "personal", filter);
  }, [optionsData, filter]);

  const clientPerformance = useMemo(() => {
    if (!optionsData) return null;
    return buildPerformanceScopeDetail(optionsData.trades, "client", filter);
  }, [optionsData, filter]);

  const totalStrategy = useMemo(() => {
    if (!optionsData) return null;
    return buildStrategyBreakdown(optionsData.trades, "total", filter);
  }, [optionsData, filter]);

  const personalStrategy = useMemo(() => {
    if (!optionsData) return null;
    return buildStrategyBreakdown(optionsData.trades, "personal", filter);
  }, [optionsData, filter]);

  const clientStrategy = useMemo(() => {
    if (!optionsData) return null;
    return buildStrategyBreakdown(optionsData.trades, "client", filter);
  }, [optionsData, filter]);

  const monthlyRows = useMemo(() => {
    if (!optionsData) return null;
    return buildMonthlyPerformance(
      optionsData.trades,
      MONTHLY_TAB_SCOPE[monthlyTab],
      filter
    );
  }, [optionsData, monthlyTab, filter]);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const row of optionsData?.closedRows ?? []) {
      const y = Number((row.trade.closeDate ?? "").slice(0, 4));
      if (Number.isFinite(y)) set.add(y);
    }
    return [...set].sort((a, b) => b - a);
  }, [optionsData?.closedRows]);

  if (
    !totalPerformance ||
    !personalPerformance ||
    !clientPerformance ||
    !totalStrategy ||
    !personalStrategy ||
    !clientStrategy ||
    !monthlyRows
  ) {
    return null;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-3">
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-slate-200"
        >
          <option value="all">All time</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <PerformanceStats title="Total Performance" detail={totalPerformance} />
      <StrategyBreakdownTable title="Strategy Breakdown — Total" rows={totalStrategy} />

      <PerformanceStats title="Personal Performance" detail={personalPerformance} />
      <StrategyBreakdownTable
        title="Strategy Breakdown — Personal"
        rows={personalStrategy}
      />

      <PerformanceStats
        title="Client Performance"
        detail={clientPerformance}
        returnLabel="Client Return %"
      />
      <p className="-mt-2 text-xs text-slate-500">
        Shared trades only · client leg (reporting)
      </p>
      <StrategyBreakdownTable title="Strategy Breakdown — Client" rows={clientStrategy} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Monthly Performance</h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["total", "Total"],
              ["personal", "Personal"],
              ["client", "Shared"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMonthlyTab(id)}
              className={`rounded-lg px-3 py-2 text-sm ${
                monthlyTab === id
                  ? "bg-accent text-white"
                  : "bg-surface-card text-slate-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <MonthlyPerformancePanel rows={monthlyRows} activeTab={monthlyTab} />
      </section>

      <p className="text-xs text-slate-500">
        Reporting only — does not affect US Available Cash, client equity, capacity,
        or open risk.
      </p>
    </div>
  );
}
