"use client";

import type { ScannerTickerResult } from "@/core/domain/types/scanner";
import { ScannerOpportunityCard } from "./ScannerOpportunityCard";

interface ScannerOpportunityCardsProps {
  results: ScannerTickerResult[];
}

export function ScannerOpportunityCards({ results }: ScannerOpportunityCardsProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-border/80 bg-surface-card/40 p-8 text-center text-slate-500">
        No tickers match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <ScannerOpportunityCard key={result.ticker} result={result} />
      ))}
    </div>
  );
}
