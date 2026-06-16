"use client";

import { useState, type ReactNode } from "react";
import type {
  ScannerTickerResult,
  StrategyOutput,
} from "@/core/domain/types/scanner";
import { STRATEGY_LABELS, STRATEGY_OUTPUT_LABELS } from "@/core/domain/types/scanner";
import { Card } from "@/shared/components/ui/Card";
import { FiveDayCandlestickChart } from "./FiveDayCandlestickChart";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ScannerOpportunityCardProps {
  result: ScannerTickerResult;
}

const OUTPUT_STYLES: Record<StrategyOutput, string> = {
  "SELL PUT": "border-accent-green/40 bg-accent-green/10 text-accent-green",
  "SELL CALL": "border-accent-red/40 bg-accent-red/10 text-accent-red",
  "IRON CONDOR": "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  "NO TRADE": "border-surface-border bg-surface/60 text-slate-400",
};

export function ScannerOpportunityCard({ result }: ScannerOpportunityCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card noPadding className={`overflow-hidden ${result.tradable ? "" : "opacity-85"}`}>
      <div className="space-y-4 overflow-hidden p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <TradableBadge tradable={result.tradable} />
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1 rounded-lg border border-surface-border/80 px-3 py-1.5 text-xs font-medium text-accent hover:bg-surface/60"
          >
            View Details
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-3 lg:gap-5">
          <LeftColumn result={result} />
          <StrategyColumn
            title="20 EMA Strategy"
            output={result.emaStrategy.output}
            reasons={result.emaStrategy.reasons}
          />
          <StrategyColumn
            title="Main System"
            output={result.mainSystem.output}
            reasons={result.mainSystem.reasons}
          />
        </div>

        {expanded && <ExpandedDetails result={result} />}
      </div>
    </Card>
  );
}

function LeftColumn({ result }: { result: ScannerTickerResult }) {
  const { structure, indicators } = result;

  return (
    <div className="min-w-0 space-y-4 overflow-hidden">
      <div>
        <p className="text-xl font-bold text-white">{result.ticker}</p>
        <p className="text-sm text-slate-500">{result.category}</p>
      </div>

      <FiveDayCandlestickChart
        candles={result.recentCandles}
        avgPrice={indicators.avgPrice}
        sellPutZone={structure.sellPutRange}
        sellCallZone={structure.sellCallRange}
        icMidZone={resolveAdjustedMidZone(structure, indicators.atr14)}
      />

      <div className="grid min-w-0 grid-cols-2 gap-2 text-sm sm:gap-3">
        <Metric label="Weighted Support" value={formatNum(structure.primarySupport)} />
        <Metric
          label="Weighted Resistance"
          value={formatNum(structure.primaryResistance)}
        />
        <Metric
          label="Adjusted Mid Zone"
          value={formatAdjustedMidZone(structure, indicators.atr14)}
        />
        <Metric label="SO Value" value={formatNum(indicators.so, 1)} />
        <Metric label="SO Status" value={indicators.soStatus} />
        <Metric label="Trend" value={indicators.trend} />
        <Metric label="Average Price" value={formatNum(indicators.avgPrice)} />
      </div>
    </div>
  );
}

function StrategyColumn({
  title,
  output,
  reasons,
}: {
  title: string;
  output: StrategyOutput;
  reasons: string[];
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-surface-border/70 bg-surface/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div
        className={`mt-4 block w-full rounded-xl border px-4 py-4 text-center text-2xl font-extrabold tracking-wide sm:text-3xl ${OUTPUT_STYLES[output]}`}
      >
        {STRATEGY_OUTPUT_LABELS[output]}
      </div>
      <ul className="mt-4 space-y-1.5">
        {reasons.length === 0 ? (
          <li className="text-xs text-slate-500">No reasons available</li>
        ) : (
          reasons.map((reason) => (
            <li
              key={reason}
              className="flex gap-2 text-xs text-slate-400 before:shrink-0 before:content-['•']"
            >
              {reason}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function ExpandedDetails({ result }: { result: ScannerTickerResult }) {
  const { structure, indicators } = result;

  return (
    <div className="space-y-5 border-t border-surface-border/60 pt-5">
      <DetailSection title="SO Validation">
        <DetailGrid
          items={[
            ["SO Settings", "Stochastic 10 / 3 (Daily Close, completed sessions)"],
            ["Current SO", formatNum(indicators.so, 1)],
            ["Previous SO", formatNum(indicators.soPrev, 1)],
            ["SO Status", indicators.soStatus],
          ]}
        />
      </DetailSection>

      <DetailSection title="Structure">
        <DetailGrid
          items={[
            ["Daily Support", formatNum(structure.dailySupport)],
            ["Weekly Support", formatNum(structure.weeklySupport)],
            ["Weighted Support", formatNum(structure.primarySupport)],
            ["Adjusted Support", formatNum(structure.primarySupport)],
            ["Daily Resistance", formatNum(structure.dailyResistance)],
            ["Weekly Resistance", formatNum(structure.weeklyResistance)],
            ["Weighted Resistance", formatNum(structure.primaryResistance)],
            ["Adjusted Resistance", formatNum(structure.primaryResistance)],
            ["Adjusted Mid", formatNum(structure.midPrice)],
            ["Range Width", formatNum(structure.rangeWidth)],
          ]}
        />
      </DetailSection>

      <DetailSection title="Indicators">
        <DetailGrid
          items={[
            ["ATR14", formatNum(indicators.atr14)],
            ["EMA20", formatNum(indicators.ema20)],
            ["SMA50", formatNum(indicators.sma50)],
            ["SMA200", formatNum(indicators.sma200)],
            [
              "SMA50 Slope",
              indicators.sma50SlopePct != null
                ? `${indicators.sma50SlopePct >= 0 ? "+" : ""}${indicators.sma50SlopePct.toFixed(2)}%`
                : "—",
            ],
            ["EMA Difference", formatNum(indicators.emaDiff)],
            [
              "EMA Difference %",
              indicators.emaDiffPct != null
                ? `${indicators.emaDiffPct >= 0 ? "+" : ""}${indicators.emaDiffPct.toFixed(2)}%`
                : "—",
            ],
            ["Current Average Price", formatNum(indicators.avgPrice)],
            ["Previous Average Price", formatNum(indicators.avgPricePrev)],
            ["Current Price", formatNum(result.currentPrice)],
            ["Market Date Used", result.priceAsOf ?? "—"],
          ]}
        />
      </DetailSection>

      <DetailSection title="Zones">
        <DetailGrid
          items={[
            [
              "Sell Put Zone",
              structure.sellPutRange
                ? `${structure.sellPutRange.low.toFixed(2)} → ${structure.sellPutRange.high.toFixed(2)}`
                : "—",
            ],
            [
              "Sell Call Zone",
              structure.sellCallRange
                ? `${structure.sellCallRange.low.toFixed(2)} → ${structure.sellCallRange.high.toFixed(2)}`
                : "—",
            ],
            [
              "Adjusted Mid Zone",
              formatAdjustedMidZone(structure, indicators.atr14),
            ],
          ]}
        />
      </DetailSection>

      <DetailSection title="20 EMA Strategy — Full Checklist">
        <Checklist items={result.emaStrategy.checklist} />
      </DetailSection>

      {result.mainSystem.strategy ? (
        <DetailSection
          title={`Main System — ${STRATEGY_LABELS[result.mainSystem.strategy]}`}
        >
          <p className="mb-3 text-sm text-slate-400">
            {result.strategies[result.mainSystem.strategy].eligible
              ? "Eligible"
              : "Not eligible"}
          </p>
          <Checklist
            items={result.strategies[result.mainSystem.strategy].checklist}
          />
        </DetailSection>
      ) : (
        <>
          <DetailSection title="Main System — No Trade">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
              {result.mainSystem.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </DetailSection>

          {(["bullPut", "bearCall", "ironCondor"] as const).map((strategy) => (
            <DetailSection
              key={strategy}
              title={`Main System — ${STRATEGY_LABELS[strategy]}`}
            >
              <p className="mb-3 text-sm text-slate-400">
                {result.strategies[strategy].eligible
                  ? "Eligible"
                  : "Not eligible"}
              </p>
              <Checklist items={result.strategies[strategy].checklist} />
            </DetailSection>
          ))}
        </>
      )}

      {result.notes.length > 0 && (
        <DetailSection title="Notes">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </DetailSection>
      )}
    </div>
  );
}

function TradableBadge({ tradable }: { tradable: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
        tradable
          ? "bg-accent-green/15 text-accent-green"
          : "bg-accent-red/15 text-accent-red"
      }`}
    >
      <span>{tradable ? "🟢" : "🔴"}</span>
      {tradable ? "Tradable" : "No Setup"}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 font-medium text-slate-200">{value}</p>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h4 className="mb-3 text-sm font-semibold text-slate-200">{title}</h4>
      {children}
    </section>
  );
}

function DetailGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-medium text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

function Checklist({
  items,
}: {
  items: Array<{ label: string; passed: boolean; detail: string }>;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface/50 px-3 py-2 text-sm"
        >
          <span className="text-slate-300">
            {item.passed ? "✓" : "✗"} {item.label}
          </span>
          <span className="text-slate-400">{item.detail}</span>
        </div>
      ))}
    </div>
  );
}

function formatNum(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(digits);
}

function resolveAdjustedMidZone(
  structure: ScannerTickerResult["structure"],
  atr14: number | null
): { low: number; high: number } | null {
  if (structure.icMidZone) {
    return structure.icMidZone;
  }
  if (structure.midPrice != null && atr14 != null) {
    return {
      low: structure.midPrice - atr14,
      high: structure.midPrice + atr14,
    };
  }
  return null;
}

function formatAdjustedMidZone(
  structure: ScannerTickerResult["structure"],
  atr14: number | null
): string {
  const zone = resolveAdjustedMidZone(structure, atr14);
  if (!zone) {
    return "—";
  }
  return `${zone.low.toFixed(2)} – ${zone.high.toFixed(2)}`;
}
