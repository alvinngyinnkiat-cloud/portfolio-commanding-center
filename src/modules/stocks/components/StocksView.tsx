"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { Tabs } from "@/shared/components/ui/Tabs";
import { StockHoldingsTable } from "./StockHoldingsTable";
import { StockTransactionsTable } from "./StockTransactionsTable";
import { StockCashFlowSection } from "./StockCashFlowSection";
import { StockMarketAllocationSection } from "./StockMarketAllocationSection";

function StocksSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 rounded-lg bg-surface-border/50 animate-pulse" />
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
    <div className="space-y-8 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Stock Tracker
        </h1>
        <p className="text-sm text-slate-500">
          Transaction ledger · Derived holdings · Auto price updates
        </p>
      </header>

      <section>
        <SectionHeader
          title="Stock Tracker Cash Flow"
          description="Deposits increase SGD cash and contribution. FX conversions move cash between SGD and USD pools without changing contribution."
        />
        <StockCashFlowSection />
      </section>

      <section>
        <SectionHeader
          title="Stock Market Allocation"
          description="Holdings plus available cash per market — target 75% US / 25% SG"
        />
        <StockMarketAllocationSection />
      </section>

      <Tabs
        defaultTab="holdings"
        items={[
          {
            id: "holdings",
            label: "Open Holdings",
            content: (
              <section>
                <SectionHeader
                  title="Open Holdings"
                  description="Positions derived from your transaction history — not manually entered totals"
                />
                <StockHoldingsTable />
              </section>
            ),
          },
          {
            id: "transactions",
            label: "Transactions",
            content: (
              <section>
                <SectionHeader
                  title="Transaction Ledger"
                  description="Buy, sell, dividend, and fee records are the source of truth"
                />
                <StockTransactionsTable />
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
