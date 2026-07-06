"use client";

import type { FoundationPositionView } from "@/core/domain/types/income";
import { recoveryPhaseLabel } from "@/core/calculations/income";
import { Card } from "@/shared/components/ui/Card";
import { formatUsd, formatPercent, formatDate } from "@/shared/lib/format";
import { plColorClass } from "@/modules/options/components/options-utils";
import { FoundationChart } from "./FoundationChart";
import { CheckCircle2, Circle } from "lucide-react";

interface FoundationCardProps {
  foundation: FoundationPositionView;
  atrMultiplier: number;
}

function ChecklistSection({
  title,
  items,
}: {
  title: string;
  items: { id: string; label: string; pass: boolean; detail?: string }[];
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            {item.pass ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
            ) : (
              <Circle size={16} className="mt-0.5 shrink-0 text-slate-600" />
            )}
            <div>
              <p className={item.pass ? "text-slate-200" : "text-slate-400"}>
                {item.pass ? "✅" : "⬜"} {item.label}
              </p>
              {item.detail && (
                <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function decisionStatusClass(status: FoundationPositionView["decisionStatus"]): string {
  switch (status) {
    case "sell_call_window_open":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
    case "waiting_for_confirmation":
      return "border-orange-500/40 bg-orange-500/10 text-orange-200";
    case "waiting_for_trigger":
      return "border-yellow-500/40 bg-yellow-500/10 text-yellow-200";
    default:
      return "border-surface-border/60 bg-surface/40 text-slate-300";
  }
}

export function FoundationCard({ foundation, atrMultiplier }: FoundationCardProps) {
  const {
    ticker,
    foundationRow,
    activeSellCallRow,
    scannerCandles,
    currentPriceUsd,
    avgPriceUsd,
    foundationBreakevenUsd,
    callBreakevenUsd,
    foundationChecklist,
    timingRules,
    foundationTriggerPriceUsd,
    distanceToTriggerUsd,
    triggerStatusLabel,
    decisionStatus,
    decisionLabel,
    recoveryPct,
    recoveryPhase,
    lifetimePremiumUsd,
    incomeCycles,
    activeRecommendation,
    atr14,
  } = foundation;

  return (
    <Card
      title={ticker}
      subtitle={`Foundation · ${foundationRow.strategyDisplay} · DTE ${foundationRow.daysToExpiration}`}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Foundation Chart
          </h4>
          <FoundationChart
            candles={scannerCandles}
            avgPrice={avgPriceUsd}
            currentPriceUsd={currentPriceUsd}
            foundationBreakevenUsd={foundationBreakevenUsd}
            callBreakevenUsd={callBreakevenUsd}
          />
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <Metric label="Current Price" value={formatUsd(currentPriceUsd)} />
            <Metric label="Foundation BE" value={formatUsd(foundationBreakevenUsd)} />
            <Metric label="Call BE" value={formatUsd(callBreakevenUsd)} />
            <Metric
              label="Lifetime Premium"
              value={formatUsd(lifetimePremiumUsd)}
            />
          </div>
        </div>

        <div className="space-y-5">
          <ChecklistSection title="Foundation Checklist" items={foundationChecklist} />
          <ChecklistSection title="SELL CALL Timing Checklist" items={timingRules} />

          <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Foundation Trigger Panel
            </h4>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Current Price" value={formatUsd(currentPriceUsd)} />
              <Row label="Foundation Breakeven" value={formatUsd(foundationBreakevenUsd)} />
              <Row label="ATR14" value={formatUsd(atr14)} />
              <Row
                label="Foundation Trigger ATR Multiplier"
                value={String(atrMultiplier)}
              />
              <Row
                label="Foundation Trigger Price"
                value={formatUsd(foundationTriggerPriceUsd)}
              />
              <Row
                label="Distance to Trigger"
                value={
                  distanceToTriggerUsd != null
                    ? formatUsd(distanceToTriggerUsd)
                    : "—"
                }
              />
              <Row label="Trigger Status" value={triggerStatusLabel} />
            </dl>
          </div>

          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${decisionStatusClass(decisionStatus)}`}
          >
            <p className="text-[10px] uppercase tracking-wide opacity-80">
              Decision Status
            </p>
            <p className="mt-1">{decisionLabel}</p>
            {recoveryPct != null && recoveryPhase && (
              <p className="mt-2 text-xs font-normal opacity-90">
                Recovery {formatPercent(recoveryPct)} · {recoveryPhaseLabel(recoveryPhase)}
              </p>
            )}
          </div>
        </div>
      </div>

      {activeSellCallRow && (
        <div className="mt-6 rounded-xl border border-surface-border/60 bg-surface/40 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current Active SELL CALL
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Metric
              label="Current DTE"
              value={String(activeSellCallRow.daysToExpiration)}
            />
            <Metric
              label="Current P&L"
              value={formatUsd(activeSellCallRow.unrealizedPlUsd)}
              valueClass={plColorClass(activeSellCallRow.unrealizedPlUsd)}
            />
            <Metric
              label="Recommendation"
              value={activeRecommendation ?? "—"}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {activeSellCallRow.strategyDisplay} · Exp{" "}
            {formatDate(activeSellCallRow.trade.expirationDate)}
          </p>
        </div>
      )}

      <div className="mt-6">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Income History
        </h4>
        <div className="mt-3 overflow-x-auto rounded-xl border border-surface-border/60">
          <table className="w-full text-sm">
            <thead className="bg-surface/60">
              <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Cycle</th>
                <th className="px-4 py-3">Open Date</th>
                <th className="px-4 py-3">Close Date</th>
                <th className="px-4 py-3">Premium Received</th>
                <th className="px-4 py-3">Realized P&L</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {incomeCycles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No sell call income cycles yet.
                  </td>
                </tr>
              ) : (
                incomeCycles.map((cycle) => (
                  <tr
                    key={cycle.tradeId}
                    className="border-b border-surface-border/40 last:border-0"
                  >
                    <td className="px-4 py-3 text-slate-300">#{cycle.cycleNumber}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatDate(cycle.openDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {cycle.closeDate ? formatDate(cycle.closeDate) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      {formatUsd(cycle.premiumReceivedUsd)}
                    </td>
                    <td
                      className={`px-4 py-3 ${plColorClass(cycle.realizedPlUsd)}`}
                    >
                      {cycle.realizedPlUsd != null
                        ? formatUsd(cycle.realizedPlUsd)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-400">
                      {cycle.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-surface-border/50 bg-surface/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-medium ${valueClass ?? "text-slate-200"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-200">{value}</dd>
    </div>
  );
}
