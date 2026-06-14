"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { AssetAllocationItem } from "@/core/domain/types";
import { formatSgd } from "@/shared/lib/format";
import { Card } from "@/shared/components/ui/Card";

interface AssetAllocationChartProps {
  data: AssetAllocationItem[];
  total: number;
}

export function AssetAllocationChart({ data, total }: AssetAllocationChartProps) {
  const chartData = data.filter((d) => d.value > 0);

  return (
    <Card
      title="Asset Allocation"
      subtitle="Module-owned holdings and available cash — Stock + Crypto"
    >
      {chartData.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface/40">
          <p className="text-sm text-slate-500">No assets to display.</p>
        </div>
      ) : (
        <div className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="transparent" />
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
                  <span className="text-xs text-slate-400 sm:text-sm">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {data.map((item) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div
              key={item.name}
              className="rounded-xl border border-surface-border/60 bg-surface/50 p-3"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-400">{item.name}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatSgd(item.value)}
              </p>
              <p className="text-xs text-slate-500">{pct.toFixed(1)}%</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
