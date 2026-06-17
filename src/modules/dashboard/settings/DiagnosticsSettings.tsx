"use client";

import { useMemo } from "react";
import { Card } from "@/shared/components/ui/Card";
import { Tabs, type TabItem } from "@/shared/components/ui/Tabs";
import { UsdCashDiagnosticsPanel } from "./diagnostics/UsdCashDiagnosticsPanel";

export function DiagnosticsSettings() {
  const tabs = useMemo<TabItem[]>(
    () => [
      {
        id: "usd-cash",
        label: "Cash Reconciliation",
        content: (
          <Card
            title="Cash Reconciliation"
            subtitle="Audit USD cash from FX, stock, and options activity against broker balances"
          >
            <UsdCashDiagnosticsPanel />
          </Card>
        ),
      },
    ],
    []
  );

  return <Tabs items={tabs} defaultTab="usd-cash" />;
}
