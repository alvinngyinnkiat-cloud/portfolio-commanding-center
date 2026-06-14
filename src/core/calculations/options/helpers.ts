import type {
  OptionsIronCondorMetrics,
  OptionsStrategy,
  OptionsTrade,
  OptionsVerticalSpreadMetrics,
} from "@/core/domain/types/options";
import {
  calculateIronCondorMetrics,
  isIronCondorStrategy,
} from "./iron-condor";
import {
  calculateVerticalSpreadMetrics,
  isVerticalSpreadStrategy,
} from "./vertical-spread";

const STRATEGY_LABELS: Record<Exclude<OptionsStrategy, "custom">, string> = {
  bullPut: "Bull Put",
  bearCall: "Bear Call",
  ironCondor: "Iron Condor",
};

export function formatOptionsStrategy(
  strategy: OptionsStrategy,
  strategyLabel?: string
): string {
  if (strategy === "custom") {
    return strategyLabel?.trim() || "Custom";
  }
  return STRATEGY_LABELS[strategy];
}

export function normalizeUnderlying(value: string): string {
  return value.trim().toUpperCase();
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00`);
  const end = Date.parse(`${endDate}T00:00:00`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function daysToExpiration(expirationDate: string, asOfDate?: string): number {
  const today = asOfDate ?? new Date().toISOString().slice(0, 10);
  return daysBetween(today, expirationDate);
}

export function sumRealizedOptionsPlUsd(trades: OptionsTrade[]): number {
  /** Full realized P/L hits US Available Cash; client leg is reporting only. */
  let total = 0;
  for (const trade of trades) {
    if (trade.status !== "closed") continue;
    if (trade.realizedPlUsd == null) continue;
    total += trade.realizedPlUsd;
  }
  return total;
}

export function buildVerticalSpreadMetricsFromTrade(
  trade: OptionsTrade
): OptionsVerticalSpreadMetrics | null {
  if (!isVerticalSpreadStrategy(trade.strategy)) return null;
  if (trade.shortStrikeUsd == null || trade.longStrikeUsd == null) return null;

  return calculateVerticalSpreadMetrics({
    strategy: trade.strategy,
    shortStrikeUsd: trade.shortStrikeUsd,
    longStrikeUsd: trade.longStrikeUsd,
    contracts: trade.contracts,
    openPremiumUsd: trade.openPremiumUsd,
    openFeesUsd: trade.openFeesUsd,
  });
}

export function buildIronCondorMetricsFromTrade(
  trade: OptionsTrade
): OptionsIronCondorMetrics | null {
  if (!isIronCondorStrategy(trade.strategy)) return null;
  if (
    trade.bullPutShortStrikeUsd == null ||
    trade.bullPutLongStrikeUsd == null ||
    trade.bearCallShortStrikeUsd == null ||
    trade.bearCallLongStrikeUsd == null
  ) {
    return null;
  }

  return calculateIronCondorMetrics({
    bullPutShortStrikeUsd: trade.bullPutShortStrikeUsd,
    bullPutLongStrikeUsd: trade.bullPutLongStrikeUsd,
    bearCallShortStrikeUsd: trade.bearCallShortStrikeUsd,
    bearCallLongStrikeUsd: trade.bearCallLongStrikeUsd,
    contracts: trade.contracts,
    openPremiumUsd: trade.openPremiumUsd,
    openFeesUsd: trade.openFeesUsd,
  });
}

export function formatTradeStrikes(trade: OptionsTrade): string {
  if (isIronCondorStrategy(trade.strategy)) {
    if (
      trade.bullPutShortStrikeUsd == null ||
      trade.bullPutLongStrikeUsd == null ||
      trade.bearCallShortStrikeUsd == null ||
      trade.bearCallLongStrikeUsd == null
    ) {
      return "—";
    }
    return `BP ${trade.bullPutShortStrikeUsd}/${trade.bullPutLongStrikeUsd} · BC ${trade.bearCallShortStrikeUsd}/${trade.bearCallLongStrikeUsd}`;
  }

  if (trade.shortStrikeUsd != null && trade.longStrikeUsd != null) {
    return `${trade.shortStrikeUsd} / ${trade.longStrikeUsd}`;
  }

  return "—";
}
