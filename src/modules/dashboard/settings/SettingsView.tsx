"use client";

import { FxCashSettings } from "./FxCashSettings";
import { ManualValuesSettings } from "./ManualValuesSettings";
import { ContributionTransactionsTable } from "./ContributionTransactionsTable";
import { GoalsTable } from "./GoalsTable";
import { DailySnapshotTrigger } from "./DailySnapshotTrigger";

export function SettingsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Dashboard Settings</h2>
        <p className="text-sm text-slate-500">
          All portfolio data is edited here. The dashboard is read-only.
        </p>
      </div>

      <FxCashSettings />
      <ManualValuesSettings />
      <ContributionTransactionsTable />
      <GoalsTable />
      <DailySnapshotTrigger />
    </div>
  );
}
