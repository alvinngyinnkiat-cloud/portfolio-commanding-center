"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { Tabs } from "@/shared/components/ui/Tabs";
import { CryptoOverviewSection } from "./CryptoOverviewSection";
import { CryptoHoldingsSection } from "./CryptoHoldingsSection";
import { CryptoTransactionsSection } from "./CryptoTransactionsSection";
import { CryptoCashFlowSection } from "./CryptoCashFlowSection";
import { CryptoAllocationSection } from "./CryptoAllocationSection";

function CryptoSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 rounded-lg bg-surface-border/50 animate-pulse" />
      <div className="h-10 w-full max-w-xl rounded-lg bg-surface-border/40 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl border border-surface-border/50 bg-surface-card/50 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export function CryptoView() {
  const { isLoaded } = usePortfolio();

  if (!isLoaded) {
    return <CryptoSkeleton />;
  }

  return (
    <div className="min-w-0 space-y-6 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Crypto Tracker
        </h1>
        <p className="text-sm text-slate-500">
          Manual valuations · Cash deployment guide · No price feeds
        </p>
      </header>

      <Tabs
        defaultTab="overview"
        items={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <section className="min-w-0">
                <SectionHeader
                  title="Crypto Overview"
                  description="Portfolio totals, P/L, contribution, and top holdings summary"
                />
                <CryptoOverviewSection />
              </section>
            ),
          },
          {
            id: "holdings",
            label: "Holdings",
            content: (
              <section className="min-w-0">
                <SectionHeader
                  title="Crypto Holdings"
                  description="Record buy/sell transactions and update manual valuations per holding"
                />
                <CryptoHoldingsSection />
              </section>
            ),
          },
          {
            id: "transactions",
            label: "Transactions",
            content: (
              <section className="min-w-0">
                <SectionHeader
                  title="Transaction History"
                  description="Edit buy/sell records or add new transactions from the Holdings tab"
                />
                <CryptoTransactionsSection />
              </section>
            ),
          },
          {
            id: "cash-flow",
            label: "Cash Flow",
            content: (
              <section className="min-w-0">
                <SectionHeader
                  title="Crypto Cash Flow"
                  description="Deposits increase crypto cash and contribution. No FX conversion layer."
                />
                <CryptoCashFlowSection />
              </section>
            ),
          },
          {
            id: "allocation",
            label: "Allocation",
            content: (
              <section className="min-w-0">
                <SectionHeader
                  title="Crypto Allocation"
                  description="Asset allocation by coin and cash deployment tiers"
                />
                <CryptoAllocationSection />
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
