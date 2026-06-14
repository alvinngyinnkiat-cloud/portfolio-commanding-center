"use client";

import { useState, useEffect, useMemo } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { ManualPortfolioValues } from "@/core/domain/types";
import { deriveDashboardStockValues } from "@/core/adapters/dashboard-stock-adapter";
import {
  isValidFxRate,
  parseFxRateInput,
  FX_RATE_ERROR_MESSAGE,
} from "@/core/calculations/fx-validation";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { formatSgd, formatUsd } from "@/shared/lib/format";
import { normalizeManualPortfolioValues } from "@/core/domain/defaults";

/**
 * Manual inputs for assets not yet backed by a module.
 * US/SG stocks and crypto are read-only — sourced from Stock Tracker (Module 2)
 * and Crypto Tracker (Module 3). Client options equity is managed in Options Tracker.
 */
export function ManualValuesSettings() {
  const { data, stockData, cryptoData, optionsData, services, refresh } = usePortfolio();
  const [fxRate, setFxRate] = useState("");
  const [values, setValues] = useState<ManualPortfolioValues>(
    normalizeManualPortfolioValues(data?.settings?.manualValues)
  );

  useEffect(() => {
    if (data?.settings) {
      const stored = data.settings.usdSgdFxRate;
      setFxRate(stored != null ? String(stored) : "");
      setValues(normalizeManualPortfolioValues(data.settings.manualValues));
    }
  }, [data?.settings]);

  const parsedFx = parseFxRateInput(fxRate);
  const fxValid = isValidFxRate(parsedFx);

  const clientEquityUsd = optionsData?.clientSummary.clientEquityUsd ?? 0;
  const clientEquitySgd = useMemo(() => {
    if (!fxValid || parsedFx === null) return null;
    return clientEquityUsd * parsedFx;
  }, [fxValid, parsedFx, clientEquityUsd]);

  const stockValues = useMemo(
    () =>
      deriveDashboardStockValues(
        stockData?.holdings ?? [],
        stockData?.fxRate ?? null
      ),
    [stockData?.holdings, stockData?.fxRate]
  );

  const cryptoValue = cryptoData?.dashboardOutputs.cryptoTotalValueSgd ?? 0;
  const cryptoHoldings = cryptoData?.dashboardOutputs.numberOfHoldings ?? 0;

  const handleSave = () => {
    const stored = normalizeManualPortfolioValues(data?.settings?.manualValues);
    services.dashboardSettings.updatePortfolioValues(
      parseFxRateInput(fxRate),
      normalizeManualPortfolioValues({
        ...values,
        usStocksEtfUsd: stored.usStocksEtfUsd,
        sgStocksSgd: stored.sgStocksSgd,
        cryptoSgd: stored.cryptoSgd,
        clientPortfolioUsd: stored.clientPortfolioUsd,
      })
    );
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="USD/SGD FX Rate"
          type="number"
          step="0.0001"
          value={fxRate}
          onChange={(e) => setFxRate(e.target.value)}
          hint="App-wide rate for US stocks, USD cash, and options"
        />
        <Input
          label="US Stocks & ETFs (from Stock Tracker)"
          type="text"
          value={
            stockData?.fxRateValid
              ? formatSgd(stockValues.usStocksEtfSgd)
              : stockValues.usStocksEtfUsd > 0
                ? formatUsd(stockValues.usStocksEtfUsd)
                : formatSgd(0)
          }
          readOnly
          hint={
            stockData?.fxRateValid
              ? `Ref: ${formatUsd(stockValues.usStocksEtfUsd)} · Edit in Stock Tracker`
              : "Set FX rate and prices in Stock Tracker"
          }
        />
        <Input
          label="SG Stocks (from Stock Tracker)"
          type="text"
          value={formatSgd(stockValues.sgStocksSgd)}
          readOnly
          hint="Edit holdings in Stock Tracker"
        />
        <Input
          label="Crypto Value (from Crypto Tracker)"
          type="text"
          value={formatSgd(cryptoValue)}
          readOnly
          hint={`${cryptoHoldings} holding${cryptoHoldings === 1 ? "" : "s"} · Edit in Crypto Tracker`}
        />
        <Input
          label="Client Options Equity (from Options Tracker)"
          type="text"
          value={formatUsd(clientEquityUsd)}
          readOnly
          hint={
            optionsData?.clientSummary.clientName
              ? `${optionsData.clientSummary.clientName} · Edit in Options Tracker → Client Settings`
              : "Edit in Options Tracker → Client Settings"
          }
        />
        <Input
          label="Client Options Equity SGD (calculated)"
          type="text"
          value={
            fxValid && clientEquitySgd !== null
              ? formatSgd(clientEquitySgd)
              : FX_RATE_ERROR_MESSAGE
          }
          readOnly
          hint="Client equity USD × FX rate"
        />
      </div>
      <Button onClick={handleSave}>Save Portfolio Values</Button>
    </div>
  );
}
