"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { GrowthAttributionData } from "@/core/calculations/growth-reporting";
import {
  buildGrowthAttributionChartSlices,
  attributionChartTotal,
} from "@/core/calculations/growth-reporting";
import { formatSgd, formatPercent } from "@/shared/lib/format";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { Card } from "@/shared/components/ui/Card";
import { ReportingSourceLabel } from "./ReportingSourceLabel";
import { Wallet, PiggyBank, TrendingUp, TrendingDown } from "lucide-react";

interface GrowthAttributionSectionProps {
  attribution: GrowthAttributionData;
}

export function GrowthAttributionSection({
  attribution,
}: GrowthAttributionSectionProps) {
  const chartSlices = buildGrowthAttributionChartSlices(attribution).filter(
    (slice) => slice.value > 0
  );
  const chartTotal = attributionChartTotal(attribution);
  const gainTrend =
    attribution.investmentGain >= 0 ? "positive" : "negative";

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Growth Attribution"
        description="Portfolio composition — contributions vs investment performance"
      />
      <ReportingSourceLabel source="Dashboard Metrics" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard
            compact
            label="Current Own Portfolio"
            value={formatSgd(attribution.ownPortfolio)}
            icon={<Wallet size={16} />}
            highlight
          />
          <SummaryCard
            compact
            label="Total Contribution"
            value={formatSgd(attribution.totalContribution)}
            icon={<PiggyBank size={16} />}
          />
          <SummaryCard
            compact
            label={attribution.investmentLabel}
            value={formatSgd(attribution.investmentGain)}
            trend={gainTrend}
            icon={
              attribution.investmentGain >= 0 ? (
                <TrendingUp size={16} />
              ) : (
                <TrendingDown size={16} />
              )
            }
          />
          <SummaryCard
            compact
            label="Contribution %"
            value={formatPercent(attribution.contributionPercent)}
          />
          <SummaryCard
            compact
            label={attribution.investmentPercentLabel}
            value={formatPercent(attribution.investmentGainPercent)}
            trend={gainTrend}
          />
        </div>

        <Card
          title="Portfolio Composition"
          subtitle={`Contribution vs ${attribution.investmentLabel.toLowerCase()} · Total ${formatSgd(chartTotal)}`}
        >
          {chartSlices.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface/40">
              <p className="text-sm text-slate-500">No data to display.</p>
            </div>
          ) : (
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartSlices}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {chartSlices.map((slice) => (
                      <Cell
                        key={slice.name}
                        fill={slice.color}
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
                    formatter={(value) => (
                      <span className="text-xs text-slate-400">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {chartSlices.map((slice) => {
              const pct =
                chartTotal > 0 ? (slice.value / chartTotal) * 100 : 0;
              return (
                <div
                  key={slice.name}
                  className="rounded-xl border border-surface-border/60 bg-surface/50 p-3"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-xs text-slate-400">{slice.name}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {formatSgd(slice.value)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {attribution.investmentGain >= 0
                      ? formatPercent(pct)
                      : slice.name === "Contribution"
                        ? formatPercent(attribution.contributionPercent)
                        : formatPercent(Math.abs(attribution.investmentGainPercent))}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </section>
  );
}
