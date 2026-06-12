"use client";

import { useState, useEffect } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";

export function FxCashSettings() {
  const { data, services, refresh } = usePortfolio();
  const settings = data?.settings;

  const [fxRate, setFxRate] = useState(String(settings?.usdSgdFxRate ?? ""));
  const [stockCashUsd, setStockCashUsd] = useState(
    String(settings?.stockCashUsd ?? "")
  );
  const [cryptoCashSgd, setCryptoCashSgd] = useState(
    String(settings?.cryptoCashSgd ?? "")
  );

  useEffect(() => {
    if (!settings) return;
    setFxRate(String(settings.usdSgdFxRate));
    setStockCashUsd(String(settings.stockCashUsd));
    setCryptoCashSgd(String(settings.cryptoCashSgd));
  }, [settings]);

  const handleSave = () => {
    services.dashboardSettings.updateFxAndCash(
      parseFloat(fxRate) || 0,
      parseFloat(stockCashUsd) || 0,
      parseFloat(cryptoCashSgd) || 0
    );
    refresh();
  };

  return (
    <Card title="FX Rate & Cash">
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="USD/SGD FX Rate"
          type="number"
          step="0.0001"
          value={fxRate}
          onChange={(e) => setFxRate(e.target.value)}
        />
        <Input
          label="Stock Cash (USD)"
          type="number"
          step="0.01"
          value={stockCashUsd}
          onChange={(e) => setStockCashUsd(e.target.value)}
        />
        <Input
          label="Crypto Cash (SGD)"
          type="number"
          step="0.01"
          value={cryptoCashSgd}
          onChange={(e) => setCryptoCashSgd(e.target.value)}
        />
      </div>
      <div className="mt-4">
        <Button onClick={handleSave}>Save FX & Cash</Button>
      </div>
    </Card>
  );
}
