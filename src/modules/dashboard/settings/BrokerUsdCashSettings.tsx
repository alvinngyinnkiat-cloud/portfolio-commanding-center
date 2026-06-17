"use client";

import { useEffect, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { toLocalDateString } from "@/shared/lib/date";

export function BrokerUsdCashSettings() {
  const { data, services, refresh } = usePortfolio();
  const [brokerUsdCash, setBrokerUsdCash] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    if (!data?.settings) return;
    setBrokerUsdCash(
      data.settings.brokerUsdCashOverride != null
        ? String(data.settings.brokerUsdCashOverride)
        : ""
    );
    setLastUpdated(data.settings.brokerUsdCashLastUpdated ?? "");
  }, [data?.settings]);

  const handleSave = () => {
    if (!services) return;
    const trimmed = brokerUsdCash.trim();
    const parsed = trimmed ? parseFloat(trimmed) : null;
    services.dashboardSettings.updateBrokerUsdCashOverride(
      parsed != null && Number.isFinite(parsed) ? parsed : null,
      lastUpdated.trim() || null
    );
    refresh();
  };

  const handleClear = () => {
    if (!services) return;
    services.dashboardSettings.updateBrokerUsdCashOverride(null, null);
    setBrokerUsdCash("");
    setLastUpdated("");
    refresh();
  };

  return (
    <div className="space-y-4 rounded-xl border border-surface-border/60 bg-surface/40 p-4">
      <div>
        <h3 className="font-medium text-white">Broker USD Cash Override</h3>
        <p className="mt-1 text-sm text-slate-500">
          Use broker-reported USD cash for display and buying capacity. System
          calculated cash remains visible as a reference.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Broker USD Cash"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 1341.21"
          value={brokerUsdCash}
          onChange={(e) => setBrokerUsdCash(e.target.value)}
          hint="Leave blank to use system calculated USD cash"
        />
        <Input
          label="Broker Cash Last Updated Date"
          type="date"
          value={lastUpdated}
          onChange={(e) => setLastUpdated(e.target.value)}
          hint="Optional reconciliation reset date"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave}>Save Broker Cash</Button>
        {(brokerUsdCash.trim() || lastUpdated) && (
          <Button variant="secondary" onClick={handleClear}>
            Clear Override
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => setLastUpdated(toLocalDateString())}
        >
          Set Date to Today
        </Button>
      </div>
    </div>
  );
}
