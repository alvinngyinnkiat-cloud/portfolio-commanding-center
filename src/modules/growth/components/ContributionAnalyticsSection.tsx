"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ContributionAnalyticsData } from "@/core/calculations/growth-reporting";
import { formatSgd } from "@/shared/lib/format";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { Card } from "@/shared/components/ui/Card";
import { ReportingSourceLabel } from "./ReportingSourceLabel";
import { PiggyBank, TrendingUp, TrendingDown } from "lucide-react";

interface ContributionAnalyticsSectionProps {
  analytics: ContributionAnalyticsData;
}

export function ContributionAnalyticsSection({
  analytics,
}: ContributionAnalyticsSectionProps) {
  return (
    <section className="space-y-4">
      <SectionHeader
        title="Contribution Analytics"
        description="SGD contribution amounts from transaction history"
      />
      <ReportingSourceLabel source="Contribution Transactions" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          compact
          label="Total Contribution"
          value={formatSgd(analytics.totalContributionSgd)}
          icon={<PiggyBank size={16} />}
        />
        <SummaryCard
          compact
          label="Stock Contribution"
          value={formatSgd(analytics.stockContributionSgd)}
        />
        <SummaryCard
          compact
          label="Crypto Contribution"
          value={formatSgd(analytics.cryptoContributionSgd)}
        />
        <SummaryCard
          compact
          label="Average Monthly Contribution"
          value={
            analytics.averageMonthlyContributionSgd != null
              ? formatSgd(analytics.averageMonthlyContributionSgd)
              : "—"
          }
        />
        <SummaryCard
          compact
          label="Highest Contribution Month"
          value={
            analytics.highestMonth
              ? formatSgd(analytics.highestMonth.amountSgd)
              : "—"
          }
          subValue={analytics.highestMonth?.month}
          icon={<TrendingUp size={16} />}
        />
        <SummaryCard
          compact
          label="Lowest Contribution Month"
          value={
            analytics.lowestMonth
              ? formatSgd(analytics.lowestMonth.amountSgd)
              : "—"
          }
          subValue={analytics.lowestMonth?.month}
          icon={<TrendingDown size={16} />}
        />
      </div>
      <Card
        title="Monthly Contribution"
        subtitle="Stock and Crypto contributions by month (SGD)"
      >
        {analytics.monthlyBars.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface/40">
            <p className="text-sm text-slate-500">No contribution data.</p>
          </div>
        ) : (
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.monthlyBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  stroke="#334155"
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  stroke="#334155"
                  tickFormatter={(v) => `S$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatSgd(value)}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-slate-400">{value}</span>
                  )}
                />
                <Bar
                  dataKey="stockSgd"
                  name="Stock Contribution"
                  stackId="contrib"
                  fill="#3b82f6"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="cryptoSgd"
                  name="Crypto Contribution"
                  stackId="contrib"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </section>
  );
}
