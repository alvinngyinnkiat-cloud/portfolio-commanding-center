"use client";

import { useState, type ReactNode } from "react";
import type {
  ScannerTickerResult,
  StrategyOutput,
} from "@/core/domain/types/scanner";
import type { MarketDataRecord } from "@/core/domain/types/market-data";
import type { ScannerTickerDataStatus } from "@/core/calculations/scanner/scanner-ticker-records";
import { STRATEGY_LABELS, STRATEGY_OUTPUT_LABELS } from "@/core/domain/types/scanner";
import { buildSuggestedTradeFromResult } from "@/core/calculations/scanner/suggested-trade";
import { buildEmaSuggestedTrade } from "@/core/calculations/scanner/ema-suggested-trade";
import { Card } from "@/shared/components/ui/Card";
import { formatUsd } from "@/shared/lib/format";
import { useAlignedChartData } from "@/hooks/useAlignedChartData";
import { FiveDayCandlestickChart } from "./FiveDayCandlestickChart";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ScannerOpportunityCardProps {
  result: ScannerTickerResult;
  marketData?: MarketDataRecord | null;
  dataStatus?: ScannerTickerDataStatus;
  refreshedAt?: string | null;
}

const OUTPUT_STYLES: Record<StrategyOutput, string> = {
  "SELL PUT": "border-accent-green/40 bg-accent-green/10 text-accent-green",
  "SELL CALL": "border-accent-red/40 bg-accent-red/10 text-accent-red",
  "IRON CONDOR": "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  "NO TRADE": "border-surface-border bg-surface/60 text-slate-400",
};

export function ScannerOpportunityCard({
  result,
  marketData = null,
  dataStatus,
  refreshedAt,
}: ScannerOpportunityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const priceOnly = isPriceOnlyScannerResult(result);

  return (
    <Card noPadding className={`overflow-hidden ${result.tradable ? "" : "opacity-85"}`}>
      <div className="space-y-4 overflow-hidden p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {dataStatus && <TickerDataStatusBadge status={dataStatus} />}
          {priceOnly ? (
            <IndicatorStatusBadge status="insufficient_history" />
          ) : (
            <TradableBadge tradable={result.tradable} />
          )}
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1 rounded-lg border border-surface-border/80 px-3 py-1.5 text-xs font-medium text-accent hover:bg-surface/60"
          >
            View Details
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        <div className={`grid min-w-0 gap-4 ${priceOnly ? "lg:grid-cols-2" : "lg:grid-cols-3"} lg:gap-5`}>
          <ChartColumn
            result={result}
            marketData={marketData}
            refreshedAt={refreshedAt}
            dataStatus={dataStatus}
          />
          {priceOnly ? (
            <InsufficientHistoryPanel result={result} />
          ) : (
            <>
              <EarlyReversalPanel result={result} />
              <MainStrategyPanel result={result} />
            </>
          )}
        </div>

        {expanded && !priceOnly && <ExpandedDetails result={result} />}
      </div>
    </Card>
  );
}

function isPriceOnlyScannerResult(result: ScannerTickerResult): boolean {
  return (
    result.status === "price_only" ||
    result.indicatorStatus === "insufficient_history"
  );
}

function ChartColumn({
  result,
  marketData,
  refreshedAt,
  dataStatus,
}: {
  result: ScannerTickerResult;
  marketData: MarketDataRecord | null;
  refreshedAt?: string | null;
  dataStatus?: ScannerTickerDataStatus;
}) {
  const { structure, indicators } = result;
  const { chart: aligned, loading: chartLoading } = useAlignedChartData(result.ticker);

  const infoPrice = aligned?.currentPrice ?? marketData?.currentPrice ?? result.currentPrice;
  const infoSession =
    aligned?.marketSession ?? marketData?.marketSession ?? result.priceAsOf;
  const sharedPriceSource =
    aligned?.source ?? marketData?.priceSource ?? result.priceSource ?? "Daily close";
  const displayRefreshedAt =
    aligned?.refreshedAt ?? marketData?.refreshedAt ?? refreshedAt ?? null;

  return (
    <div className="min-w-0 space-y-4 overflow-hidden">
      <div>
        <p className="text-xl font-bold text-white">{result.ticker}</p>
        <p className="text-sm text-slate-500">{result.category}</p>
      </div>

      <div className="rounded-xl border border-surface-border/70 bg-surface/30 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Current Price
        </p>
        <p className="mt-1 text-lg font-bold text-white">
          {infoPrice != null ? formatUsd(infoPrice) : "—"}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Market session: {infoSession ?? "—"}
        </p>
        {(marketData?.priceStatus ?? result.priceStatus) && (
          <p className="mt-1 text-xs text-slate-400">
            Price status:{" "}
            <span className="capitalize text-slate-200">
              {marketData?.priceStatus ?? result.priceStatus}
            </span>
          </p>
        )}
        <p className="mt-1 text-[10px] text-slate-500">Source: {sharedPriceSource}</p>
        {displayRefreshedAt && (
          <p className="mt-1 text-[10px] text-slate-500">
            Refreshed: {formatScannerRefreshTime(displayRefreshedAt)}
          </p>
        )}
        {marketData?.isStale && (
          <p className="mt-1 text-[10px] text-yellow-400/90">
            Shared market data may be stale for this ticker.
          </p>
        )}
        {isPriceOnlyScannerResult(result) && (
          <div className="mt-3 space-y-1 border-t border-surface-border/50 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-300">
              Scanner status: Insufficient History
            </p>
            <p className="text-xs text-slate-400">
              Available: {result.candlesAvailable ?? 0} daily candles
            </p>
            <p className="text-xs text-slate-400">
              Required: enough candles for all configured indicators (
              {result.candlesRequired ?? 200})
            </p>
          </div>
        )}
        {dataStatus === "stale" && (
          <p className="mt-1 text-[10px] text-yellow-400/90">
            Current price may be stale — last refresh did not update this ticker.
          </p>
        )}
      </div>

      {chartLoading || !aligned ? (
        <div className="flex h-44 w-full items-center justify-center rounded-xl border border-surface-border/60 bg-surface/40 text-xs text-slate-500">
          {chartLoading ? "Loading chart…" : "No candle data"}
        </div>
      ) : (
        <FiveDayCandlestickChart
          candles={aligned.candles}
          avgPrice={aligned.currentAveragePrice ?? indicators.avgPrice}
          currentPriceUsd={aligned.showCurrentPriceLine ? aligned.currentPrice : null}
          showCurrentPriceLine={aligned.showCurrentPriceLine}
          ticker={result.ticker}
          sellPutZone={structure.sellPutRange}
          sellCallZone={structure.sellCallRange}
          icMidZone={resolveAdjustedMidZone(structure, indicators.atr14)}
        />
      )}
    </div>
  );
}

function MainStrategyPanel({ result }: { result: ScannerTickerResult }) {
  const { indicators, mainSystem } = result;
  const output = mainSystem.output;
  const checklist =
    mainSystem.strategy != null
      ? result.strategies[mainSystem.strategy].checklist
      : indicators.marketStructure === "Bullish"
        ? result.strategies.bullPut.checklist
        : indicators.marketStructure === "Bearish"
          ? result.strategies.bearCall.checklist
          : result.strategies.ironCondor.checklist;

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
      {output === "NO TRADE" && mainSystem.reasons.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Reasons
          </p>
          <ul className="space-y-1.5">
            {mainSystem.reasons.map((reason) => (
              <li
                key={reason}
                className="flex gap-2 text-xs text-slate-400 before:shrink-0 before:content-['•']"
              >
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Required Checklist
      </p>
      <Checklist items={checklist} compact />
    </StrategyPanel>
  );
}

function InsufficientHistoryPanel({ result }: { result: ScannerTickerResult }) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 lg:col-span-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Scanner Result
      </p>
      <div className="mt-4 rounded-xl border border-surface-border bg-surface/60 px-4 py-6 text-center">
        <p className="text-lg font-extrabold tracking-wide text-slate-300">
          NO SCANNER RESULT — INSUFFICIENT HISTORY
        </p>
        {result.indicatorError && (
          <p className="mt-3 text-sm text-slate-400">{result.indicatorError}</p>
        )}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Current Price remains available for Options and Income modules. Strategy
        indicators require more daily history.
      </p>
    </div>
  );
}

function IndicatorStatusBadge({
  status,
}: {
  status: "insufficient_history";
}) {
  return (
    <span className="inline-flex items-center rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-200">
      Indicators: Insufficient History
    </span>
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

  const primaryRow = emaStrategy.checklist.find(
    (item) => item.primaryStrategy != null
  );
  const requiredChecklist = emaStrategy.checklist.filter(
    (item) => !item.informationOnly
  );
  const marketContext = emaStrategy.marketContext ?? [];

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
      {primaryRow && (
        <div className="mb-3">
          <Checklist items={[primaryRow]} compact />
        </div>
      )}

      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Required Checklist
      </p>
      <Checklist items={requiredChecklist} compact />

      {marketContext.length > 0 && (
        <div className="mt-4 border-t border-surface-border/40 pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Market Context / Information Only
          </p>
          <Checklist items={marketContext} compact />
        </div>
      )}

      {emaStrategy.confidence != null && emaStrategy.contextNote && (
        <div className="mt-3 rounded-lg border border-surface-border/50 bg-surface/40 px-3 py-2 text-xs">
          <p className="font-medium text-slate-300">
            Confidence:{" "}
            <span
              className={
                emaStrategy.confidence === "High"
                  ? "text-accent-green"
                  : "text-yellow-400"
              }
            >
              {emaStrategy.confidence}
            </span>
          </p>
          <p className="mt-1 text-slate-400">{emaStrategy.contextNote}</p>
        </div>
      )}

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
            ["Current Price", result.currentPrice != null ? formatUsd(result.currentPrice) : "—"],
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

function TickerDataStatusBadge({ status }: { status: ScannerTickerDataStatus }) {
  const styles: Record<ScannerTickerDataStatus, string> = {
    fresh: "bg-emerald-500/15 text-emerald-300",
    stale: "bg-yellow-500/15 text-yellow-200",
    failed: "bg-red-500/15 text-red-300",
    missing: "bg-slate-500/15 text-slate-300",
    fallback: "bg-sky-500/15 text-sky-200",
  };

  const labels: Record<ScannerTickerDataStatus, string> = {
    fresh: "Fresh",
    stale: "Stale",
    failed: "Failed",
    missing: "Missing",
    fallback: "Fallback used",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
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
    primaryStrategy?: "SELL PUT" | "SELL CALL" | "NEUTRAL";
    comparisonDetail?: string;
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
            {item.primaryStrategy != null ? (
              <>
                ○ {normalizeChecklistLabel(item.label)}:{" "}
                <span className="font-medium text-white">{item.primaryStrategy}</span>
              </>
            ) : item.informationOnly ? (
              <>
                {item.passed ? "✓" : "○"} {normalizeChecklistLabel(item.label)}
              </>
            ) : (
              <>
                {item.passed ? "✓" : "✗"} {normalizeChecklistLabel(item.label)}
              </>
            )}
          </span>
          <span className="shrink-0 text-right text-slate-400">
            {item.comparisonDetail ?? item.detail}
          </span>
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

function formatScannerRefreshTime(iso: string): string {
  return `${new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(",", "")} SGT`;
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
