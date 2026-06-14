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
import type { DailySnapshot, SnapshotChartSeries } from "@/core/domain/types";
import {
  filterSnapshotsByDays,
  filterSnapshotsByMonths,
  calculateSnapshotStats,
  fallbackRecentSnapshots,
  getSnapshotChartValue,
  SNAPSHOT_CHART_SERIES,
} from "@/core/calculations";
import { formatSgd, formatDate } from "@/shared/lib/format";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

type FilterPeriod = "7d" | "1m" | "1y";

interface DailyPortfolioChartProps {
  snapshots: DailySnapshot[];
}

const PERIODS: { key: FilterPeriod; label: string }[] = [
  { key: "7d", label: "7 Days" },
  { key: "1m", label: "1 Month" },
  { key: "1y", label: "1 Year" },
];

export function DailyPortfolioChart({ snapshots }: DailyPortfolioChartProps) {
  const [period, setPeriod] = useState<FilterPeriod>("7d");
  const [series, setSeries] = useState<SnapshotChartSeries>("ownPortfolio");

  const seriesMeta =
    SNAPSHOT_CHART_SERIES.find((s) => s.key === series) ??
    SNAPSHOT_CHART_SERIES[0];

  const filtered = useMemo(() => {
    let result: DailySnapshot[];
    switch (period) {
      case "7d":
        result = filterSnapshotsByDays(snapshots, 7);
        if (result.length === 0 && snapshots.length > 0) {
          result = fallbackRecentSnapshots(snapshots, 7);
        }
        break;
      case "1m":
        result = filterSnapshotsByMonths(snapshots, 1);
        if (result.length === 0 && snapshots.length > 0) {
          result = fallbackRecentSnapshots(snapshots, 30);
        }
        break;
      case "1y":
        result = filterSnapshotsByMonths(snapshots, 12);
        if (result.length === 0 && snapshots.length > 0) {
          result = fallbackRecentSnapshots(snapshots, snapshots.length);
        }
        break;
      default:
        result = [];
    }
    return result;
  }, [snapshots, period]);

  const stats = useMemo(
    () => calculateSnapshotStats(filtered, series),
    [filtered, series]
  );

  const chartData = useMemo(
    () =>
      filtered.map((s) => ({
        date: s.date,
        label: formatDate(s.date),
        value: getSnapshotChartValue(s, series),
      })),
    [filtered, series]
  );

  return (
    <Card
      title="Daily Portfolio Worth"
      subtitle={`${seriesMeta.label} over time (SGD)`}
    >
      <div className="mb-4 space-y-3">
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Time range"
        >
          {PERIODS.map((p) => (
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
        <div
          className="flex flex-wrap items-center gap-1 border-t border-surface-border/50 pt-3"
          role="group"
          aria-label="Asset series"
        >
          {SNAPSHOT_CHART_SERIES.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={series === s.key ? "primary" : "ghost"}
              onClick={() => setSeries(s.key)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface/40">
          <p className="text-sm text-slate-500">
            No snapshot data. Capture one in Settings → Snapshots.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-surface-border/60 bg-surface/50 p-3">
              <p className="text-xs font-medium text-slate-500">Highest</p>
              <p className="mt-1 text-sm font-semibold text-accent-green">
                {formatSgd(stats.highest)}
              </p>
            </div>
            <div className="rounded-xl border border-surface-border/60 bg-surface/50 p-3">
              <p className="text-xs font-medium text-slate-500">Lowest</p>
              <p className="mt-1 text-sm font-semibold text-accent-red">
                {formatSgd(stats.lowest)}
              </p>
            </div>
            <div className="rounded-xl border border-surface-border/60 bg-surface/50 p-3">
              <p className="text-xs font-medium text-slate-500">Average</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatSgd(stats.average)}
              </p>
            </div>
          </div>
          <div className="h-56 sm:h-64">
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
                  dataKey="value"
                  name={seriesMeta.label}
                  stroke={seriesMeta.color}
                  strokeWidth={2}
                  dot={{ fill: seriesMeta.color, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}
