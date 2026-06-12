"use client";

import { useState, useEffect } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { ManualPortfolioValues } from "@/core/domain/types";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";

export function ManualValuesSettings() {
  const { data, services, refresh } = usePortfolio();
  const [values, setValues] = useState<ManualPortfolioValues>(
    data?.settings.manualValues ?? {
      usStocksEtfUsd: 0,
      sgStocksSgd: 0,
      cryptoSgd: 0,
      clientPortfolioSgd: 0,
      clientPortfolioUsd: 0,
    }
  );

  const handleSave = () => {
    services.dashboardSettings.updateManualValues(values);
    refresh();
  };

  useEffect(() => {
    if (data?.settings.manualValues) {
      setValues(data.settings.manualValues);
    }
  }, [data?.settings.manualValues]);

  const update = (key: keyof ManualPortfolioValues, val: string) => {
    setValues((prev) => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  return (
    <Card
      title="Manual Portfolio Values"
      subtitle="Placeholder values — future modules will replace these"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="US Stocks & ETF Value (USD)"
          type="number"
          step="0.01"
          value={String(values.usStocksEtfUsd)}
          onChange={(e) => update("usStocksEtfUsd", e.target.value)}
        />
        <Input
          label="SG Stocks Value (SGD)"
          type="number"
          step="0.01"
          value={String(values.sgStocksSgd)}
          onChange={(e) => update("sgStocksSgd", e.target.value)}
        />
        <Input
          label="Crypto Value (SGD)"
          type="number"
          step="0.01"
          value={String(values.cryptoSgd)}
          onChange={(e) => update("cryptoSgd", e.target.value)}
        />
        <Input
          label="Client Portfolio (SGD)"
          type="number"
          step="0.01"
          value={String(values.clientPortfolioSgd)}
          onChange={(e) => update("clientPortfolioSgd", e.target.value)}
        />
        <Input
          label="Client Portfolio (USD reference)"
          type="number"
          step="0.01"
          value={String(values.clientPortfolioUsd)}
          onChange={(e) => update("clientPortfolioUsd", e.target.value)}
        />
      </div>
      <div className="mt-4">
        <Button onClick={handleSave}>Save Portfolio Values</Button>
      </div>
    </Card>
  );
}
