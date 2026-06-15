import type { OptionsStrategy } from "@/core/domain/types/options";
import type { NakedCreditStrategy } from "./strategy-kind";
import {
  calculate75PercentTpExitPriceUsd,
  calculateNetCreditUsd,
} from "./profit-target";
import { isNakedCreditStrategy } from "./strategy-kind";

const CONTRACT_MULTIPLIER = 100;

export interface NakedCreditMetrics {
  netCreditUsd: number;
  netCreditPerShare: number;
  maxProfitUsd: number;
  maxRiskUsd: number;
  breakevenUsd: number;
  tpExitPrice75Usd: number;
}

export interface NakedCreditInput {
  strategy: NakedCreditStrategy;
  strikeUsd: number;
  contracts: number;
  openPremiumUsd: number;
  openFeesUsd: number;
  /** Required for covered calls — shares tracked in Module 2. */
  manualMaxRiskUsd?: number;
}

export function calculateNakedCreditMetrics(
  input: NakedCreditInput
): NakedCreditMetrics {
  const netCreditUsd = calculateNetCreditUsd(
    input.openPremiumUsd,
    input.openFeesUsd
  );
  const netCreditPerShare =
    netCreditUsd / (input.contracts * CONTRACT_MULTIPLIER);
  const maxProfitUsd = netCreditUsd;
  const assignmentWidthUsd =
    input.strikeUsd * CONTRACT_MULTIPLIER * input.contracts;
  const maxRiskUsd =
    input.strategy === "sellCall"
      ? input.manualMaxRiskUsd ?? 0
      : assignmentWidthUsd - netCreditUsd;
  const breakevenUsd =
    input.strategy === "sellPut"
      ? input.strikeUsd - netCreditPerShare
      : input.strikeUsd + netCreditPerShare;

  return {
    netCreditUsd,
    netCreditPerShare,
    maxProfitUsd,
    maxRiskUsd,
    breakevenUsd,
    tpExitPrice75Usd: calculate75PercentTpExitPriceUsd(netCreditUsd),
  };
}

export function validateNakedCreditStrike(
  strategy: NakedCreditStrategy,
  strikeUsd: number
): string | null {
  if (!Number.isFinite(strikeUsd) || strikeUsd <= 0) {
    return strategy === "sellPut"
      ? "Put strike must be greater than zero"
      : "Call strike must be greater than zero";
  }
  return null;
}

export function resolveNakedCreditStrikeFromTrade(
  strategy: OptionsStrategy,
  shortStrikeUsd?: number
): number | null {
  if (!isNakedCreditStrategy(strategy)) return null;
  if (shortStrikeUsd == null || !Number.isFinite(shortStrikeUsd)) return null;
  return shortStrikeUsd;
}
