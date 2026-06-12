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
    <Card title="Asset Allocation" subtitle="Based on Own Portfolio (excludes Client Portfolio)">
      {chartData.length === 0 ? (
        <p className="text-sm text-slate-500">No assets to display.</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
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
                  <span className="text-sm text-slate-300">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.map((item) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.name} className="rounded-lg bg-surface p-3">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-400">{item.name}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-white">
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
