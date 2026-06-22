import type {
  OptionsClientSummary,
  OptionsClosedTradeRow,
  OptionsOpenTradeRow,
  OptionsSettings,
} from "@/core/domain/types/options";
import { scaleMaxRiskForRemaining } from "./contract-tracking";

export function buildOptionsClientSummary(
  settings: OptionsSettings,
  openRows: OptionsOpenTradeRow[],
  closedRows: OptionsClosedTradeRow[]
): OptionsClientSummary {
  const sharedOpen = openRows.filter((row) => row.trade.tradeType === "shared");
  const sharedClosed = closedRows.filter((row) => row.trade.tradeType === "shared");

  let clientRealizedPlUsd = 0;
  for (const row of sharedClosed) {
    clientRealizedPlUsd += row.clientRealizedPlUsd;
  }

  let clientUnrealizedPlUsd = 0;
  let hasUnrealized = false;
  for (const row of sharedOpen) {
    if (row.clientUnrealizedPlUsd == null) continue;
    hasUnrealized = true;
    clientUnrealizedPlUsd += row.clientUnrealizedPlUsd;
  }

  const startingCapitalUsd = settings.clientStartingCapitalUsd;
  const unrealizedForEquity = hasUnrealized ? clientUnrealizedPlUsd : 0;
  const clientEquityUsd =
    startingCapitalUsd + clientRealizedPlUsd + unrealizedForEquity;
  const returnPercent =
    startingCapitalUsd > 0
      ? ((clientEquityUsd - startingCapitalUsd) / startingCapitalUsd) * 100
      : null;

  let openSharedRiskUsd = 0;
  for (const row of sharedOpen) {
    openSharedRiskUsd += scaleMaxRiskForRemaining(row.trade);
  }

  return {
    clientName: settings.clientName,
    startingCapitalUsd: startingCapitalUsd,
    clientRealizedPlUsd,
    clientUnrealizedPlUsd: hasUnrealized ? clientUnrealizedPlUsd : null,
    clientEquityUsd,
    returnPercent,
    openSharedTradeCount: sharedOpen.length,
    openSharedRiskUsd,
  };
}
