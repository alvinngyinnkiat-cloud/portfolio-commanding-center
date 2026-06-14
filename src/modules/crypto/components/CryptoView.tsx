"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { CryptoHoldingsTable } from "./CryptoHoldingsTable";

function CryptoSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 rounded-lg bg-surface-border/50 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl border border-surface-border/50 bg-surface-card/50 animate-pulse"
          />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-surface-border/50 bg-surface-card/50 animate-pulse" />
    </div>
  );
}

export function CryptoView() {
  const { isLoaded } = usePortfolio();

  if (!isLoaded) {
    return <CryptoSkeleton />;
  }

  return (
    <div className="space-y-8 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Crypto Tracker
        </h1>
        <p className="text-sm text-slate-500">
          Manual valuations · Cash deployment guide · No price feeds
        </p>
      </header>

      <section>
        <SectionHeader
          title="Holdings"
          description="Track invested amounts and manually update current values — sorted by largest position"
        />
        <CryptoHoldingsTable />
      </section>
    </div>
  );
}
