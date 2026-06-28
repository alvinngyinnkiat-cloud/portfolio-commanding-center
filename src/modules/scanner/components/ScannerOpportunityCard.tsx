"use client";

import { useState, type ReactNode } from "react";
import type {
  ScannerTickerResult,
  StrategyOutput,
} from "@/core/domain/types/scanner";
import { STRATEGY_LABELS, STRATEGY_OUTPUT_LABELS } from "@/core/domain/types/scanner";
import { buildSuggestedTradeFromResult } from "@/core/calculations/scanner/suggested-trade";
import { buildEmaSuggestedTrade } from "@/core/calculations/scanner/ema-suggested-trade";
import { Card } from "@/shared/components/ui/Card";
import { formatUsd } from "@/shared/lib/format";
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
          <ChartColumn result={result} />
          <EarlyReversalPanel result={result} />
          <MainStrategyPanel result={result} />
        </div>

        {expanded && <ExpandedDetails result={result} />}
      </div>
    </Card>
  );
}

function ChartColumn({ result }: { result: ScannerTickerResult }) {
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
    </div>
  );
}

function MainStrategyPanel({ result }: { result: ScannerTickerResult }) {
  const { indicators, mainSystem } = result;
  const output = mainSystem.output;
  const reasons = getMainCardReasons(result);

  return (
    <StrategyPanel
      title="Main System"
      output={output}
      metrics={
        <>
          <Metric label="Structure" value={indicators.marketStructure} />
          <Metric label="Momentum" value={indicators.momentum} />
          <Metric label="SO Value" value={formatNum(indicators.so, 2)} />
          <Metric label="SO Status" value={indicators.soStatus} />
          <Metric label="Average Price" value={formatNum(indicators.avgPrice)} />
        </>
      }
    >
      <ul className="space-y-1.5">
        {reasons.map((reason) => (
          <li
            key={reason}
            className="flex gap-2 text-xs text-slate-400 before:shrink-0 before:content-['•']"
          >
            {reason}
          </li>
        ))}
      </ul>
    </StrategyPanel>
  );
}

function EarlyReversalPanel({ result }: { result: ScannerTickerResult }) {
  const { emaStrategy, indicators } = result;
  const emaTrade = buildEmaSuggestedTrade({
    output: emaStrategy.output,
    ema20: indicators.ema20,
    atr14: indicators.atr14,
    currentPrice: result.currentPrice,
  });

  const emaDiffDisplay =
    indicators.emaDiffPct != null
      ? `${indicators.emaDiffPct >= 0 ? "+" : ""}${indicators.emaDiffPct.toFixed(2)}%`
      : "—";

  return (
    <StrategyPanel
      title="20 EMA Early Reversal"
      output={emaStrategy.output}
      metrics={
        <>
          <Metric label="EMA20" value={formatNum(indicators.ema20)} />
          <Metric label="Average Price" value={formatNum(indicators.avgPrice)} />
          <Metric label="SMA200" value={formatNum(indicators.sma200)} />
          <Metric label="SO Status" value={indicators.soStatus} />
          <Metric label="EMA Difference" value={emaDiffDisplay} />
        </>
      }
    >
      <Checklist items={emaStrategy.checklist} compact />

      {emaStrategy.reasons.length > 0 && emaStrategy.output === "NO TRADE" && (
        <ul className="mt-3 space-y-1.5">
          {emaStrategy.reasons.map((reason) => (
            <li
              key={reason}
              className="flex gap-2 text-xs text-slate-400 before:shrink-0 before:content-['•']"
            >
              {reason}
            </li>
          ))}
        </ul>
      )}

      {emaStrategy.output !== "NO TRADE" && emaStrategy.output !== "IRON CONDOR" && (
        <div className="mt-3 rounded-lg border border-surface-border/50 bg-surface/40 px-3 py-2 text-xs text-slate-400">
          <p className="font-medium text-slate-300">Suggested Trade</p>
          <p className="mt-1 tabular-nums">
            {emaTrade.shortStrike} / {emaTrade.longStrike}
            {emaTrade.width != null ? ` · Width ${emaTrade.width}` : ""}
            {emaTrade.estimatedPremium != null
              ? ` · Premium ${emaTrade.estimatedPremium}`
              : ""}
          </p>
        </div>
      )}
    </StrategyPanel>
  );
}

function StrategyPanel({
  title,
  output,
  metrics,
  children,
}: {
  title: string;
  output: StrategyOutput;
  metrics: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-surface-border/70 bg-surface/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div
        className={`mt-4 block w-full rounded-xl border px-4 py-4 text-center text-xl font-extrabold tracking-wide sm:text-2xl ${OUTPUT_STYLES[output]}`}
      >
        {STRATEGY_OUTPUT_LABELS[output]}
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 text-sm sm:gap-3">
        {metrics}
      </div>

      <div className="mt-4 min-w-0">{children}</div>
    </div>
  );
}

function getMainCardReasons(result: ScannerTickerResult): string[] {
  const { mainSystem } = result;

  if (mainSystem.output === "NO TRADE") {
    return formatNoTradeMainCardReasons(result);
  }

  if (mainSystem.reasons.length > 0) {
    return mainSystem.reasons;
  }

  return buildFallbackMainCardReasons(result);
}

function formatNoTradeMainCardReasons(result: ScannerTickerResult): string[] {
  const { indicators, mainSystem } = result;
  const seen = new Set<string>();
  const reasons: string[] = [];

  const add = (line: string) => {
    if (!seen.has(line)) {
      seen.add(line);
      reasons.push(line);
    }
  };

  for (const reason of mainSystem.reasons) {
    const simplified = simplifyNoTradeReason(reason, indicators);
    if (simplified) {
      add(simplified);
    }
  }

  if (reasons.length === 0) {
    add(`Structure ${indicators.marketStructure}`);
    add(`Momentum ${indicators.momentum}`);
    if (indicators.soStatus !== "Rolling Up") {
      add("SO not Rolling Up");
    }
    if (indicators.soStatus !== "Rolling Down") {
      add("SO not Rolling Down");
    }
  }

  return reasons.slice(0, 6);
}

function simplifyNoTradeReason(
  reason: string,
  indicators: ScannerTickerResult["indicators"]
): string | null {
  if (reason.includes("Bullish Structure = No")) {
    return `Structure ${indicators.marketStructure}`;
  }
  if (reason.includes("Bearish Structure = No")) {
    return `Structure ${indicators.marketStructure}`;
  }
  if (reason.includes("Momentum Above EMA = No")) {
    return `Momentum ${indicators.momentum}`;
  }
  if (reason.includes("Momentum Below EMA = No")) {
    return `Momentum ${indicators.momentum}`;
  }
  if (reason.includes("SO Rolling Up = No")) {
    return "SO not Rolling Up";
  }
  if (reason.includes("SO Rolling Down = No")) {
    return "SO not Rolling Down";
  }
  if (reason.includes("SO 40–60 = No") || reason.includes("SO 40-60 = No")) {
    return "SO outside 40–60";
  }
  if (reason.includes("Adjusted Mid Zone = No")) {
    return "Average Price outside Adjusted Mid Zone";
  }
  if (reason.includes("Current Average Price > Previous Average Price = No")) {
    return "Average Price not rising";
  }
  if (reason.includes("Current Average Price < Previous Average Price = No")) {
    return "Average Price not falling";
  }
  if (reason.includes("Sell Put conditions not fully satisfied = No")) {
    return null;
  }
  if (reason.includes("Sell Call conditions not fully satisfied = No")) {
    return null;
  }
  return reason;
}

function buildFallbackMainCardReasons(result: ScannerTickerResult): string[] {
  const { indicators } = result;
  return [
    `Structure ${indicators.marketStructure}`,
    `Momentum ${indicators.momentum}`,
    `SO Status: ${indicators.soStatus}`,
    `SO Value: ${formatNum(indicators.so, 2)}`,
  ];
}

function ExpandedDetails({ result }: { result: ScannerTickerResult }) {
  const { structure, indicators } = result;
  const soDebug = indicators.soDebug;
  const atrDebug = indicators.atrDebug;
  const suggestedTrade =
    result.mainSystem.strategy != null
      ? buildSuggestedTradeFromResult(result, result.mainSystem.strategy)
      : null;

  return (
    <div className="space-y-5 border-t border-surface-border/60 pt-5">
      <DetailSection title="SO Validation">
        <DetailGrid
          items={[
            ["Current SO", formatNum(indicators.so, 2)],
            ["Previous SO", formatNum(indicators.soPrev, 2)],
            ["SO Status", indicators.soStatus],
            ["Scanner SO Used", formatNum(soDebug?.scannerSoUsed ?? indicators.so, 2)],
          ]}
        />
        {soDebug && (
          <div className="mt-4 space-y-3">
            <DetailGrid
              items={[
                ["Session Date", soDebug.sessionDate ?? "—"],
                ["Lowest Low (10)", formatNum(soDebug.lowestLow10, 2)],
                ["Highest High (10)", formatNum(soDebug.highestHigh10, 2)],
                ["Raw %K", formatNum(soDebug.rawK, 2)],
                ["Smoothed %K (3 SMA)", formatNum(soDebug.smoothedK3, 2)],
                [
                  "Previous Smoothed %K",
                  formatNum(soDebug.previousSmoothedK3, 2),
                ],
              ]}
            />
            <SoWindowTable label="Last 10 Highs" values={soDebug.last10Highs} />
            <SoWindowTable label="Last 10 Lows" values={soDebug.last10Lows} />
            <SoWindowTable label="Last 10 Closes" values={soDebug.last10Closes} />
          </div>
        )}
      </DetailSection>

      <DetailSection title="ATR Validation">
        <DetailGrid
          items={[
            ["ATR14", formatNum(indicators.atr14, 2)],
            ["ATR Method", atrDebug?.method ?? "RMA / Wilder"],
            ["Scanner ATR Used", formatNum(atrDebug?.scannerAtrUsed ?? indicators.atr14, 2)],
          ]}
        />
        {atrDebug && atrDebug.last14TrueRanges.length > 0 && (
          <div className="mt-4">
            <SoWindowTable
              label="Last 14 True Range Values"
              values={atrDebug.last14TrueRanges}
            />
          </div>
        )}
      </DetailSection>

      <DetailSection title="Market Structure">
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

      <DetailSection title="Trend Structure">
        <DetailGrid
          items={[
            ["Structure", indicators.marketStructure],
            ["Momentum", indicators.momentum],
          ]}
        />
      </DetailSection>

      <DetailSection title="Indicators">
        <DetailGrid
          items={[
            ["Current Average Price", formatNum(indicators.avgPrice)],
            ["Previous Average Price", formatNum(indicators.avgPricePrev)],
            ["EMA20", formatNum(indicators.ema20)],
            ["SMA50", formatNum(indicators.sma50)],
            ["SMA200", formatNum(indicators.sma200)],
            ["Market Date Used", result.priceAsOf ?? "—"],
          ]}
        />
      </DetailSection>

      <DetailSection title="Display Only">
        <p className="mb-3 text-xs text-slate-500">
          These metrics are for reference only and do not influence strategy decisions.
        </p>
        <DetailGrid
          items={[
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
              "Adjusted Mid Zone",
              formatAdjustedMidZone(structure, indicators.atr14),
            ],
            [
              "Sell Call Zone",
              structure.sellCallRange
                ? `${structure.sellCallRange.low.toFixed(2)} → ${structure.sellCallRange.high.toFixed(2)}`
                : "—",
            ],
          ]}
        />
      </DetailSection>

      <DetailSection title="Suggested Trade (Main System)">
        {suggestedTrade ? (
          <DetailGrid
            items={[
              ["Strategy", STRATEGY_LABELS[result.mainSystem.strategy!]],
              ["Trade", suggestedTrade.tradeDisplay],
              ["Width", suggestedTrade.width != null ? String(suggestedTrade.width) : "—"],
              [
                "Target Premium",
                suggestedTrade.targetPremium != null
                  ? String(suggestedTrade.targetPremium)
                  : "—",
              ],
              [
                "Max Risk",
                suggestedTrade.maxRiskUsd != null
                  ? formatUsd(suggestedTrade.maxRiskUsd)
                  : "—",
              ],
            ]}
          />
        ) : (
          <p className="text-sm text-slate-500">No eligible strategy — suggested trade unavailable.</p>
        )}
      </DetailSection>

      {result.mainSystem.strategy ? (
        <DetailSection title="Main System Checklist">
          <p className="mb-3 text-sm text-slate-400">
            {STRATEGY_LABELS[result.mainSystem.strategy]} —{" "}
            {result.strategies[result.mainSystem.strategy].eligible
              ? "Eligible"
              : "Not eligible"}
          </p>
          <Checklist
            items={result.strategies[result.mainSystem.strategy].checklist}
          />
        </DetailSection>
      ) : (
        <DetailSection title="Main System Checklist">
          <p className="mb-3 text-sm text-slate-400">No eligible strategy</p>
          {(["bullPut", "bearCall", "ironCondor"] as const).map((strategy) => (
            <div key={strategy} className="mb-4 last:mb-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {STRATEGY_LABELS[strategy]}
              </p>
              <Checklist items={result.strategies[strategy].checklist} />
            </div>
          ))}
        </DetailSection>
      )}

      <DetailSection title="Suggested Trade (20 EMA Early Reversal)">
        <EmaSuggestedTradeDetails result={result} />
      </DetailSection>

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

function EmaSuggestedTradeDetails({ result }: { result: ScannerTickerResult }) {
  const { emaStrategy, indicators } = result;
  const emaTrade = buildEmaSuggestedTrade({
    output: emaStrategy.output,
    ema20: indicators.ema20,
    atr14: indicators.atr14,
    currentPrice: result.currentPrice,
  });

  if (emaStrategy.output === "NO TRADE" || emaStrategy.output === "IRON CONDOR") {
    return (
      <p className="text-sm text-slate-500">
        No early reversal signal — suggested trade unavailable.
      </p>
    );
  }

  return (
    <DetailGrid
      items={[
        ["EMA20", formatNum(emaTrade.ema20)],
        ["ATR14", formatNum(emaTrade.atr14)],
        ["Short Strike", emaTrade.shortStrike != null ? String(emaTrade.shortStrike) : "—"],
        ["Long Strike", emaTrade.longStrike != null ? String(emaTrade.longStrike) : "—"],
        ["Width", emaTrade.width != null ? String(emaTrade.width) : "—"],
        [
          "Estimated Premium",
          emaTrade.estimatedPremium != null ? String(emaTrade.estimatedPremium) : "—",
        ],
      ]}
    />
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

const LEGACY_TREND_LABELS: Record<string, string> = {
  "Trend Bullish": "Bullish Structure",
  "Trend Bearish": "Bearish Structure",
  "Trend Neutral": "Neutral Structure",
};

function normalizeChecklistLabel(label: string): string {
  return LEGACY_TREND_LABELS[label] ?? label;
}

function Checklist({
  items,
  compact = false,
}: {
  items: Array<{
    label: string;
    passed: boolean;
    detail: string;
    informationOnly?: boolean;
  }>;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No checklist items available.</p>;
  }

  const textSize = compact ? "text-xs" : "text-sm";
  const padding = compact ? "px-2 py-1.5" : "px-3 py-2";

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface/50 ${padding} ${textSize}`}
        >
          <span className="min-w-0 text-slate-300">
            {item.informationOnly ? (
              <>
                {item.passed ? "✓" : "○"} {normalizeChecklistLabel(item.label)}
              </>
            ) : (
              <>
                {item.passed ? "✓" : "✗"} {normalizeChecklistLabel(item.label)}
              </>
            )}
          </span>
          <span className="shrink-0 text-right text-slate-400">{item.detail}</span>
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

function SoWindowTable({ label, values }: { label: string; values: number[] }) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="overflow-x-auto rounded-lg border border-surface-border/60">
        <table className="min-w-full text-xs">
          <thead className="bg-surface/50 text-slate-500">
            <tr>
              {values.map((_, index) => (
                <th key={index} className="px-2 py-1.5 text-right font-medium">
                  {index + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="text-slate-200">
              {values.map((value, index) => (
                <td key={index} className="px-2 py-1.5 text-right tabular-nums">
                  {value.toFixed(2)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
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
