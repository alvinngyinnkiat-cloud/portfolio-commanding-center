"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PortfolioGrowthChartPoint } from "@/core/calculations/growth-reporting";
import { formatSgd, formatDate } from "@/shared/lib/format";
import { Card } from "@/shared/components/ui/Card";
import { ReportingSourceLabel } from "./ReportingSourceLabel";

const LINES = [
  { key: "ownPortfolio" as const, label: "Own Portfolio", color: "#0ea5e9" },
  {
    key: "totalPortfolio" as const,
    label: "Total Portfolio",
    color: "#8b5cf6",
  },
  {
    key: "totalContribution" as const,
    label: "Total Contribution",
    color: "#22c55e",
  },
  { key: "totalPL" as const, label: "Total P/L", color: "#f59e0b" },
];

interface PortfolioGrowthChartProps {
  data: PortfolioGrowthChartPoint[];
}

export function PortfolioGrowthChart({ data }: PortfolioGrowthChartProps) {
  const chartData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        label: formatDate(point.date),
      })),
    [data]
  );

  return (
    <section className="space-y-3">
      <ReportingSourceLabel source="Dashboard Snapshots" />
      <Card
        title="Portfolio Growth Chart"
        subtitle="Own Portfolio, Total Portfolio, Contribution, and P/L over time (SGD)"
      >
        <div className="h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="label"
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
              {LINES.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.label}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={{ fill: line.color, r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </section>
  );
}
