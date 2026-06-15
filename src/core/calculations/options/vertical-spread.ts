import type { OptionsStrategy } from "@/core/domain/types/options";
import {
  calculate75PercentTpExitPriceUsd,
  calculateNetCreditUsd,
} from "./profit-target";

const CONTRACT_MULTIPLIER = 100;

export type VerticalSpreadStrategy = "bullPut" | "bearCall";

export interface VerticalSpreadInput {
  strategy: VerticalSpreadStrategy;
  shortStrikeUsd: number;
  longStrikeUsd: number;
  contracts: number;
  openPremiumUsd: number;
  openFeesUsd: number;
}

export interface VerticalSpreadMetrics {
  widthPerShare: number;
  spreadWidthUsd: number;
  netCreditUsd: number;
  maxProfitUsd: number;
  maxRiskUsd: number;
  breakevenUsd: number;
  tpExitPrice75Usd: number;
}

export function isVerticalSpreadStrategy(
  strategy: OptionsStrategy
): strategy is VerticalSpreadStrategy {
  return strategy === "bullPut" || strategy === "bearCall";
}

/** Per-share width for a credit vertical spread. */
export function calculateVerticalSpreadWidthPerShare(
  strategy: VerticalSpreadStrategy,
  shortStrikeUsd: number,
  longStrikeUsd: number
): number {
  if (strategy === "bullPut") {
    return shortStrikeUsd - longStrikeUsd;
  }
  return longStrikeUsd - shortStrikeUsd;
}

export function calculateVerticalSpreadMetrics(
  input: VerticalSpreadInput
): VerticalSpreadMetrics {
  const widthPerShare = calculateVerticalSpreadWidthPerShare(
    input.strategy,
    input.shortStrikeUsd,
    input.longStrikeUsd
  );
  const spreadWidthUsd = widthPerShare * CONTRACT_MULTIPLIER * input.contracts;
  const netCreditUsd = calculateNetCreditUsd(
    input.openPremiumUsd,
    input.openFeesUsd
  );
  const maxProfitUsd = netCreditUsd;
  const maxRiskUsd = spreadWidthUsd - netCreditUsd;
  const netCreditPerShare = netCreditUsd / (input.contracts * CONTRACT_MULTIPLIER);
  const breakevenUsd =
    input.strategy === "bullPut"
      ? input.shortStrikeUsd - netCreditPerShare
      : input.shortStrikeUsd + netCreditPerShare;

  return {
    widthPerShare,
    spreadWidthUsd,
    netCreditUsd,
    maxProfitUsd,
    maxRiskUsd,
    breakevenUsd,
    tpExitPrice75Usd: calculate75PercentTpExitPriceUsd(netCreditUsd),
  };
}

export function validateVerticalSpreadStrikes(
  strategy: VerticalSpreadStrategy,
  shortStrikeUsd: number,
  longStrikeUsd: number
): string | null {
  if (!Number.isFinite(shortStrikeUsd) || shortStrikeUsd <= 0) {
    return "Short strike must be greater than zero";
  }
  if (!Number.isFinite(longStrikeUsd) || longStrikeUsd <= 0) {
    return "Long strike must be greater than zero";
  }
  if (strategy === "bullPut" && shortStrikeUsd <= longStrikeUsd) {
    return "Bull put: short strike must be above long strike";
  }
  if (strategy === "bearCall" && longStrikeUsd <= shortStrikeUsd) {
    return "Bear call: long strike must be above short strike";
  }
  return null;
}
