"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { usePortfolio } from "@/context/PortfolioContext";
import { buildStockMarketAllocation } from "@/core/calculations/stocks/allocation";
import { buildStockPortfolioSummary } from "@/core/calculations/stocks/summary";
import { formatPercent, formatSgd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { Card } from "@/shared/components/ui/Card";
import { FxRateErrorBanner } from "@/shared/components/ui/FxRateErrorBanner";

const US_COLOR = "#3b82f6";
const SG_COLOR = "#10b981";

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function LegBreakdown({
  title,
  leg,
  cashLabel,
}: {
  title: string;
  leg: {
    holdingsSgd: number;
    cashSgd: number;
    totalMarketValueSgd: number;
    actualPercent: number;
    targetPercent: number;
    differencePercent: number;
  };
  cashLabel: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-surface-border/60 bg-surface/40 p-4">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Holdings SGD</dt>
          <dd className="font-medium text-slate-200">{formatSgd(leg.holdingsSgd)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">{cashLabel}</dt>
          <dd className="font-medium text-slate-200">{formatSgd(leg.cashSgd)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-surface-border/40 pt-2">
          <dt className="font-medium text-slate-300">Total Market SGD</dt>
          <dd className="font-semibold text-white">
            {formatSgd(leg.totalMarketValueSgd)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Actual %</dt>
          <dd className="text-slate-200">{formatPercent(leg.actualPercent)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Target %</dt>
          <dd className="text-slate-200">{formatPercent(leg.targetPercent)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">Difference %</dt>
          <dd
            className={
              leg.differencePercent > 0
                ? "text-emerald-400"
                : leg.differencePercent < 0
                  ? "text-accent-red"
                  : "text-slate-200"
            }
          >
            {formatSignedPercent(leg.differencePercent)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function StockMarketAllocationSection() {
  const { stockData, data, optionsData } = usePortfolio();

  const allocation = useMemo(() => {
    if (!stockData || !data?.contributions) return null;

    const summary = buildStockPortfolioSummary(
      stockData.holdings,
      data.contributions,
      stockData.transactions,
      stockData.fxRate,
      optionsData?.trades ?? [],
      stockData.cashFlow.fxConversions
    );

    return buildStockMarketAllocation(summary);
  }, [stockData, data?.contributions, optionsData?.trades]);

  const chartData = useMemo(() => {
    if (!allocation || allocation.totalStockValueSgd <= 0) return [];
    return [
      {
        name: "US Market",
        value: allocation.us.totalMarketValueSgd,
        color: US_COLOR,
      },
      {
        name: "SG Market",
        value: allocation.sg.totalMarketValueSgd,
        color: SG_COLOR,
      },
    ].filter((item) => coerceNumber(item.value) > 0);
  }, [allocation]);

  if (!allocation) return null;

  const reminderClass =
    allocation.reminderStatus === "under"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
      : allocation.reminderStatus === "over"
        ? "border-sky-500/40 bg-sky-500/10 text-sky-100"
        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";

  return (
    <div className="min-w-0 space-y-4">
      {!allocation.fxRateValid && <FxRateErrorBanner />}

      <Card
        title="Stock Market Allocation"
        subtitle="Target: 75% US / 25% SG"
      >
        {chartData.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface/40">
            <p className="px-4 text-center text-sm text-slate-500">
              Add holdings or cash to see market allocation.
            </p>
          </div>
        ) : (
          <div className="h-56 w-full min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatSgd(value)}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  formatter={(value) => (
                    <span className="text-xs text-slate-400 sm:text-sm">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
          <LegBreakdown
            title="US Market"
            leg={allocation.us}
            cashLabel="USD Cash SGD"
          />
          <LegBreakdown
            title="SG Market"
            leg={allocation.sg}
            cashLabel="SGD Cash"
          />
        </div>
      </Card>

      <div className={`rounded-xl border px-4 py-3 text-sm ${reminderClass}`}>
        {allocation.reminderMessage}
      </div>

      <div className="min-w-0 rounded-xl border border-surface-border/60 bg-surface/40 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Rebalancing Recommendation
        </p>
        <p className="mt-2 text-sm text-slate-200">
          {allocation.rebalancing.message}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Recommendation only. Record actual broker FX conversions manually in
          Cash Flow.
        </p>
      </div>
    </div>
  );
}
