import type { ScannerTickerResult } from "@/core/domain/types/scanner";
import { buildEmaSuggestedTrade } from "@/core/calculations/scanner/ema-suggested-trade";
import { calculateSuggestedMaxRisk } from "@/core/calculations/scanner/suggested-trade";

export interface EmaSummaryEntry {
  rank: number;
  ticker: string;
  ema20: number | null;
  trade: string;
  width: number | null;
  targetPremium: number | null;
  maxRiskUsd: number | null;
}

function buildEntry(row: ScannerTickerResult): EmaSummaryEntry | null {
  const output = row.emaStrategy.output;
  if (output !== "SELL PUT" && output !== "SELL CALL") {
    return null;
  }

  const suggested = buildEmaSuggestedTrade({
    output,
    ema20: row.indicators.ema20,
    atr14: row.indicators.atr14,
    currentPrice: row.currentPrice,
  });

  return {
    rank: 0,
    ticker: row.ticker,
    ema20: row.indicators.ema20,
    trade: suggested.tradeDisplay,
    width: suggested.width,
    targetPremium: suggested.estimatedPremium,
    maxRiskUsd:
      suggested.width != null ? calculateSuggestedMaxRisk(suggested.width) : null,
  };
}

export function buildEmaSummaryEntries(
  results: ScannerTickerResult[],
  output: "SELL PUT" | "SELL CALL"
): EmaSummaryEntry[] {
  return results
    .filter((row) => row.emaStrategy.output === output)
    .sort((a, b) => a.ticker.localeCompare(b.ticker))
    .slice(0, 5)
    .map((row, index) => {
      const entry = buildEntry(row);
      return entry ? { ...entry, rank: index + 1 } : null;
    })
    .filter((entry): entry is EmaSummaryEntry => entry != null);
}
