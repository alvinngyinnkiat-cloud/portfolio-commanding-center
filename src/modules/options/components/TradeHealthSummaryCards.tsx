"use client";

import type {
  OpenTradeHealthCategory,
  OpenTradeHealthSummary,
} from "@/core/domain/types/options";

function HealthSummaryCard({
  title,
  count,
  subValue,
  valueClassName,
  active,
  onClick,
}: {
  title: string;
  count: number;
  subValue: string;
  valueClassName: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 w-full rounded-2xl border p-4 text-left transition-all ${
        active
          ? "border-accent/50 bg-surface-card shadow-md shadow-accent/10"
          : "border-surface-border/80 bg-surface-card/90 shadow-md shadow-black/15 hover:border-surface-border"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className={`mt-3 text-2xl font-bold tracking-tight ${valueClassName}`}>
        {count}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{subValue}</p>
    </button>
  );
}

export function TradeHealthSummaryCards({
  summary,
  activeFilter,
  onFilterChange,
}: {
  summary: OpenTradeHealthSummary;
  activeFilter: OpenTradeHealthCategory | null;
  onFilterChange: (category: OpenTradeHealthCategory | null) => void;
}) {
  const toggle = (category: OpenTradeHealthCategory) => {
    onFilterChange(activeFilter === category ? null : category);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <HealthSummaryCard
        title="Threatened"
        count={summary.threatenedCount}
        subValue="DTE 7 or Less"
        valueClassName="text-accent-red"
        active={activeFilter === "threatened"}
        onClick={() => toggle("threatened")}
      />
      <HealthSummaryCard
        title="Review"
        count={summary.reviewCount}
        subValue="8–14 DTE + BE ≤ -2.5%"
        valueClassName="text-amber-300"
        active={activeFilter === "review"}
        onClick={() => toggle("review")}
      />
      <HealthSummaryCard
        title="Healthy"
        count={summary.healthyCount}
        subValue="No Action Needed"
        valueClassName="text-accent-green"
        active={activeFilter === "healthy"}
        onClick={() => toggle("healthy")}
      />
    </div>
  );
}
