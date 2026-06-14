import type { ReactNode } from "react";

interface SummaryCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
  highlight?: boolean;
  compact?: boolean;
}

export function SummaryCard({
  label,
  value,
  subValue,
  trend = "neutral",
  icon,
  highlight = false,
  compact = false,
}: SummaryCardProps) {
  const trendColor =
    trend === "positive"
      ? "text-accent-green"
      : trend === "negative"
        ? "text-accent-red"
        : "text-white";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all ${
        highlight
          ? "border-accent/40 bg-gradient-to-br from-accent/15 via-surface-card to-surface-card shadow-lg shadow-accent/10"
          : "border-surface-border/80 bg-surface-card/90 shadow-md shadow-black/15 hover:border-surface-border"
      } ${compact ? "p-4" : "p-5 sm:p-6"}`}
    >
      {highlight && (
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/10 blur-2xl"
          aria-hidden
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm sm:normal-case sm:tracking-normal sm:text-slate-400">
          {label}
        </p>
        {icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              highlight ? "bg-accent/20 text-accent" : "bg-surface text-slate-400"
            }`}
          >
            {icon}
          </div>
        )}
      </div>
      <p
        className={`mt-3 font-bold tracking-tight ${trendColor} ${
          compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
        }`}
      >
        {value}
      </p>
      {subValue && (
        <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-500">
          {subValue}
        </p>
      )}
    </div>
  );
}
