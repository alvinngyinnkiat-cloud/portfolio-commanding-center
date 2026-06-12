"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ContributionTransaction } from "@/core/domain/types";
import {
  calculateTotalContribution,
  calculateMonthlyContributions,
  calculateYtdContribution,
} from "@/core/calculations";
import { formatSgd } from "@/shared/lib/format";
import { Card } from "@/shared/components/ui/Card";
import { Select } from "@/shared/components/ui/Select";

interface MonthlyContributionChartProps {
  contributions: ContributionTransaction[];
}

export function MonthlyContributionChart({
  contributions,
}: MonthlyContributionChartProps) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const set = new Set<number>();
    contributions.forEach((c) => set.add(new Date(c.date).getFullYear()));
    if (set.size === 0) set.add(currentYear);
    return Array.from(set).sort();
  }, [contributions, currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(
    years[years.length - 1] ?? currentYear
  );
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const totalContribution = calculateTotalContribution(contributions);
  const ytdContribution = calculateYtdContribution(contributions, selectedYear);

  const monthlyData = useMemo(() => {
    const monthNum =
      selectedMonth === "all" ? undefined : parseInt(selectedMonth, 10);
    return calculateMonthlyContributions(
      contributions,
      selectedYear,
      monthNum
    ).map((d) => ({
      ...d,
      label: d.month,
    }));
  }, [contributions, selectedYear, selectedMonth]);

  const monthOptions = [
    { value: "all", label: "All Months" },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1),
      label: new Date(2000, i).toLocaleString("en", { month: "long" }),
    })),
  ];

  return (
    <Card title="Monthly Contribution" subtitle="Deposit and withdrawal history">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-surface p-3">
          <p className="text-xs text-slate-500">Total Contribution</p>
          <p className="text-sm font-semibold text-white">
            {formatSgd(totalContribution)}
          </p>
        </div>
        <div className="rounded-lg bg-surface p-3">
          <p className="text-xs text-slate-500">YTD Contribution</p>
          <p className="text-sm font-semibold text-white">
            {formatSgd(ytdContribution)}
          </p>
        </div>
        <div className="rounded-lg bg-surface p-3">
          <p className="text-xs text-slate-500">Transactions</p>
          <p className="text-sm font-semibold text-white">
            {contributions.length}
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
        <p className="text-sm text-slate-500">No contribution data for this period.</p>
      ) : (
        <div className="h-64">
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
              <Bar
                dataKey="amount"
                name="Net Contribution"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
