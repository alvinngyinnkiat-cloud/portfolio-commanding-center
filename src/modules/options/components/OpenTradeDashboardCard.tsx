"use client";

import { useMemo, useRef, useState } from "react";
import type { OptionsOpenTradeRow } from "@/core/domain/types/options";
import type { DashboardDeltaHealth, DeltaSideHealth } from "@/core/domain/types/options";
import {
  calculateOptionDollarValue,
  calculatePerShareOptionPrice,
  formatOptionsTradeDate,
  getRemainingContracts,
  supportsOpenTradeDashboard,
} from "@/core/calculations/options";
import { formatTradeCardDetails } from "@/core/calculations/options/helpers";
import { formatUsd } from "@/shared/lib/format";
import { Button } from "@/shared/components/ui/Button";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  dashboardBreakevenColorClass,
  dashboardDteColorClass,
  dashboardTradeHealthBadgeClass,
  dashboardTradeHealthColorClass,
  dashboardTrendColorClass,
  formatDelta,
  formatSignedPercent,
  formatSignedUsdCompact,
  plColorClass,
} from "./options-utils";

function MetricCard({
  title,
  children,
  statusClass,
}: {
  title: string;
  children: React.ReactNode;
  statusClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-surface-border/70 bg-surface/40 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div className={`mt-2 space-y-1 text-sm ${statusClass ?? "text-white"}`}>
        {children}
      </div>
    </div>
  );
}

function InlineNumberInput({
  label,
  value,
  onSave,
  step = "any",
}: {
  label: string;
  value: number | null | undefined;
  onSave: (next: number) => void;
  step?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const cancelRef = useRef(false);

  const startEdit = () => {
    cancelRef.current = false;
    setDraft(value != null ? String(value) : "");
    setEditing(true);
  };

  const commit = () => {
    if (cancelRef.current) return;
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed)) {
      setEditing(false);
      return;
    }
    if (value !== parsed) onSave(parsed);
    setEditing(false);
  };

  if (editing) {
    return (
      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-500">{label}</span>
        <input
          autoFocus
          type="number"
          step={step}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancelRef.current = true;
              setEditing(false);
            }
          }}
          onBlur={() => {
            window.setTimeout(commit, 0);
          }}
          className="w-20 rounded border border-accent/50 bg-surface px-1.5 py-0.5 text-right text-sm text-white outline-none"
        />
      </label>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-xs transition-colors hover:bg-surface/60"
    >
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-white">
        {value != null ? formatDelta(value) : "Set"}
      </span>
    </button>
  );
}

function deltaHealthColorClass(color: DeltaSideHealth["color"]): string {
  if (color === "green") return "text-accent-green";
  if (color === "yellow") return "text-amber-300";
  if (color === "red") return "text-accent-red";
  return "text-slate-400";
}

function deltaOverallColorClass(
  status: NonNullable<DashboardDeltaHealth["overallStatus"]>
): string {
  if (status === "healthy") return "text-accent-green";
  if (status === "monitor") return "text-amber-300";
  if (status === "review") return "text-orange-400";
  return "text-accent-red";
}

function DeltaSideBlock({ side }: { side: DeltaSideHealth }) {
  const colorClass = deltaHealthColorClass(side.color);

  return (
    <div className="space-y-1 border-t border-surface-border/50 pt-2 first:border-0 first:pt-0">
      {side.label ? (
        <p className="text-[10px] font-medium uppercase text-slate-500">
          {side.label}
        </p>
      ) : null}
      <p className="text-xs text-slate-400">
        Opening Delta {formatDelta(side.openingDelta)}
      </p>
      <p className="text-xs text-slate-400">
        Current Delta {formatDelta(side.currentDelta)}
      </p>
      <p className="text-xs text-slate-400">
        Delta Change {formatDelta(side.deltaChange)}
      </p>
      <p className={`text-xs font-medium ${colorClass}`}>
        {side.statusLabel ?? "—"}
      </p>
      <p className={`text-xs font-medium ${colorClass}`}>
        {side.message ?? "—"}
      </p>
    </div>
  );
}

export function OpenTradeDashboardCard({
  row,
  showSplit,
  onEdit,
  onClose,
  onDelete,
  onSaved,
}: {
  row: OptionsOpenTradeRow;
  showSplit: boolean;
  onEdit: (row: OptionsOpenTradeRow) => void;
  onClose: (row: OptionsOpenTradeRow) => void;
  onDelete: (row: OptionsOpenTradeRow) => void;
  onSaved: () => void;
}) {
  const { services } = usePortfolio();
  const { trade, dashboard } = row;
  const contracts = getRemainingContracts(trade);
  const optionMarkPerShare =
    trade.currentValueUsd != null
      ? calculatePerShareOptionPrice(trade.currentValueUsd, contracts)
      : null;

  const saveMonitoring = (patch: Record<string, number>) => {
    const result = services.optionsTrades.updateMonitoringInputs(trade.id, patch);
    if (!result.ok) {
      window.alert(result.errors[0]?.message ?? "Update failed");
      return;
    }
    onSaved();
  };

  const saveOptionMark = (pricePerShare: number) => {
    saveMonitoring({
      currentValueUsd: calculateOptionDollarValue(pricePerShare, contracts),
    });
  };

  const readOnlySnapshot = useMemo(() => {
    const breakevenValue =
      dashboard.ironCondorBreakeven != null
        ? `${formatUsd(dashboard.ironCondorBreakeven.lowerBreakevenUsd)} / ${formatUsd(dashboard.ironCondorBreakeven.upperBreakevenUsd)}`
        : dashboard.breakevenPriceUsd != null
          ? formatUsd(dashboard.breakevenPriceUsd)
          : "—";

    const openingDeltaValue =
      trade.strategy === "bullPut" || trade.strategy === "buyPut"
        ? trade.openingShortPutDelta
        : trade.strategy === "bearCall" || trade.strategy === "buyCall"
          ? trade.openingShortCallDelta
          : null;

    const commonTail = [
      { label: "Opened", value: formatOptionsTradeDate(trade.openDate) },
      {
        label: "Expiry",
        value: `${formatOptionsTradeDate(trade.expirationDate)} · ${dashboard.dte} DTE`,
      },
      {
        label: "Opening EMA20",
        value: trade.openingEma20 != null ? formatUsd(trade.openingEma20) : "—",
      },
      {
        label: "Opening SMA50/200",
        value:
          trade.openingSma50 != null && trade.openingSma200 != null
            ? `${formatUsd(trade.openingSma50)} / ${formatUsd(trade.openingSma200)}`
            : "—",
      },
    ];

    if (dashboard.isDebit) {
      const maxProfitValue =
        dashboard.maxProfitDisplay === "Unlimited"
          ? "Unlimited"
          : dashboard.maxProfitDisplay != null
            ? formatUsd(parseFloat(dashboard.maxProfitDisplay))
            : "—";

      return [
        {
          label: "Premium Paid",
          value:
            dashboard.premiumPaidUsd != null
              ? formatUsd(dashboard.premiumPaidUsd)
              : "—",
        },
        { label: "Max Risk", value: formatUsd(dashboard.maxRiskUsd) },
        { label: "Max Profit", value: maxProfitValue },
        { label: "Breakeven", value: breakevenValue },
        {
          label: "Opening Delta",
          value: openingDeltaValue != null ? formatDelta(openingDeltaValue) : "—",
        },
        ...commonTail,
      ];
    }

    return [
      {
        label: "Entry Credit",
        value:
          dashboard.entryCreditUsd != null
            ? formatUsd(dashboard.entryCreditUsd)
            : "—",
      },
      { label: "Breakeven", value: breakevenValue },
      ...commonTail,
    ];
  }, [dashboard, trade]);

  const showDashboard = supportsOpenTradeDashboard(trade.strategy);

  return (
    <article className="min-w-0 rounded-2xl border border-surface-border/80 bg-surface-card/90 p-4 sm:p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{trade.underlying}</h3>
            <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-slate-400">
              {row.strategyDisplay}
            </span>
            {showSplit && (
              <span className="text-xs text-slate-500">
                {trade.userSharePercent}/{trade.clientSharePercent}
              </span>
            )}
            {dashboard.tradeHealth && (
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${dashboardTradeHealthBadgeClass(dashboard.tradeHealth)}`}
              >
                {dashboard.tradeHealth}
              </span>
            )}
          </div>
          <div className="space-y-0.5">
            {formatTradeCardDetails(trade).map((line) => (
              <p key={line} className="text-xs text-slate-500">
                {line}
              </p>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(row)}>
            Edit
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onClose(row)}>
            Close
          </Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(row)}>
            Del
          </Button>
        </div>
      </header>

      {showDashboard && (
        <div className="mb-4 rounded-xl border border-surface-border/60 bg-surface/30 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Manual Inputs
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <InlineNumberInput
              label="Current Price"
              value={trade.underlyingPriceUsd}
              onSave={(v) => saveMonitoring({ underlyingPriceUsd: v })}
            />
            {(trade.strategy === "bullPut" || trade.strategy === "bearCall") && (
              <InlineNumberInput
                label="Current Delta"
                value={
                  trade.strategy === "bullPut"
                    ? trade.currentShortPutDelta
                    : trade.currentShortCallDelta
                }
                onSave={(v) =>
                  saveMonitoring(
                    trade.strategy === "bullPut"
                      ? { currentShortPutDelta: v }
                      : { currentShortCallDelta: v }
                  )
                }
              />
            )}
            {trade.strategy === "buyCall" && (
              <InlineNumberInput
                label="Current Delta"
                value={trade.currentShortCallDelta}
                onSave={(v) => saveMonitoring({ currentShortCallDelta: v })}
              />
            )}
            {trade.strategy === "buyPut" && (
              <InlineNumberInput
                label="Current Delta"
                value={trade.currentShortPutDelta}
                onSave={(v) => saveMonitoring({ currentShortPutDelta: v })}
              />
            )}
            {trade.strategy === "ironCondor" && (
              <>
                <InlineNumberInput
                  label="Current Put Delta"
                  value={trade.currentPutSideDelta}
                  onSave={(v) => saveMonitoring({ currentPutSideDelta: v })}
                />
                <InlineNumberInput
                  label="Current Call Delta"
                  value={trade.currentCallSideDelta}
                  onSave={(v) => saveMonitoring({ currentCallSideDelta: v })}
                />
              </>
            )}
            <InlineNumberInput
              label="Option Mark"
              value={optionMarkPerShare}
              onSave={saveOptionMark}
            />
          </div>
        </div>
      )}

      {showDashboard ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="DTE"
            statusClass={dashboardDteColorClass(dashboard.dteStatus)}
          >
            <p className="text-xl font-bold">{dashboard.dte}</p>
            <p className="text-xs text-slate-400">DTE Remaining</p>
          </MetricCard>

          <MetricCard
            title="Breakeven Distance"
            statusClass={dashboardBreakevenColorClass(dashboard.breakevenStatus)}
          >
            {dashboard.ironCondorBreakeven ? (
              <>
                <p className="text-xs text-slate-400">
                  Lower Breakeven {formatUsd(dashboard.ironCondorBreakeven.lowerBreakevenUsd)}
                </p>
                <p className="text-sm font-bold">
                  Put Side{" "}
                  {formatSignedPercent(dashboard.ironCondorBreakeven.putSideDistancePct)}
                </p>
                <p className="text-xs text-slate-400">
                  Upper Breakeven {formatUsd(dashboard.ironCondorBreakeven.upperBreakevenUsd)}
                </p>
                <p className="text-sm font-bold">
                  Call Side{" "}
                  {formatSignedPercent(dashboard.ironCondorBreakeven.callSideDistancePct)}
                </p>
                <p className="text-xs text-slate-500">
                  Closest Side{" "}
                  {dashboard.ironCondorBreakeven.closestSide === "put"
                    ? "Put Side"
                    : "Call Side"}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold">
                  {dashboard.breakevenDistancePct != null
                    ? formatSignedPercent(dashboard.breakevenDistancePct)
                    : "—"}
                </p>
                <p className="text-xs text-slate-400">
                  Price{" "}
                  {dashboard.currentPriceUsd != null
                    ? formatUsd(dashboard.currentPriceUsd)
                    : "—"}
                </p>
                {dashboard.currentPriceSourceLabel && (
                  <p className="text-[10px] text-slate-500">
                    {dashboard.currentPriceSourceLabel}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Breakeven{" "}
                  {dashboard.breakevenPriceUsd != null
                    ? formatUsd(dashboard.breakevenPriceUsd)
                    : "—"}
                </p>
              </>
            )}
          </MetricCard>

          <MetricCard
            title="Trade Health"
            statusClass={dashboardTradeHealthColorClass(dashboard.tradeHealth)}
          >
            <p className="text-lg font-bold">{dashboard.tradeHealth ?? "—"}</p>
          </MetricCard>

          <MetricCard title="Current P/L">
            <p
              className={`text-lg font-bold leading-tight ${plColorClass(
                dashboard.unrealizedPlUsd ?? 0,
                dashboard.unrealizedPlUsd == null
              )}`}
            >
              {dashboard.unrealizedPlUsd != null
                ? formatSignedUsdCompact(dashboard.unrealizedPlUsd)
                : "—"}
            </p>
            <p
              className={`text-sm ${plColorClass(
                dashboard.unrealizedPlPct ?? 0,
                dashboard.unrealizedPlPct == null
              )}`}
            >
              {dashboard.unrealizedPlPct != null
                ? `(${formatSignedPercent(dashboard.unrealizedPlPct, 1)})`
                : ""}
            </p>
            <p className="text-xs text-slate-500">
              Current MV{" "}
              <span className="text-slate-300">
                {trade.currentValueUsd != null
                  ? formatUsd(trade.currentValueUsd)
                  : "—"}
              </span>
            </p>
            <p className="pt-1 text-xs text-slate-500">
              Max Risk{" "}
              <span className="text-slate-300">
                {formatUsd(dashboard.maxRiskUsd)}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              Risk Used{" "}
              <span className="text-slate-300">
                {dashboard.riskUsedPct != null
                  ? `${dashboard.riskUsedPct.toFixed(1)}%`
                  : "—"}
              </span>
            </p>
          </MetricCard>

          <MetricCard title="Delta Health">
            {dashboard.deltaHealth?.overallLabel && (
              <p
                className={`mb-2 text-sm font-semibold ${deltaOverallColorClass(
                  dashboard.deltaHealth.overallStatus ?? "healthy"
                )}`}
              >
                Overall: {dashboard.deltaHealth.overallLabel}
              </p>
            )}
            {dashboard.deltaHealth?.putSide && (
              <DeltaSideBlock side={dashboard.deltaHealth.putSide} />
            )}
            {dashboard.deltaHealth?.callSide && (
              <DeltaSideBlock side={dashboard.deltaHealth.callSide} />
            )}
            {!dashboard.deltaHealth?.putSide && !dashboard.deltaHealth?.callSide && (
              <p className="text-slate-500">—</p>
            )}
          </MetricCard>

          <MetricCard title="Trend Health">
            {dashboard.trendHealth?.shortTrend && (
              <p
                className={`text-sm font-medium ${dashboardTrendColorClass(dashboard.trendHealth.shortTrend.direction)}`}
              >
                {dashboard.trendHealth.shortTrend.direction === "positive"
                  ? "🟢"
                  : "🔴"}{" "}
                {dashboard.trendHealth.shortTrend.label}
              </p>
            )}
            {dashboard.trendHealth?.longTrend && (
              <p
                className={`text-sm font-medium ${dashboardTrendColorClass(dashboard.trendHealth.longTrend.direction)}`}
              >
                {dashboard.trendHealth.longTrend.direction === "positive"
                  ? "🟢"
                  : "🔴"}{" "}
                {dashboard.trendHealth.longTrend.label}
              </p>
            )}
            {!dashboard.trendHealth?.shortTrend &&
              !dashboard.trendHealth?.longTrend && (
                <p className="text-slate-500">—</p>
              )}
          </MetricCard>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Risk dashboard is not available for this strategy type.
        </p>
      )}

      {showDashboard && (
        <details className="mt-4 rounded-xl border border-surface-border/50 bg-surface/20 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-slate-500">
            Opening snapshot (read-only)
          </summary>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {readOnlySnapshot.map((item) => (
              <div key={item.label}>
                <dt className="text-[10px] uppercase text-slate-600">{item.label}</dt>
                <dd className="text-xs text-slate-300">{item.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </article>
  );
}
