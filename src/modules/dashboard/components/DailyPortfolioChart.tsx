"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailySnapshot } from "@/core/domain/types";
import {
  filterSnapshotsByDays,
  filterSnapshotsByMonths,
  calculateSnapshotStats,
} from "@/core/calculations";
import { formatSgd, formatDate } from "@/shared/lib/format";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

type FilterPeriod = "7d" | "1m" | "1y";

interface DailyPortfolioChartProps {
  snapshots: DailySnapshot[];
}

export function DailyPortfolioChart({ snapshots }: DailyPortfolioChartProps) {
  const [period, setPeriod] = useState<FilterPeriod>("7d");

  const filtered = useMemo(() => {
    switch (period) {
      case "7d":
        return filterSnapshotsByDays(snapshots, 7);
      case "1m":
        return filterSnapshotsByMonths(snapshots, 1);
      case "1y":
        return filterSnapshotsByMonths(snapshots, 12);
    }
  }, [snapshots, period]);

  const stats = calculateSnapshotStats(filtered);

  const chartData = filtered.map((s) => ({
    date: s.date,
    label: formatDate(s.date),
    ownPortfolio: s.ownPortfolio,
    totalPortfolio: s.totalPortfolio,
  }));

  const periods: { key: FilterPeriod; label: string }[] = [
    { key: "7d", label: "7 Days" },
    { key: "1m", label: "1 Month" },
    { key: "1y", label: "1 Year" },
  ];

  return (
    <Card
      title="Daily Portfolio Worth"
      subtitle="Own Portfolio value over time"
      action={
        <div className="flex gap-1">
          {periods.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={period === p.key ? "primary" : "ghost"}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      }
    >
      {chartData.length === 0 ? (
        <p className="text-sm text-slate-500">
          No snapshot data. Capture a snapshot in Settings.
        </p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-surface p-3">
              <p className="text-xs text-slate-500">Highest</p>
              <p className="text-sm font-semibold text-accent-green">
                {formatSgd(stats.highest)}
              </p>
            </div>
            <div className="rounded-lg bg-surface p-3">
              <p className="text-xs text-slate-500">Lowest</p>
              <p className="text-sm font-semibold text-accent-red">
                {formatSgd(stats.lowest)}
              </p>
            </div>
            <div className="rounded-lg bg-surface p-3">
              <p className="text-xs text-slate-500">Average</p>
              <p className="text-sm font-semibold text-white">
                {formatSgd(stats.average)}
              </p>
            </div>
          </div>
          <div className="h-64">
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
                <Line
                  type="monotone"
                  dataKey="ownPortfolio"
                  name="Own Portfolio"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}
