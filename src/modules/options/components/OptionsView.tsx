"use client";

import { useCallback, useEffect, useState } from "react";
import type { OptionsOpenTradeRow } from "@/core/domain/types/options";
import type { OptionsRecoveryReport } from "@/core/database/options/options-recovery-diagnostics";
import { getPersistenceManager } from "@/core/database/supabase";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { Tabs } from "@/shared/components/ui/Tabs";
import { FxRateErrorBanner } from "@/shared/components/ui/FxRateErrorBanner";
import { usePortfolio } from "@/context/PortfolioContext";
import { OptionsSummaryCards } from "./OptionsSummaryCards";
import { ClientPortfolioPanel } from "./ClientPortfolioPanel";
import { OpenTradesTab } from "./OpenTradesTab";
import { ClosedTradesTab } from "./ClosedTradesTab";
import { CapitalReadinessTab } from "./CapitalReadinessTab";
import { RiskManagementTab } from "./RiskManagementTab";
import { PerformanceAnalyticsTab } from "./PerformanceAnalyticsTab";
import {
  OptionsRecoveryPanel,
} from "./OptionsRecoveryPanel";
import {
  CloseTradeModal,
  OpenTradeModal,
} from "./OptionsModals";

function OptionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-border/50" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-surface-border/50 bg-surface-card/50"
          />
        ))}
      </div>
    </div>
  );
}

export function OptionsView() {
  const {
    isLoaded,
    optionsData,
    optionsTradesLoadState,
    initError,
    persistenceError,
  } = usePortfolio();
  const [openForm, setOpenForm] = useState(false);
  const [editTrade, setEditTrade] = useState<OptionsOpenTradeRow | null>(null);
  const [closeRow, setCloseRow] = useState<OptionsOpenTradeRow | null>(null);
  const [recoveryReport, setRecoveryReport] = useState<OptionsRecoveryReport | null>(
    null
  );
  const [recoveryChecking, setRecoveryChecking] = useState(true);

  const runRecoveryCheck = useCallback(async () => {
    if (!optionsData) return;
    setRecoveryChecking(true);
    const manager = getPersistenceManager();
    if (manager) {
      setRecoveryReport(await manager.inspectOptionsRecovery());
    } else {
      const { runOptionsRecoveryDiagnostics } = await import(
        "@/core/database/options/options-recovery-diagnostics"
      );
      setRecoveryReport(
        await runOptionsRecoveryDiagnostics(null, optionsData.trades)
      );
    }
    setRecoveryChecking(false);
  }, [optionsData]);

  useEffect(() => {
    if (!isLoaded || !optionsData) return;
    if (
      optionsTradesLoadState.status !== "loaded" &&
      optionsTradesLoadState.status !== "error"
    ) {
      return;
    }
    void runRecoveryCheck();
  }, [isLoaded, optionsData, optionsTradesLoadState.status, runRecoveryCheck]);

  const activeTradeCount = optionsData?.trades.length ?? 0;
  const showVerifiedEmpty =
    optionsTradesLoadState.status === "loaded" &&
    activeTradeCount === 0 &&
    recoveryReport?.investigationComplete === true &&
    recoveryReport.recoverableTrades.length === 0;

  if (!isLoaded || optionsTradesLoadState.status === "loading" || !optionsData) {
    return <OptionsSkeleton />;
  }

  if (optionsTradesLoadState.status === "error") {
    return (
      <div className="space-y-6 pb-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Options Tracker
          </h1>
        </header>
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-5">
          <p className="text-sm font-medium text-red-200">Load Error</p>
          <p className="mt-2 text-sm text-red-100/90">
            {optionsTradesLoadState.error ??
              initError ??
              persistenceError ??
              "Options trade records could not be loaded."}
          </p>
        </div>
        <OptionsRecoveryPanel
          report={recoveryReport}
          checking={recoveryChecking}
          onRecheck={() => void runRecoveryCheck()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Options Tracker
        </h1>
        <p className="text-sm text-slate-500">
          Manual trade journal · US cash from shared pool · Client summary for shared
          option trades
        </p>
      </header>

      {!optionsData.fxRateValid && <FxRateErrorBanner />}

      <OptionsRecoveryPanel
        report={recoveryReport}
        checking={recoveryChecking}
        onRecheck={() => void runRecoveryCheck()}
      />

      <OptionsSummaryCards showVerifiedEmpty={showVerifiedEmpty} />

      <ClientPortfolioPanel />

      <Tabs
        defaultTab="open"
        items={[
          {
            id: "open",
            label: "Open Trades",
            content: (
              <section>
                <SectionHeader
                  title="Open Trades"
                  description="Sorted by DTE urgency — review and normally close by 7 DTE"
                />
                <OpenTradesTab
                  onOpenNew={() => {
                    setEditTrade(null);
                    setOpenForm(true);
                  }}
                  onEdit={(row) => {
                    setEditTrade(row);
                    setOpenForm(true);
                  }}
                  onClose={setCloseRow}
                />
              </section>
            ),
          },
          {
            id: "closed",
            label: "Closed Trades",
            content: (
              <section>
                <SectionHeader
                  title="Closed Trades"
                  description="Realized P/L on close flows into US Available Cash — notes editable, delete reverses cash"
                />
                <ClosedTradesTab />
              </section>
            ),
          },
          {
            id: "readiness",
            label: "Capital Readiness",
            content: (
              <section>
                <SectionHeader
                  title="Options Capital Readiness"
                  description="Can you open new risk given shared US Available Cash?"
                />
                <CapitalReadinessTab />
              </section>
            ),
          },
          {
            id: "risk",
            label: "Risk",
            content: (
              <section>
                <SectionHeader
                  title="Risk Management"
                  description="Where open risk sits — risk does not reduce cash balance"
                />
                <RiskManagementTab />
              </section>
            ),
          },
          {
            id: "performance",
            label: "Performance",
            content: (
              <section>
                <SectionHeader
                  title="Performance Analytics"
                  description="Closed-trade stats and personal/shared split — no contribution metrics"
                />
                <PerformanceAnalyticsTab />
              </section>
            ),
          },
        ]}
      />

      {openForm && (
        <OpenTradeModal
          editTrade={editTrade?.trade}
          onClose={() => {
            setOpenForm(false);
            setEditTrade(null);
          }}
        />
      )}
      {closeRow && (
        <CloseTradeModal
          trade={closeRow.trade}
          onClose={() => setCloseRow(null)}
        />
      )}
    </div>
  );
}
