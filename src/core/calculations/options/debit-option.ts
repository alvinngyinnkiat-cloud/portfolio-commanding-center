import type { OptionsStrategy } from "@/core/domain/types/options";
import type { DebitOptionStrategy } from "./strategy-kind";
import { calculateOptionDollarValue } from "./open-trade-display";
import { isDebitStrategy } from "./strategy-kind";

const CONTRACT_MULTIPLIER = 100;

export interface DebitOptionMetrics {
  premiumPaidPerShare: number;
  premiumCostUsd: number;
  maxRiskUsd: number;
  breakevenUsd: number;
  tpExitPrice75Usd: number;
}

export interface DebitOptionInput {
  strategy: DebitOptionStrategy;
  strikeUsd: number;
  contracts: number;
  openPremiumUsd: number;
  openFeesUsd: number;
}

export function calculatePremiumCostUsd(
  openPremiumUsd: number,
  openFeesUsd: number
): number {
  return openPremiumUsd + openFeesUsd;
}

export function calculatePremiumPaidPerShare(
  openPremiumUsd: number,
  contracts: number
): number {
  if (!Number.isFinite(openPremiumUsd) || contracts <= 0) return 0;
  return openPremiumUsd / (contracts * CONTRACT_MULTIPLIER);
}

export function calculateDebit75TpExitPriceUsd(
  premiumPaidPerShare: number,
  contracts: number
): number {
  return calculateOptionDollarValue(premiumPaidPerShare * 1.75, contracts);
}

export function calculateDebitOptionMetrics(
  input: DebitOptionInput
): DebitOptionMetrics {
  const premiumPaidPerShare = calculatePremiumPaidPerShare(
    input.openPremiumUsd,
    input.contracts
  );
  const premiumCostUsd = calculatePremiumCostUsd(
    input.openPremiumUsd,
    input.openFeesUsd
  );
  const breakevenUsd =
    input.strategy === "buyCall"
      ? input.strikeUsd + premiumPaidPerShare
      : input.strikeUsd - premiumPaidPerShare;

  return {
    premiumPaidPerShare,
    premiumCostUsd,
    maxRiskUsd: premiumCostUsd,
    breakevenUsd,
    tpExitPrice75Usd: calculateDebit75TpExitPriceUsd(
      premiumPaidPerShare,
      input.contracts
    ),
  };
}

export function calculateBuyPutMaxProfitUsd(
  strikeUsd: number,
  openPremiumUsd: number,
  contracts: number
): number {
  return strikeUsd * CONTRACT_MULTIPLIER * contracts - openPremiumUsd;
}

export function validateDebitOptionStrike(
  strategy: DebitOptionStrategy,
  strikeUsd: number
): string | null {
  if (!Number.isFinite(strikeUsd) || strikeUsd <= 0) {
    return strategy === "buyCall"
      ? "Call strike must be greater than zero"
      : "Put strike must be greater than zero";
  }
  return null;
}

export function resolveDebitStrikeFromTrade(
  strategy: OptionsStrategy,
  longStrikeUsd?: number
): number | null {
  if (!isDebitStrategy(strategy)) return null;
  if (longStrikeUsd == null || !Number.isFinite(longStrikeUsd)) return null;
  return longStrikeUsd;
}
