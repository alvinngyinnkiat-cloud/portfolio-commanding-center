"use client";

import { useMemo, useRef, useState } from "react";
import type { OptionsOpenTradeRow } from "@/core/domain/types/options";
import type { StackedOptionPrice } from "@/core/calculations/options/open-trade-display";
import {
  buildStackedOptionPrice,
  calculateOptionDollarValue,
  calculatePerShareOptionPrice,
  compareOpenTradesByOpenDate,
  formatOptionsTradeDate,
  getOriginalContracts,
  getRemainingContracts,
  hasBreakevenMetrics,
  resolveBreakevenDifference,
  scaleMaxRiskForRemaining,
  summarizeOpenTradesHeader,
  summarizeOpenTradesOwnership,
  tradeForRemainingContracts,
} from "@/core/calculations/options";
import { formatTradeStrikes } from "@/core/calculations/options/helpers";
import { formatUsd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { Button } from "@/shared/components/ui/Button";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { StackedValue } from "@/shared/components/ui/StackedValue";
import {
  dataTableClass,
  dataTableHeadClass,
  dataTableRowClass,
  dataTableTdLeftClass,
  dataTableTdRightClass,
  dataTableThLeftClass,
  dataTableThRightClass,
  dataTableWrapperClass,
} from "@/shared/components/ui/data-table";
import {
  breakevenDiffColorClass,
  formatSignedPercent,
  formatSignedUsdCompact,
  plColorClass,
} from "./options-utils";
import { usePortfolio } from "@/context/PortfolioContext";

function StackedPriceCell({ value }: { value: StackedOptionPrice | null }) {
  if (!value) return <span className="text-slate-500">—</span>;
  return (
    <StackedValue
      align="right"
      primary={coerceNumber(value.pricePerShare).toFixed(2)}
      secondary={formatUsd(value.dollarValueUsd)}
    />
  );
}

function InlineEditableMarketValueCell({
  row,
  onSaved,
}: {
  row: OptionsOpenTradeRow;
  onSaved: () => void;
}) {
  const { services } = usePortfolio();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const contracts = getRemainingContracts(row.trade);
  const savedPrice =
    row.trade.currentValueUsd != null
      ? calculatePerShareOptionPrice(row.trade.currentValueUsd, contracts)
      : null;
  const stacked =
    row.trade.currentValueUsd != null
      ? buildStackedOptionPrice(row.trade.currentValueUsd, contracts)
      : null;

  const draftPrice = draft.trim() === "" ? null : parseFloat(draft);
  const previewDollar =
    draftPrice != null && Number.isFinite(draftPrice) && draftPrice >= 0
      ? calculateOptionDollarValue(draftPrice, contracts)
      : null;

  const startEdit = () => {
    cancelRef.current = false;
    setError(null);
    setDraft(savedPrice != null ? savedPrice.toFixed(2) : "");
    setEditing(true);
  };

  const cancelEdit = () => {
    cancelRef.current = true;
    setEditing(false);
    setError(null);
    setDraft("");
  };

  const commitEdit = () => {
    if (cancelRef.current || saving || !services) return;

    if (draft.trim() === "") {
      setError("Required");
      return;
    }

    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Invalid");
      return;
    }

    const dollarValue = calculateOptionDollarValue(parsed, contracts);
    if (row.trade.currentValueUsd === dollarValue) {
      setEditing(false);
      setError(null);
      return;
    }

    setSaving(true);
    const result = services.optionsTrades.updateCurrentValue(row.trade.id, dollarValue);
    setSaving(false);

    if (!result.ok) {
      setError(result.errors[0]?.message ?? "Failed");
      return;
    }

    setEditing(false);
    setError(null);
    onSaved();
  };

  if (editing) {
    return (
      <div className="leading-tight">
        <input
          autoFocus
          type="number"
          step="any"
          min="0"
          value={draft}
          disabled={saving}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitEdit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancelEdit();
            }
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (!cancelRef.current) commitEdit();
            }, 0);
          }}
          className="w-14 rounded border border-accent/50 bg-surface px-1.5 py-0.5 text-right text-sm font-medium text-white outline-none"
          aria-label={`Current value for ${row.trade.underlying}`}
        />
        <div className="mt-0.5 text-right text-[11px] text-slate-500">
          {previewDollar != null ? formatUsd(previewDollar) : "—"}
        </div>
        {error && (
          <div className="text-right text-[10px] text-accent-red">{error}</div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      title="Edit current value"
      className="w-full rounded px-0.5 py-0.5 text-right transition-colors hover:bg-surface/70"
    >
      {stacked ? (
        <StackedPriceCell value={stacked} />
      ) : (
        <StackedValue align="right" primary="—" secondary="Set" />
      )}
    </button>
  );
}

function CompactBreakevenCell({
  row,
}: {
  row: OptionsOpenTradeRow;
}) {
  const economics = row.tradeEconomics;
  const hasBreakeven = hasBreakevenMetrics(
    row.trade.strategy,
    row.spreadMetrics,
    row.ironCondorMetrics,
    economics
  );
  const diff = resolveBreakevenDifference(
    row.trade.strategy,
    row.underlyingPrice.priceUsd,
    row.spreadMetrics,
    row.ironCondorMetrics,
    economics
  );

  if (!hasBreakeven) return <span className="text-slate-500">—</span>;
  if (row.underlyingPrice.source === "unavailable" || diff == null) {
    return <span className="text-amber-300/90">—</span>;
  }

  return (
    <StackedValue
      align="right"
      primary={formatSignedPercent(diff.differencePercent)}
      secondary={formatSignedUsdCompact(diff.differenceUsd)}
      primaryClassName={`font-medium ${breakevenDiffColorClass(diff)}`}
      secondaryClassName={`text-[11px] ${breakevenDiffColorClass(diff)}`}
    />
  );
}

function SectionSummaryStrip({
  items,
}: {
  items: Array<{ label: string; value: string; subValue?: string }>;
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
        />
      ))}
    </div>
  );
}

function OpenTradesTable({
  rows,
  emptyMessage,
  showSplitColumn,
  onEdit,
  onClose,
  onDelete,
  onValueSaved,
}: {
  rows: OptionsOpenTradeRow[];
  emptyMessage: string;
  showSplitColumn: boolean;
  onEdit: (row: OptionsOpenTradeRow) => void;
  onClose: (row: OptionsOpenTradeRow) => void;
  onDelete: (row: OptionsOpenTradeRow) => void;
  onValueSaved: () => void;
}) {
  const colCount = showSplitColumn ? 15 : 14;

  return (
    <div className={dataTableWrapperClass}>
      <table className={dataTableClass}>
        <thead className={dataTableHeadClass}>
          <tr>
            <th className={`${dataTableThLeftClass} w-[4.5rem]`}>Underlying</th>
            <th className={`${dataTableThLeftClass} w-[5.5rem]`}>Strategy</th>
            {showSplitColumn && (
              <th className={`${dataTableThRightClass} w-[3rem]`}>Split</th>
            )}
            <th className={`${dataTableThLeftClass} w-[4.5rem]`}>Opened</th>
            <th className={`${dataTableThLeftClass} w-[4.5rem]`}>Expiration</th>
            <th className={`${dataTableThRightClass} w-[3.5rem]`}>Orig</th>
            <th className={`${dataTableThRightClass} w-[3.5rem]`}>Rem</th>
            <th className={`${dataTableThRightClass} w-[4rem]`}>Strikes</th>
            <th className={`${dataTableThRightClass} w-[4.5rem]`}>Premium</th>
            <th className={`${dataTableThRightClass} w-[4rem]`}>75% TP</th>
            <th className={`${dataTableThRightClass} w-[4.5rem]`}>Current</th>
            <th className={`${dataTableThRightClass} w-[4rem]`}>Breakeven</th>
            <th className={`${dataTableThRightClass} w-[4.5rem]`}>Max Risk</th>
            <th className={`${dataTableThRightClass} w-[4rem]`}>Unrealized</th>
            <th className={`${dataTableThLeftClass} w-[5.5rem]`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-2 py-6 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const economics = row.tradeEconomics;
              const metrics =
                economics ?? row.spreadMetrics ?? row.ironCondorMetrics;
              const effectiveTrade = tradeForRemainingContracts(row.trade);
              const premiumStacked = buildStackedOptionPrice(
                effectiveTrade.openPremiumUsd,
                effectiveTrade.contracts
              );
              const tpExit =
                metrics != null
                  ? buildStackedOptionPrice(
                      metrics.tpExitPrice75Usd,
                      effectiveTrade.contracts
                    )
                  : null;
              const originalContracts = getOriginalContracts(row.trade);
              const remainingContracts = getRemainingContracts(row.trade);

              return (
                <tr key={row.trade.id} className={dataTableRowClass}>
                  <td className={`${dataTableTdLeftClass} font-medium text-white`}>
                    {row.trade.underlying}
                  </td>
                  <td className={`${dataTableTdLeftClass} text-xs`}>
                    {row.strategyDisplay}
                  </td>
                  {showSplitColumn && (
                    <td className={dataTableTdRightClass}>
                      {row.trade.userSharePercent}/{row.trade.clientSharePercent}
                    </td>
                  )}
                  <td className={dataTableTdLeftClass}>
                    {formatOptionsTradeDate(row.trade.openDate)}
                  </td>
                  <td className={dataTableTdLeftClass}>
                    <StackedValue
                      primary={formatOptionsTradeDate(row.trade.expirationDate)}
                      secondary={`${row.daysToExpiration} DTE`}
                    />
                  </td>
                  <td className={dataTableTdRightClass}>{originalContracts}</td>
                  <td className={dataTableTdRightClass}>{remainingContracts}</td>
                  <td className={`${dataTableTdRightClass} text-xs`}>
                    {formatTradeStrikes(row.trade)}
                  </td>
                  <td className={dataTableTdRightClass}>
                    <StackedPriceCell value={premiumStacked} />
                  </td>
                  <td className={dataTableTdRightClass}>
                    <StackedPriceCell value={tpExit} />
                  </td>
                  <td className={dataTableTdRightClass}>
                    <InlineEditableMarketValueCell
                      row={row}
                      onSaved={onValueSaved}
                    />
                  </td>
                  <td className={dataTableTdRightClass}>
                    <CompactBreakevenCell row={row} />
                  </td>
                  <td className={dataTableTdRightClass}>
                    {formatUsd(scaleMaxRiskForRemaining(row.trade))}
                  </td>
                  <td
                    className={`${dataTableTdRightClass} ${plColorClass(
                      row.unrealizedPlUsd ?? 0,
                      row.unrealizedPlUsd == null
                    )}`}
                  >
                    {row.unrealizedPlUsd != null
                      ? formatUsd(row.unrealizedPlUsd)
                      : "—"}
                  </td>
                  <td className={dataTableTdLeftClass}>
                    <div className="flex flex-wrap gap-0.5">
                      <Button size="sm" variant="ghost" onClick={() => onEdit(row)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onClose(row)}
                      >
                        Close
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => onDelete(row)}
                      >
                        Del
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
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
      [...rows.filter((row) => row.trade.tradeType === "personal")].sort(
        compareOpenTradesByOpenDate
      ),
    [rows]
  );

  const sharedRows = useMemo(
    () =>
      [...rows.filter((row) => row.trade.tradeType === "shared")].sort(
        compareOpenTradesByOpenDate
      ),
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
            },
          ]}
        />
        <OpenTradesTable
          rows={personalRows}
          emptyMessage="No personal open trades."
          showSplitColumn={false}
          onEdit={onEdit}
          onClose={onClose}
          onDelete={handleDelete}
          onValueSaved={refresh}
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
            },
            {
              label: "Your Unrealized P/L",
              value: formatUnrealized(sharedSummary.userUnrealizedPlUsd),
            },
            {
              label: "Client Unrealized P/L",
              value: formatUnrealized(sharedSummary.clientUnrealizedPlUsd),
            },
          ]}
        />
        <OpenTradesTable
          rows={sharedRows}
          emptyMessage="No shared open trades."
          showSplitColumn
          onEdit={onEdit}
          onClose={onClose}
          onDelete={handleDelete}
          onValueSaved={refresh}
        />
      </section>
    </div>
  );
}
