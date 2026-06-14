"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { Tabs } from "@/shared/components/ui/Tabs";
import { StockOverviewSection } from "./StockOverviewSection";
import { StockHoldingsTable } from "./StockHoldingsTable";
import { StockTransactionsTable } from "./StockTransactionsTable";
import { StockCashFlowSection } from "./StockCashFlowSection";
import { StockMarketAllocationSection } from "./StockMarketAllocationSection";

function StocksSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 rounded-lg bg-surface-border/50 animate-pulse" />
      <div className="h-10 w-full max-w-xl rounded-lg bg-surface-border/40 animate-pulse" />
      <div className="h-64 rounded-2xl border border-surface-border/50 bg-surface-card/50 animate-pulse" />
    </div>
  );
}

export function StocksView() {
  const { isLoaded } = usePortfolio();

  if (!isLoaded) {
    return <StocksSkeleton />;
  }

  return (
    <div className="min-w-0 space-y-6 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Stock Tracker
        </h1>
        <p className="text-sm text-slate-500">
          Transaction ledger · Derived holdings · Auto price updates
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
                  title="Stock Overview"
                  description="Portfolio totals, P/L, contribution, and available cash by market"
                />
                <StockOverviewSection />
              </section>
            ),
          },
          {
            id: "holdings",
            label: "Holdings",
            content: (
              <section className="min-w-0">
                <SectionHeader
                  title="Open Holdings"
                  description="US and SG positions derived from transactions — add or edit via the Transactions tab"
                />
                <StockHoldingsTable />
              </section>
            ),
          },
          {
            id: "transactions",
            label: "Transactions",
            content: (
              <section className="min-w-0">
                <SectionHeader
                  title="Transaction Ledger"
                  description="Buy, sell, dividend, and fee records — newest first"
                />
                <StockTransactionsTable />
              </section>
            ),
          },
          {
            id: "cash-flow",
            label: "Cash Flow",
            content: (
              <section className="min-w-0">
                <SectionHeader
                  title="Stock Cash Flow"
                  description="Deposits increase SGD cash and contribution. FX conversions move cash between pools without changing contribution."
                />
                <StockCashFlowSection />
              </section>
            ),
          },
          {
            id: "allocation",
            label: "Allocation",
            content: (
              <section className="min-w-0">
                <SectionHeader
                  title="Stock Market Allocation"
                  description="Holdings plus available cash per market — target 75% US / 25% SG"
                />
                <StockMarketAllocationSection />
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
