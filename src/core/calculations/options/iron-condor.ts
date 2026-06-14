import type { OptionsStrategy } from "@/core/domain/types/options";
import {
  calculate75PercentTpExitPriceUsd,
  calculateNetCreditUsd,
} from "./profit-target";

const CONTRACT_MULTIPLIER = 100;

export interface IronCondorInput {
  bullPutShortStrikeUsd: number;
  bullPutLongStrikeUsd: number;
  bearCallShortStrikeUsd: number;
  bearCallLongStrikeUsd: number;
  contracts: number;
  openPremiumUsd: number;
  openFeesUsd: number;
}

export interface IronCondorMetrics {
  bullPutWidthPerShare: number;
  bearCallWidthPerShare: number;
  ironCondorWidthPerShare: number;
  spreadWidthUsd: number;
  netCreditUsd: number;
  netCreditPerShare: number;
  maxProfitUsd: number;
  maxRiskUsd: number;
  lowerBreakevenUsd: number;
  upperBreakevenUsd: number;
  tpExitPrice75Usd: number;
}

export function isIronCondorStrategy(
  strategy: OptionsStrategy
): strategy is "ironCondor" {
  return strategy === "ironCondor";
}

export function calculateIronCondorMetrics(input: IronCondorInput): IronCondorMetrics {
  const bullPutWidthPerShare = Math.abs(
    input.bullPutShortStrikeUsd - input.bullPutLongStrikeUsd
  );
  const bearCallWidthPerShare = Math.abs(
    input.bearCallShortStrikeUsd - input.bearCallLongStrikeUsd
  );
  const ironCondorWidthPerShare = Math.max(
    bullPutWidthPerShare,
    bearCallWidthPerShare
  );
  const spreadWidthUsd =
    ironCondorWidthPerShare * CONTRACT_MULTIPLIER * input.contracts;
  const netCreditUsd = calculateNetCreditUsd(
    input.openPremiumUsd,
    input.openFeesUsd
  );
  const netCreditPerShare =
    netCreditUsd / (input.contracts * CONTRACT_MULTIPLIER);
  const maxProfitUsd = netCreditUsd;
  const maxRiskUsd =
    spreadWidthUsd - input.openPremiumUsd + input.openFeesUsd;
  const lowerBreakevenUsd =
    input.bullPutShortStrikeUsd - netCreditPerShare;
  const upperBreakevenUsd =
    input.bearCallShortStrikeUsd + netCreditPerShare;

  return {
    bullPutWidthPerShare,
    bearCallWidthPerShare,
    ironCondorWidthPerShare,
    spreadWidthUsd,
    netCreditUsd,
    netCreditPerShare,
    maxProfitUsd,
    maxRiskUsd,
    lowerBreakevenUsd,
    upperBreakevenUsd,
    tpExitPrice75Usd: calculate75PercentTpExitPriceUsd(netCreditUsd),
  };
}

export function validateIronCondorStrikes(input: IronCondorInput): string | null {
  const {
    bullPutShortStrikeUsd,
    bullPutLongStrikeUsd,
    bearCallShortStrikeUsd,
    bearCallLongStrikeUsd,
  } = input;

  for (const [label, value] of [
    ["Bull put short strike", bullPutShortStrikeUsd],
    ["Bull put long strike", bullPutLongStrikeUsd],
    ["Bear call short strike", bearCallShortStrikeUsd],
    ["Bear call long strike", bearCallLongStrikeUsd],
  ] as const) {
    if (!Number.isFinite(value) || value <= 0) {
      return `${label} must be greater than zero`;
    }
  }

  if (bullPutShortStrikeUsd <= bullPutLongStrikeUsd) {
    return "Bull put: short strike must be above long strike";
  }
  if (bearCallLongStrikeUsd <= bearCallShortStrikeUsd) {
    return "Bear call: long strike must be above short strike";
  }
  if (bullPutShortStrikeUsd >= bearCallShortStrikeUsd) {
    return "Bull put short strike must be below bear call short strike";
  }

  return null;
}
