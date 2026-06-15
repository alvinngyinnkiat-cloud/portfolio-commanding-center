"use client";

import { useState, useMemo } from "react";
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
import type { ContributionTransaction } from "@/core/domain/types";
import {
  calculateMonthlyCashContributions,
  calculateYtdContribution,
} from "@/core/calculations";
import { formatSgd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { parseLocalDate } from "@/shared/lib/date";
import { Card } from "@/shared/components/ui/Card";
import { Select } from "@/shared/components/ui/Select";

interface MonthlyContributionChartProps {
  contributions: ContributionTransaction[];
  fxRate: number;
  totalContribution: number;
}

export function MonthlyContributionChart({
  contributions,
  fxRate,
  totalContribution,
}: MonthlyContributionChartProps) {
  const safeContributions = contributions ?? [];
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const set = new Set<number>();
    safeContributions.forEach((c) =>
      set.add(parseLocalDate(c.date).getFullYear())
    );
    if (set.size === 0) set.add(currentYear);
    return Array.from(set).sort();
  }, [safeContributions, currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(
    years[years.length - 1] ?? currentYear
  );
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const ytdContribution = calculateYtdContribution(safeContributions, selectedYear);

  const monthlyData = useMemo(() => {
    const monthNum =
      selectedMonth === "all" ? undefined : parseInt(selectedMonth, 10);
    return calculateMonthlyCashContributions(
      safeContributions,
      fxRate,
      selectedYear,
      monthNum
    ).map((d) => ({
      ...d,
      label: d.month,
    }));
  }, [safeContributions, fxRate, selectedYear, selectedMonth]);

  const monthOptions = [
    { value: "all", label: "All Months" },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1),
      label: new Date(2000, i).toLocaleString("en", { month: "long" }),
    })),
  ];

  return (
    <Card
      title="Monthly Contribution"
      subtitle="Cash impact by account (SGD amounts)"
    >
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-surface-border/60 bg-surface/50 p-3">
          <p className="text-xs font-medium text-slate-500">Total Contribution</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {formatSgd(totalContribution)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Stock + Crypto (Module adapters)</p>
        </div>
        <div className="rounded-xl border border-surface-border/60 bg-surface/50 p-3">
          <p className="text-xs font-medium text-slate-500">YTD Contribution</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {formatSgd(ytdContribution)}
          </p>
        </div>
        <div className="rounded-xl border border-surface-border/60 bg-surface/50 p-3">
          <p className="text-xs font-medium text-slate-500">Transactions</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {safeContributions.length}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          label="Year"
          value={String(selectedYear)}
          onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          options={years.map((y) => ({ value: String(y), label: String(y) }))}
        />
        <Select
          label="Month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          options={monthOptions}
        />
      </div>

      {monthlyData.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface/40">
          <p className="text-sm text-slate-500">
            No contribution data for this period.
          </p>
        </div>
      ) : (
        <div className="h-56 w-full min-w-0 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                stroke="#334155"
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                stroke="#334155"
                tickFormatter={(v) =>
                  `S$${(coerceNumber(v) / 1000).toFixed(0)}k`
                }
              />
              <Tooltip
                formatter={(value: number) => formatSgd(value)}
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                  color: "#fff",
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-slate-400">{value}</span>
                )}
              />
              <Bar
                dataKey="usdTradingCashSgd"
                name="USD Trading Cash"
                stackId="cash"
                fill="#3b82f6"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="sgdTradingCashSgd"
                name="SGD Trading Cash"
                stackId="cash"
                fill="#8b5cf6"
              />
              <Bar
                dataKey="cryptoCashSgd"
                name="Crypto Cash"
                stackId="cash"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
