"use client";

import { useMemo } from "react";
import type { OptionsOpenTradeRow } from "@/core/domain/types/options";
import {
  compareOpenTradesByDte,
  summarizeOpenTradesHeader,
  summarizeOpenTradesOwnership,
} from "@/core/calculations/options";
import { formatUsd } from "@/shared/lib/format";
import { Button } from "@/shared/components/ui/Button";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { plTrend } from "./options-utils";
import { usePortfolio } from "@/context/PortfolioContext";
import { OpenTradeDashboardCard } from "./OpenTradeDashboardCard";

function SectionSummaryStrip({
  items,
}: {
  items: Array<{
    label: string;
    value: string;
    subValue?: string;
    trend?: "positive" | "negative" | "neutral";
  }>;
}) {
  return (
    <div
      className={`grid gap-3 ${
        items.length >= 5
          ? "sm:grid-cols-2 lg:grid-cols-5"
          : "sm:grid-cols-2 lg:grid-cols-3"
      }`}
    >
      {items.map((item) => (
        <SummaryCard
          key={item.label}
          compact
          label={item.label}
          value={item.value}
          subValue={item.subValue}
          trend={item.trend}
        />
      ))}
    </div>
  );
}

function OpenTradesList({
  rows,
  emptyMessage,
  showSplit,
  onEdit,
  onClose,
  onDelete,
  onSaved,
}: {
  rows: OptionsOpenTradeRow[];
  emptyMessage: string;
  showSplit: boolean;
  onEdit: (row: OptionsOpenTradeRow) => void;
  onClose: (row: OptionsOpenTradeRow) => void;
  onDelete: (row: OptionsOpenTradeRow) => void;
  onSaved: () => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-surface-border/80 bg-surface-card/60 px-4 py-8 text-center text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <OpenTradeDashboardCard
          key={row.trade.id}
          row={row}
          showSplit={showSplit}
          onEdit={onEdit}
          onClose={onClose}
          onDelete={onDelete}
          onSaved={onSaved}
        />
      ))}
    </div>
  );
}

export function OpenTradesTab({
  onOpenNew,
  onEdit,
  onClose,
}: {
  onOpenNew: () => void;
  onEdit: (row: OptionsOpenTradeRow) => void;
  onClose: (row: OptionsOpenTradeRow) => void;
}) {
  const { optionsData, services, refresh } = usePortfolio();
  const rows = optionsData?.openRows ?? [];

  const personalRows = useMemo(
    () =>
      rows
        .filter((row) => row.trade.tradeType === "personal")
        .sort(compareOpenTradesByDte),
    [rows]
  );

  const sharedRows = useMemo(
    () =>
      rows
        .filter((row) => row.trade.tradeType === "shared")
        .sort(compareOpenTradesByDte),
    [rows]
  );

  const personalSummary = useMemo(
    () => summarizeOpenTradesHeader(personalRows),
    [personalRows]
  );

  const sharedSummary = useMemo(
    () => summarizeOpenTradesOwnership(sharedRows),
    [sharedRows]
  );

  const handleDelete = (row: OptionsOpenTradeRow) => {
    if (!window.confirm(`Delete open trade ${row.trade.underlying}?`)) return;
    const result = services.optionsTrades.deleteOpenTrade(row.trade.id);
    if (!result.ok) {
      window.alert(result.errors[0]?.message ?? "Delete failed");
      return;
    }
    refresh();
  };

  const formatUnrealized = (value: number | null) =>
    value != null ? formatUsd(value) : "—";

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={onOpenNew}>+ Open Trade</Button>
      </div>

      <section className="min-w-0 space-y-4">
        <h2 className="text-lg font-semibold text-white">Personal Open Trades</h2>
        <SectionSummaryStrip
          items={[
            {
              label: "Open Trades",
              value: String(personalSummary.openTradeCount),
              subValue: "Personal positions",
            },
            {
              label: "Open Risk",
              value: formatUsd(personalSummary.totalOpenRiskUsd),
            },
            {
              label: "Unrealized P/L",
              value: formatUnrealized(personalSummary.totalUnrealizedPlUsd),
              trend: plTrend(personalSummary.totalUnrealizedPlUsd),
            },
          ]}
        />
        <OpenTradesList
          rows={personalRows}
          emptyMessage="No personal open trades."
          showSplit={false}
          onEdit={onEdit}
          onClose={onClose}
          onDelete={handleDelete}
          onSaved={refresh}
        />
      </section>

      <section className="min-w-0 space-y-4">
        <h2 className="text-lg font-semibold text-white">Shared Open Trades</h2>
        <SectionSummaryStrip
          items={[
            {
              label: "Open Trades",
              value: String(sharedSummary.openTradeCount),
              subValue: "Shared positions",
            },
            {
              label: "Open Risk",
              value: formatUsd(sharedSummary.totalOpenRiskUsd),
            },
            {
              label: "Total Unrealized P/L",
              value: formatUnrealized(sharedSummary.totalUnrealizedPlUsd),
              trend: plTrend(sharedSummary.totalUnrealizedPlUsd),
            },
            {
              label: "Your Unrealized P/L",
              value: formatUnrealized(sharedSummary.userUnrealizedPlUsd),
              trend: plTrend(sharedSummary.userUnrealizedPlUsd),
            },
            {
              label: "Client Unrealized P/L",
              value: formatUnrealized(sharedSummary.clientUnrealizedPlUsd),
              trend: plTrend(sharedSummary.clientUnrealizedPlUsd),
            },
          ]}
        />
        <OpenTradesList
          rows={sharedRows}
          emptyMessage="No shared open trades."
          showSplit
          onEdit={onEdit}
          onClose={onClose}
          onDelete={handleDelete}
          onSaved={refresh}
        />
      </section>
    </div>
  );
}
