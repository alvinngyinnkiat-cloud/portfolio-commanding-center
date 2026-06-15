import type { OptionsTrade } from "@/core/domain/types/options";
import { calculateDebitOptionMetrics, resolveDebitStrikeFromTrade } from "./debit-option";
import { buildIronCondorMetricsFromTrade, buildVerticalSpreadMetricsFromTrade } from "./helpers";
import {
  calculateNakedCreditMetrics,
  resolveNakedCreditStrikeFromTrade,
} from "./naked-credit";
import { isIronCondorStrategy } from "./iron-condor";
import { isDebitStrategy, isNakedCreditStrategy } from "./strategy-kind";
import { isVerticalSpreadStrategy } from "./vertical-spread";

export interface OptionsTradeEconomics {
  isDebit: boolean;
  netCreditUsd: number | null;
  premiumCostUsd: number | null;
  maxProfitUsd: number | null;
  maxRiskUsd: number;
  breakevenUsd: number | null;
  lowerBreakevenUsd?: number;
  upperBreakevenUsd?: number;
  tpExitPrice75Usd: number;
}

export function buildTradeEconomicsFromTrade(
  trade: OptionsTrade
): OptionsTradeEconomics | null {
  if (isVerticalSpreadStrategy(trade.strategy)) {
    const metrics = buildVerticalSpreadMetricsFromTrade(trade);
    if (!metrics) return null;
    return {
      isDebit: false,
      netCreditUsd: metrics.netCreditUsd,
      premiumCostUsd: null,
      maxProfitUsd: metrics.maxProfitUsd,
      maxRiskUsd: metrics.maxRiskUsd,
      breakevenUsd: metrics.breakevenUsd,
      tpExitPrice75Usd: metrics.tpExitPrice75Usd,
    };
  }

  if (isIronCondorStrategy(trade.strategy)) {
    const metrics = buildIronCondorMetricsFromTrade(trade);
    if (!metrics) return null;
    return {
      isDebit: false,
      netCreditUsd: metrics.netCreditUsd,
      premiumCostUsd: null,
      maxProfitUsd: metrics.maxProfitUsd,
      maxRiskUsd: metrics.maxRiskUsd,
      breakevenUsd: null,
      lowerBreakevenUsd: metrics.lowerBreakevenUsd,
      upperBreakevenUsd: metrics.upperBreakevenUsd,
      tpExitPrice75Usd: metrics.tpExitPrice75Usd,
    };
  }

  if (isNakedCreditStrategy(trade.strategy)) {
    const strike = resolveNakedCreditStrikeFromTrade(
      trade.strategy,
      trade.shortStrikeUsd
    );
    if (strike == null) return null;
    const metrics = calculateNakedCreditMetrics({
      strategy: trade.strategy,
      strikeUsd: strike,
      contracts: trade.contracts,
      openPremiumUsd: trade.openPremiumUsd,
      openFeesUsd: trade.openFeesUsd,
      manualMaxRiskUsd: trade.maxRiskUsd,
    });
    return {
      isDebit: false,
      netCreditUsd: metrics.netCreditUsd,
      premiumCostUsd: null,
      maxProfitUsd: metrics.maxProfitUsd,
      maxRiskUsd: trade.maxRiskUsd,
      breakevenUsd: metrics.breakevenUsd,
      tpExitPrice75Usd: metrics.tpExitPrice75Usd,
    };
  }

  if (isDebitStrategy(trade.strategy)) {
    const strike = resolveDebitStrikeFromTrade(trade.strategy, trade.longStrikeUsd);
    if (strike == null) return null;
    const metrics = calculateDebitOptionMetrics({
      strategy: trade.strategy,
      strikeUsd: strike,
      contracts: trade.contracts,
      openPremiumUsd: trade.openPremiumUsd,
      openFeesUsd: trade.openFeesUsd,
    });
    return {
      isDebit: true,
      netCreditUsd: null,
      premiumCostUsd: metrics.premiumCostUsd,
      maxProfitUsd: null,
      maxRiskUsd: metrics.maxRiskUsd,
      breakevenUsd: metrics.breakevenUsd,
      tpExitPrice75Usd: metrics.tpExitPrice75Usd,
    };
  }

  return null;
}
