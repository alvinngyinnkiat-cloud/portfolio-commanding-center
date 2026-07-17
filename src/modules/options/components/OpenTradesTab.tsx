"use client";

import { useMemo, useState } from "react";
import type {
  OpenTradeHealthCategory,
  OptionsOpenTradeRow,
} from "@/core/domain/types/options";
import {
  classifyOpenTradeRowHealthCategory,
  compareOpenTradesByDte,
  summarizeOpenTradesHeader,
  summarizeOpenTradesOwnership,
  summarizeOpenTradeHealthCategories,
} from "@/core/calculations/options";
import { formatUsd } from "@/shared/lib/format";
import { Button } from "@/shared/components/ui/Button";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { plTrend } from "./options-utils";
import { usePortfolio } from "@/context/PortfolioContext";
import { collectOpenTradeCurrentPriceInputs } from "@/core/calculations/scanner/collect-current-price-tickers";
import { RefreshCurrentPricesButton } from "@/shared/components/ui/RefreshCurrentPricesButton";
import { OpenTradeDashboardCard } from "./OpenTradeDashboardCard";
import { TradeHealthSummaryCards } from "./TradeHealthSummaryCards";

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

function filterRowsByHealth(
  rows: OptionsOpenTradeRow[],
  filter: OpenTradeHealthCategory | null
): OptionsOpenTradeRow[] {
  if (filter == null) return rows;
  return rows.filter(
    (row) => classifyOpenTradeRowHealthCategory(row) === filter
  );
}

function OpenTradesList({
  rows,
  emptyMessage,
  filteredEmptyMessage,
  showSplit,
  onEdit,
  onClose,
  onDelete,
  onSaved,
}: {
  rows: OptionsOpenTradeRow[];
  emptyMessage: string;
  filteredEmptyMessage?: string;
  showSplit: boolean;
  onEdit: (row: OptionsOpenTradeRow) => void;
  onClose: (row: OptionsOpenTradeRow) => void;
  onDelete: (row: OptionsOpenTradeRow) => void;
  onSaved: () => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-surface-border/80 bg-surface-card/60 px-4 py-8 text-center text-slate-500">
        {filteredEmptyMessage ?? emptyMessage}
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
  const { optionsData, services, refresh, refreshCurrentPrices } = usePortfolio();
  const rows = optionsData?.openRows ?? [];
  const [healthFilter, setHealthFilter] = useState<OpenTradeHealthCategory | null>(
    null
  );

  const sortedRows = useMemo(
    () => [...rows].sort(compareOpenTradesByDte),
    [rows]
  );

  const healthSummary = useMemo(
    () => summarizeOpenTradeHealthCategories(sortedRows),
    [sortedRows]
  );

  const filteredRows = useMemo(
    () => filterRowsByHealth(sortedRows, healthFilter),
    [sortedRows, healthFilter]
  );

  const personalRows = useMemo(
    () =>
      filteredRows.filter((row) => row.trade.tradeType === "personal"),
    [filteredRows]
  );

  const sharedRows = useMemo(
    () => filteredRows.filter((row) => row.trade.tradeType === "shared"),
    [filteredRows]
  );

  const personalSummary = useMemo(
    () => summarizeOpenTradesHeader(personalRows),
    [personalRows]
  );

  const sharedSummary = useMemo(
    () => summarizeOpenTradesOwnership(sharedRows),
    [sharedRows]
  );

  const openTradePriceInputs = useMemo(
    () => collectOpenTradeCurrentPriceInputs(rows),
    [rows]
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

  const filterLabel =
    healthFilter === "threatened"
      ? "threatened"
      : healthFilter === "review"
        ? "review"
        : healthFilter === "healthy"
          ? "healthy"
          : null;

  const filteredEmptyMessage =
    filterLabel != null
      ? `No ${filterLabel} trades in this section.`
      : undefined;

  return (
    <div className="min-w-0 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onOpenNew}>+ Open Trade</Button>
          <RefreshCurrentPricesButton
            tickers={openTradePriceInputs}
            onRefresh={refreshCurrentPrices}
          />
        </div>
        {healthFilter != null && (
          <button
            type="button"
            onClick={() => setHealthFilter(null)}
            className="text-sm text-slate-400 underline-offset-2 hover:text-white hover:underline"
          >
            Clear health filter
          </button>
        )}
      </div>

      <section className="min-w-0 space-y-3">
        <h2 className="text-lg font-semibold text-white">Trade Health</h2>
        <TradeHealthSummaryCards
          summary={healthSummary}
          activeFilter={healthFilter}
          onFilterChange={setHealthFilter}
        />
      </section>

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
          filteredEmptyMessage={filteredEmptyMessage}
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
          filteredEmptyMessage={filteredEmptyMessage}
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
