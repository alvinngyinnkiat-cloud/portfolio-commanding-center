"use client";

import { useMemo, useRef, useState } from "react";
import type { OptionsOpenTradeRow } from "@/core/domain/types/options";
import type {
  BreakevenDifference,
  StackedOptionPrice,
} from "@/core/calculations/options/open-trade-display";
import type { ResolvedScannerPrice } from "@/core/calculations/scanner/price-engine";
import { formatScannerPriceSourceLabel } from "@/core/calculations/scanner/price-engine";
import {
  buildStackedOptionPrice,
  calculateOptionDollarValue,
  calculatePerShareOptionPrice,
  compareOpenTradesByOpenDate,
  formatTargetExit,
  hasBreakevenMetrics,
  resolveBreakevenDifference,
  summarizeOpenTradesHeader,
  summarizeOpenTradesOwnership,
} from "@/core/calculations/options";
import { formatTradeStrikes } from "@/core/calculations/options/helpers";
import { formatDate, formatUsd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { Button } from "@/shared/components/ui/Button";
import {
  breakevenDiffColorClass,
  dteStatusBadgeClass,
  dteStatusLabel,
  formatSignedPercent,
  formatSignedUsdCompact,
  plColorClass,
  targetExitClass,
} from "./options-utils";
import { usePortfolio } from "@/context/PortfolioContext";

function StackedPriceCell({ value }: { value: StackedOptionPrice | null }) {
  if (!value) {
    return <span className="text-slate-500">—</span>;
  }

  return (
    <div className="leading-tight">
      <div className="font-medium text-slate-200">
        {coerceNumber(value.pricePerShare).toFixed(2)}
      </div>
      <div className="text-xs text-slate-500">{formatUsd(value.dollarValueUsd)}</div>
    </div>
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

  const contracts = row.trade.contracts;
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
    if (cancelRef.current || saving) return;
    if (!services) return;

    if (draft.trim() === "") {
      setError("Enter option price");
      return;
    }

    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Invalid price");
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
      setError(result.errors[0]?.message ?? "Save failed");
      return;
    }

    setEditing(false);
    setError(null);
    onSaved();
  };

  if (editing) {
    return (
      <div className="min-w-[5.5rem] leading-tight">
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
          className="w-20 rounded-lg border border-accent/50 bg-surface px-2 py-1 text-sm font-medium text-white outline-none ring-1 ring-accent/30"
          aria-label={`Current market value for ${row.trade.underlying}`}
        />
        <div className="mt-0.5 text-xs text-slate-500">
          {previewDollar != null ? formatUsd(previewDollar) : "—"}
        </div>
        {error && <div className="mt-0.5 text-[10px] text-accent-red">{error}</div>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      title="Click to edit current market value"
      className="rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-surface/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent/60"
    >
      {stacked ? (
        <StackedPriceCell value={stacked} />
      ) : (
        <div className="leading-tight text-slate-500">
          <div className="font-medium">—</div>
          <div className="text-xs">Click to set</div>
        </div>
      )}
    </button>
  );
}

function BreakevenDifferenceCell({
  hasBreakeven,
  underlying,
  diff,
}: {
  hasBreakeven: boolean;
  underlying: ResolvedScannerPrice;
  diff: BreakevenDifference | null;
}) {
  if (!hasBreakeven) {
    return <span className="text-slate-500">—</span>;
  }

  if (underlying.source === "unavailable" || diff == null) {
    return (
      <div className="leading-tight text-amber-300/90">
        <div className="text-sm font-medium">Price unavailable</div>
        <div className="text-xs text-slate-500">
          {underlying.isWatchlistTicker
            ? "Run Scanner refresh"
            : "Add watchlist ticker or set fallback in Edit"}
        </div>
      </div>
    );
  }

  const sourceLabel = formatScannerPriceSourceLabel(underlying.source);
  const priceLabel = `${formatUsd(underlying.priceUsd!)} · ${sourceLabel}`;

  return (
    <div
      className={`leading-tight ${breakevenDiffColorClass(diff)}`}
      title={`Latest stock price: ${priceLabel}`}
    >
      {diff.activeSide && (
        <div className="text-[10px] uppercase tracking-wide text-slate-500">
          {diff.activeSide === "lower" ? "Lower Side" : "Upper Side"}
        </div>
      )}
      <div className="font-medium">
        {formatSignedPercent(diff.differencePercent)}
      </div>
      <div className="text-xs">{formatSignedUsdCompact(diff.differenceUsd)}</div>
      <div className="mt-0.5 text-[10px] text-slate-500">@ {priceLabel}</div>
    </div>
  );
}

function SectionSummaryStrip({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div
      className={`grid gap-3 rounded-2xl border border-surface-border/80 bg-surface/40 p-4 sm:grid-cols-2 ${
        items.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-3"
      }`}
    >
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function OpenTradesTable({
  rows,
  emptyMessage,
  onEdit,
  onClose,
  onDelete,
  onValueSaved,
}: {
  rows: OptionsOpenTradeRow[];
  emptyMessage: string;
  onEdit: (row: OptionsOpenTradeRow) => void;
  onClose: (row: OptionsOpenTradeRow) => void;
  onDelete: (row: OptionsOpenTradeRow) => void;
  onValueSaved: () => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-surface-border/80">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface/60 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Underlying</th>
            <th className="px-4 py-3">Strategy</th>
            <th className="px-4 py-3">Split</th>
            <th className="px-4 py-3">Opened</th>
            <th className="px-4 py-3">Exp / DTE</th>
            <th className="px-4 py-3">Target Exit</th>
            <th className="px-4 py-3">DTE Status</th>
            <th className="px-4 py-3">Breakeven Difference</th>
            <th className="px-4 py-3">Strikes</th>
            <th className="px-4 py-3">Premium</th>
            <th className="px-4 py-3">Net Credit</th>
            <th className="px-4 py-3">75% TP Exit</th>
            <th className="px-4 py-3">Current Market Value</th>
            <th className="px-4 py-3">Max Risk</th>
            <th className="px-4 py-3">Unrealized</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border/60">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={16} className="px-4 py-8 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const economics = row.tradeEconomics;
              const metrics = economics ?? row.spreadMetrics ?? row.ironCondorMetrics;
              const hasBreakeven = hasBreakevenMetrics(
                row.trade.strategy,
                row.spreadMetrics,
                row.ironCondorMetrics,
                economics
              );
              const underlying = row.underlyingPrice;
              const breakevenDiff = resolveBreakevenDifference(
                row.trade.strategy,
                underlying.priceUsd,
                row.spreadMetrics,
                row.ironCondorMetrics,
                economics
              );
              const targetExit = formatTargetExit(row.daysToExpiration);
              const tpExit =
                metrics != null
                  ? buildStackedOptionPrice(
                      metrics.tpExitPrice75Usd,
                      row.trade.contracts
                    )
                  : null;

              return (
                <tr key={row.trade.id} className="text-slate-300">
                  <td className="px-4 py-3 font-medium text-white">
                    {row.trade.underlying}
                  </td>
                  <td className="px-4 py-3">{row.strategyDisplay}</td>
                  <td className="px-4 py-3">
                    {row.trade.userSharePercent}/{row.trade.clientSharePercent}
                  </td>
                  <td className="px-4 py-3">{formatDate(row.trade.openDate)}</td>
                  <td className="px-4 py-3">
                    {formatDate(row.trade.expirationDate)} ({row.daysToExpiration}d)
                  </td>
                  <td className={`px-4 py-3 ${targetExitClass(targetExit.kind)}`}>
                    {targetExit.label}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-lg px-2 py-0.5 text-xs font-medium ${dteStatusBadgeClass(
                        row.dteStatus
                      )}`}
                    >
                      {dteStatusLabel(row.dteStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <BreakevenDifferenceCell
                      hasBreakeven={hasBreakeven}
                      underlying={underlying}
                      diff={breakevenDiff}
                    />
                  </td>
                  <td className="px-4 py-3">{formatTradeStrikes(row.trade)}</td>
                  <td className="px-4 py-3">{formatUsd(row.trade.openPremiumUsd)}</td>
                  <td className="px-4 py-3">
                    {economics?.isDebit
                      ? economics.premiumCostUsd != null
                        ? formatUsd(economics.premiumCostUsd)
                        : "—"
                      : economics?.netCreditUsd != null
                        ? formatUsd(economics.netCreditUsd)
                        : metrics && "netCreditUsd" in metrics
                          ? formatUsd(metrics.netCreditUsd)
                          : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StackedPriceCell value={tpExit} />
                  </td>
                  <td className="px-4 py-3">
                    <InlineEditableMarketValueCell row={row} onSaved={onValueSaved} />
                  </td>
                  <td className="px-4 py-3">
                    {formatUsd(row.trade.maxRiskUsd)}
                    {metrics && (
                      <span className="ml-1 text-xs text-slate-500">(auto)</span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 ${plColorClass(
                      row.unrealizedPlUsd ?? 0,
                      row.unrealizedPlUsd == null
                    )}`}
                  >
                    {row.unrealizedPlUsd != null
                      ? formatUsd(row.unrealizedPlUsd)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onEdit(row)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => onClose(row)}>
                        Close
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => onDelete(row)}>
                        Delete
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={onOpenNew}>+ Open Trade</Button>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Personal Open Trades</h2>
        <SectionSummaryStrip
          items={[
            {
              label: "Open Trades Count",
              value: String(personalSummary.openTradeCount),
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
          onEdit={onEdit}
          onClose={onClose}
          onDelete={handleDelete}
          onValueSaved={refresh}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Shared Open Trades</h2>
        <SectionSummaryStrip
          items={[
            {
              label: "Open Trades Count",
              value: String(sharedSummary.openTradeCount),
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
          onEdit={onEdit}
          onClose={onClose}
          onDelete={handleDelete}
          onValueSaved={refresh}
        />
      </section>
    </div>
  );
}
