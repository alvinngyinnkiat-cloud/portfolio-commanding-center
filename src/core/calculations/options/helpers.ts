import type {
  OptionsIronCondorMetrics,
  OptionsStrategy,
  OptionsTrade,
  OptionsVerticalSpreadMetrics,
} from "@/core/domain/types/options";
import { getTradeTotalRealizedPlUsd } from "./contract-tracking";
import {
  calculateIronCondorMetrics,
  isIronCondorStrategy,
} from "./iron-condor";
import {
  calculateVerticalSpreadMetrics,
  isVerticalSpreadStrategy,
} from "./vertical-spread";
import { optionsDaysBetween, optionsDaysToExpiration } from "./trade-dates";

const STRATEGY_LABELS: Record<Exclude<OptionsStrategy, "custom">, string> = {
  sellPut: "SELL PUT",
  sellCall: "SELL CALL",
  bullPut: "BULL PUT",
  bearCall: "BEAR CALL",
  ironCondor: "IRON CONDOR",
  buyCall: "BUY CALL",
  buyPut: "BUY PUT",
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
  return optionsDaysBetween(startDate, endDate);
}

export function daysToExpiration(expirationDate: string, asOfDate?: string): number {
  return optionsDaysToExpiration(expirationDate, asOfDate);
}

export function sumRealizedOptionsPlUsd(trades: OptionsTrade[]): number {
  /** Performance reporting only — USD cash uses open/close cash flows via Shared USD Cash Engine. */
  let total = 0;
  for (const trade of trades) {
    total += getTradeTotalRealizedPlUsd(trade);
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

  if (isVerticalSpreadStrategy(trade.strategy)) {
    if (trade.shortStrikeUsd != null && trade.longStrikeUsd != null) {
      return `${trade.shortStrikeUsd} / ${trade.longStrikeUsd}`;
    }
    return "—";
  }

  if (trade.strategy === "sellPut" || trade.strategy === "sellCall") {
    return trade.shortStrikeUsd != null ? String(trade.shortStrikeUsd) : "—";
  }

  if (trade.strategy === "buyCall" || trade.strategy === "buyPut") {
    return trade.longStrikeUsd != null ? String(trade.longStrikeUsd) : "—";
  }

  return "—";
}
