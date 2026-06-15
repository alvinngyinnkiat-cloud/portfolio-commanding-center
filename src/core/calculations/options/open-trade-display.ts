import type {
  OptionsIronCondorMetrics,
  OptionsOpenTradeRow,
  OptionsStrategy,
  OptionsVerticalSpreadMetrics,
} from "@/core/domain/types/options";
import { scaleMaxRiskForRemaining } from "./contract-tracking";
export const OPTION_CONTRACT_MULTIPLIER = 100;

export interface BreakevenDifference {
  differenceUsd: number;
  differencePercent: number;
  /** Iron condor wing buffers — populated for iron condor only. */
  lowerBufferUsd?: number;
  upperBufferUsd?: number;
  /** Iron condor — which wing supplies the displayed smaller buffer. */
  activeSide?: "lower" | "upper";
  /** True when the displayed buffer is negative (breached). */
  isAtRisk: boolean;
}

export interface StackedOptionPrice {
  pricePerShare: number;
  dollarValueUsd: number;
}

export type TargetExitKind = "days" | "exit_now" | "overdue";

export interface TargetExitDisplay {
  kind: TargetExitKind;
  label: string;
  daysUntilTarget?: number;
}

export interface OpenTradesHeaderSummary {
  openTradeCount: number;
  totalOpenRiskUsd: number;
  totalUnrealizedPlUsd: number | null;
  tradesAtOrBelow7Dte: number;
  tradesAtOrBelow21Dte: number;
  nearestExpiryDte: number | null;
}

export interface OpenTradesOwnershipSummary extends OpenTradesHeaderSummary {
  userUnrealizedPlUsd: number | null;
  clientUnrealizedPlUsd: number | null;
}

export function calculateOptionDollarValue(
  pricePerShare: number,
  contracts: number
): number {
  return pricePerShare * OPTION_CONTRACT_MULTIPLIER * contracts;
}

export function calculatePerShareOptionPrice(
  dollarValueUsd: number,
  contracts: number
): number | null {
  if (!Number.isFinite(dollarValueUsd) || contracts <= 0) return null;
  return dollarValueUsd / (OPTION_CONTRACT_MULTIPLIER * contracts);
}

export function buildStackedOptionPrice(
  dollarValueUsd: number,
  contracts: number
): StackedOptionPrice | null {
  const pricePerShare = calculatePerShareOptionPrice(dollarValueUsd, contracts);
  if (pricePerShare == null) return null;
  return {
    pricePerShare,
    dollarValueUsd,
  };
}

export function calculateBullPutBreakevenDifference(
  currentStockPriceUsd: number,
  breakevenUsd: number
): BreakevenDifference {
  const differenceUsd = currentStockPriceUsd - breakevenUsd;
  const differencePercent =
    breakevenUsd === 0 ? 0 : (differenceUsd / breakevenUsd) * 100;
  return {
    differenceUsd,
    differencePercent,
    isAtRisk: differenceUsd < 0,
  };
}

export function calculateBearCallBreakevenDifference(
  currentStockPriceUsd: number,
  breakevenUsd: number
): BreakevenDifference {
  const differenceUsd = breakevenUsd - currentStockPriceUsd;
  const differencePercent =
    breakevenUsd === 0 ? 0 : (differenceUsd / breakevenUsd) * 100;
  return {
    differenceUsd,
    differencePercent,
    isAtRisk: differenceUsd < 0,
  };
}

export function calculateIronCondorBreakevenDifference(
  currentStockPriceUsd: number,
  lowerBreakevenUsd: number,
  upperBreakevenUsd: number
): BreakevenDifference {
  const lowerBufferUsd = currentStockPriceUsd - lowerBreakevenUsd;
  const upperBufferUsd = upperBreakevenUsd - currentStockPriceUsd;

  if (upperBufferUsd < lowerBufferUsd) {
    return {
      differenceUsd: upperBufferUsd,
      differencePercent:
        upperBreakevenUsd === 0 ? 0 : (upperBufferUsd / upperBreakevenUsd) * 100,
      lowerBufferUsd,
      upperBufferUsd,
      activeSide: "upper",
      isAtRisk: upperBufferUsd < 0,
    };
  }

  return {
    differenceUsd: lowerBufferUsd,
    differencePercent:
      lowerBreakevenUsd === 0
        ? 0
        : (lowerBufferUsd / lowerBreakevenUsd) * 100,
    lowerBufferUsd,
    upperBufferUsd,
    activeSide: "lower",
    isAtRisk: lowerBufferUsd < 0,
  };
}

export function resolveBreakevenDifference(
  strategy: OptionsStrategy,
  currentStockPriceUsd: number | null,
  spreadMetrics: OptionsVerticalSpreadMetrics | null,
  ironCondorMetrics: OptionsIronCondorMetrics | null,
  tradeEconomics?: { breakevenUsd: number | null; lowerBreakevenUsd?: number; upperBreakevenUsd?: number } | null
): BreakevenDifference | null {
  if (currentStockPriceUsd == null) return null;

  if (strategy === "bullPut" && spreadMetrics) {
    return calculateBullPutBreakevenDifference(
      currentStockPriceUsd,
      spreadMetrics.breakevenUsd
    );
  }
  if (strategy === "bearCall" && spreadMetrics) {
    return calculateBearCallBreakevenDifference(
      currentStockPriceUsd,
      spreadMetrics.breakevenUsd
    );
  }
  if (strategy === "ironCondor" && ironCondorMetrics) {
    return calculateIronCondorBreakevenDifference(
      currentStockPriceUsd,
      ironCondorMetrics.lowerBreakevenUsd,
      ironCondorMetrics.upperBreakevenUsd
    );
  }
  if (
    (strategy === "sellPut" || strategy === "buyCall") &&
    tradeEconomics?.breakevenUsd != null
  ) {
    return calculateBullPutBreakevenDifference(
      currentStockPriceUsd,
      tradeEconomics.breakevenUsd
    );
  }
  if (
    (strategy === "sellCall" || strategy === "buyPut") &&
    tradeEconomics?.breakevenUsd != null
  ) {
    return calculateBearCallBreakevenDifference(
      currentStockPriceUsd,
      tradeEconomics.breakevenUsd
    );
  }
  return null;
}

export function hasBreakevenMetrics(
  strategy: OptionsStrategy,
  spreadMetrics: OptionsVerticalSpreadMetrics | null,
  ironCondorMetrics: OptionsIronCondorMetrics | null,
  tradeEconomics?: { breakevenUsd: number | null; lowerBreakevenUsd?: number; upperBreakevenUsd?: number } | null
): boolean {
  if (strategy === "bullPut" || strategy === "bearCall") {
    return spreadMetrics != null;
  }
  if (strategy === "ironCondor") {
    return ironCondorMetrics != null;
  }
  if (
    strategy === "sellPut" ||
    strategy === "sellCall" ||
    strategy === "buyCall" ||
    strategy === "buyPut"
  ) {
    return tradeEconomics?.breakevenUsd != null;
  }
  return false;
}

export function formatTargetExit(daysToExpiration: number): TargetExitDisplay {
  if (daysToExpiration < 7) {
    return { kind: "overdue", label: "Overdue" };
  }
  if (daysToExpiration === 7) {
    return { kind: "exit_now", label: "Exit Now" };
  }
  const daysUntilTarget = daysToExpiration - 7;
  return {
    kind: "days",
    label: `${daysUntilTarget} days`,
    daysUntilTarget,
  };
}

export function summarizeOpenTradesHeader(
  rows: OptionsOpenTradeRow[]
): OpenTradesHeaderSummary {
  let totalOpenRiskUsd = 0;
  let totalUnrealizedPlUsd = 0;
  let hasUnrealized = false;
  let tradesAtOrBelow7Dte = 0;
  let tradesAtOrBelow21Dte = 0;
  let nearestExpiryDte: number | null = null;

  for (const row of rows) {
    totalOpenRiskUsd += scaleMaxRiskForRemaining(row.trade);
    if (row.unrealizedPlUsd != null) {
      hasUnrealized = true;
      totalUnrealizedPlUsd += row.unrealizedPlUsd;
    }
    if (row.daysToExpiration <= 7) tradesAtOrBelow7Dte += 1;
    if (row.daysToExpiration <= 21) tradesAtOrBelow21Dte += 1;
    if (
      nearestExpiryDte == null ||
      row.daysToExpiration < nearestExpiryDte
    ) {
      nearestExpiryDte = row.daysToExpiration;
    }
  }

  return {
    openTradeCount: rows.length,
    totalOpenRiskUsd,
    totalUnrealizedPlUsd: hasUnrealized ? totalUnrealizedPlUsd : null,
    tradesAtOrBelow7Dte,
    tradesAtOrBelow21Dte,
    nearestExpiryDte,
  };
}

export function summarizeOpenTradesOwnership(
  rows: OptionsOpenTradeRow[]
): OpenTradesOwnershipSummary {
  const base = summarizeOpenTradesHeader(rows);
  let userUnrealizedPlUsd = 0;
  let clientUnrealizedPlUsd = 0;
  let hasLegs = false;

  for (const row of rows) {
    if (row.userUnrealizedPlUsd == null) continue;
    hasLegs = true;
    userUnrealizedPlUsd += row.userUnrealizedPlUsd;
    clientUnrealizedPlUsd += row.clientUnrealizedPlUsd ?? 0;
  }

  return {
    ...base,
    userUnrealizedPlUsd: hasLegs ? userUnrealizedPlUsd : null,
    clientUnrealizedPlUsd: hasLegs ? clientUnrealizedPlUsd : null,
  };
}
