"use client";

import { useMemo, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import {
  buildIncomeOverlayData,
  readIncomeOverlaySettings,
} from "@/core/calculations/income";
import type { IncomeOverlaySettings } from "@/core/domain/types/income";
import { IncomeSummaryCards } from "./IncomeSummaryCards";
import { FoundationCard } from "./FoundationCard";
import { IncomeSettingsPanel } from "./IncomeSettingsPanel";

function IncomeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-border/50" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-surface-border/50 bg-surface-card/50"
          />
        ))}
      </div>
    </div>
  );
}

export function IncomeView() {
  const { isLoaded, optionsData, scannerData } = usePortfolio();
  const [settings, setSettings] = useState<IncomeOverlaySettings>(() =>
    readIncomeOverlaySettings()
  );

  const overlay = useMemo(() => {
    if (!optionsData) return null;

    const scannerRun =
      scannerData?.latestRun ?? scannerData?.previousRun ?? null;

    return buildIncomeOverlayData({
      openRows: optionsData.openRows,
      closedRows: optionsData.closedRows,
      scannerRun,
      settings,
    });
  }, [optionsData, scannerData, settings]);

  if (!isLoaded || !optionsData || !overlay) {
    return <IncomeSkeleton />;
  }

  return (
    <div className="space-y-8 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Income Overlay Manager
        </h1>
        <p className="text-sm text-slate-500">
          Read-only · Module 4 Scanner + Module 5 Options · Tracks SELL CALL windows and
          income cycles per foundation position
        </p>
      </header>

      <IncomeSettingsPanel settings={settings} onSettingsChange={setSettings} />

      <IncomeSummaryCards summary={overlay.summary} />

      {overlay.foundations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface/40 px-6 py-10 text-center">
          <p className="text-sm text-slate-300">No qualifying foundation positions.</p>
          <p className="mt-2 text-xs text-slate-500">
            Open bull put vertical spreads with DTE ≥ {settings.minFoundationDte} in
            Options to appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {overlay.foundations.map((foundation) => (
            <FoundationCard
              key={foundation.ticker}
              foundation={foundation}
              atrMultiplier={settings.foundationTriggerAtrMultiplier}
            />
          ))}
        </div>
      )}
    </div>
  );
}
