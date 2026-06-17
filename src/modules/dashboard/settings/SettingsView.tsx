"use client";

import { useMemo } from "react";
import { Card } from "@/shared/components/ui/Card";
import { Tabs, type TabItem } from "@/shared/components/ui/Tabs";
import { ManualValuesSettings } from "./ManualValuesSettings";
import { ContributionTransactionsTable } from "./ContributionTransactionsTable";
import { GoalsTable } from "./GoalsTable";
import { DailySnapshotTrigger } from "./DailySnapshotTrigger";
import { DiagnosticsSettings } from "./DiagnosticsSettings";

export function SettingsView() {
  const tabs = useMemo<TabItem[]>(
    () => [
      {
        id: "portfolio",
        label: "Portfolio Values",
        content: (
          <Card
            title="Portfolio Values"
            subtitle="FX rate and read-only holdings sourced from tracker modules"
          >
            <ManualValuesSettings />
          </Card>
        ),
      },
      {
        id: "contributions",
        label: "Contributions",
        content: (
          <Card
            title="Contribution Transactions"
            subtitle="All amounts in SGD — cash balances are derived from transactions"
          >
            <ContributionTransactionsTable />
          </Card>
        ),
      },
      {
        id: "goals",
        label: "Goals",
        content: (
          <Card title="Goals" subtitle="Active goals appear on the dashboard">
            <GoalsTable />
          </Card>
        ),
      },
      {
        id: "snapshots",
        label: "Snapshots",
        content: (
          <Card
            title="Daily Snapshots"
            subtitle="Manual capture now · Auto 11:59pm SGT prepared (client poll; server cron later)"
          >
            <DailySnapshotTrigger />
          </Card>
        ),
      },
      {
        id: "diagnostics",
        label: "Diagnostics",
        content: (
          <Card
            title="Diagnostics"
            subtitle="Reconciliation and audit tools for portfolio cash flows"
          >
            <DiagnosticsSettings />
          </Card>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 pb-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Dashboard Settings
        </h1>
        <p className="text-sm text-slate-500">
          Edit portfolio data here. The dashboard is read-only.
        </p>
      </header>

      <Tabs items={tabs} defaultTab="portfolio" />
    </div>
  );
}
