import type { ReactNode } from "react";

interface SummaryCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
}

export function SummaryCard({
  label,
  value,
  subValue,
  trend = "neutral",
  icon,
}: SummaryCardProps) {
  const trendColor =
    trend === "positive"
      ? "text-accent-green"
      : trend === "negative"
        ? "text-accent-red"
        : "text-white";

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-400">{label}</p>
        {icon}
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${trendColor}`}>
        {value}
      </p>
      {subValue && (
        <p className="mt-1 text-xs text-slate-500">{subValue}</p>
      )}
    </div>
  );
}
