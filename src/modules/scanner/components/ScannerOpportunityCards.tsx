"use client";

import type { ScannerTickerResult } from "@/core/domain/types/scanner";
import type { MarketDataRecord } from "@/core/domain/types/market-data";
import type { ScannerTickerDataStatus } from "@/core/calculations/scanner/scanner-ticker-records";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { ScannerOpportunityCard } from "./ScannerOpportunityCard";

interface ScannerOpportunityCardsProps {
  results: ScannerTickerResult[];
  tickerStatuses?: Record<string, ScannerTickerDataStatus>;
  tickerRefreshedAt?: Record<string, string | null>;
  marketDataMap?: Map<string, MarketDataRecord>;
}

export function ScannerOpportunityCards({
  results,
  tickerStatuses = {},
  tickerRefreshedAt = {},
  marketDataMap = new Map(),
}: ScannerOpportunityCardsProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-border/80 bg-surface-card/40 p-8 text-center text-slate-500">
        No tickers match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result) => {
        const key = normalizeTicker(result.ticker);
        return (
          <ScannerOpportunityCard
            key={result.ticker}
            result={result}
            marketData={marketDataMap.get(key) ?? null}
            dataStatus={tickerStatuses[key]}
            refreshedAt={tickerRefreshedAt[key]}
          />
        );
      })}
    </div>
  );
}
