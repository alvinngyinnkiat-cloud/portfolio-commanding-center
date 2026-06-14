"use client";

import { useMemo, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { CalculatedHolding, StockMarket, StockPrice } from "@/core/domain/types";
import { sumRealizedOptionsPlUsd } from "@/core/calculations/options";
import {
  buildStockPortfolioSummary,
  plTrend,
} from "@/core/calculations/stocks/summary";
import { formatSgd, formatSingaporeDateTime, formatUsd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { FxRateErrorBanner } from "@/shared/components/ui/FxRateErrorBanner";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import {
  resolvePriceSource,
} from "@/core/calculations/stocks/price-normalize";
import type { PriceDisplaySource } from "@/core/domain/types";
import { TrendingUp, Wallet, RefreshCw, PiggyBank } from "lucide-react";

type MarketFilter = "ALL" | StockMarket;

function formatNativeValue(holding: CalculatedHolding, value: number | null | undefined): string {
  const safeValue = coerceNumber(value);
  return holding.currency === "USD" ? formatUsd(safeValue) : formatSgd(safeValue);
}

/** Display-only: green / red / neutral — does not alter calculated values. */
function plColorClass(value: number | null | undefined, isMissing = false): string {
  if (isMissing) return "text-slate-300";
  const n = coerceNumber(value);
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-accent-red";
  return "text-slate-300";
}

function MarketValueCell({
  holding,
  fxRateValid,
}: {
  holding: CalculatedHolding;
  fxRateValid: boolean;
}) {
  if (holding.currentPrice == null) {
    return <span className="text-slate-300">—</span>;
  }

  if (holding.market === "US") {
    return (
      <div className="text-slate-300">
        <p>{formatUsd(holding.marketValue)}</p>
        {fxRateValid && holding.sgdValue != null ? (
          <p className="mt-0.5 text-xs text-slate-500">
            ≈ {formatSgd(holding.sgdValue)}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-slate-500">FX required</p>
        )}
      </div>
    );
  }

  return <span className="text-slate-300">{formatSgd(holding.marketValue)}</span>;
}

function SgdValueCell({
  holding,
  fxRateValid,
}: {
  holding: CalculatedHolding;
  fxRateValid: boolean;
}) {
  if (holding.currentPrice == null) {
    return <span className="text-slate-300">—</span>;
  }

  if (holding.market === "US") {
    if (fxRateValid && holding.sgdValue != null) {
      return <span className="text-slate-300">{formatSgd(holding.sgdValue)}</span>;
    }
    return <span className="text-slate-500">FX required</span>;
  }

  return <span className="text-slate-300">{formatSgd(holding.marketValue)}</span>;
}


function priceSourceClass(source: PriceDisplaySource): string {
  if (source === "Auto") return "text-emerald-400";
  if (source === "Manual") return "text-amber-300";
  return "text-slate-500";
}

function ManualPriceOverride({
  holding,
  onSave,
}: {
  holding: CalculatedHolding;
  onSave: (price: number) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Price must be greater than zero");
      return;
    }
    setError(null);
    onSave(parsed);
    setValue("");
  };

  return (
    <div className="mt-2 flex min-w-[180px] items-end gap-2">
      <Input
        label="Manual override"
        type="number"
        step="any"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={error ?? undefined}
        className="min-w-[100px]"
      />
      <Button size="sm" variant="secondary" onClick={handleSave}>
        Set
      </Button>
    </div>
  );
}

function PriceDisplay({
  holding,
  priceRecord,
  onManualSave,
}: {
  holding: CalculatedHolding;
  priceRecord?: StockPrice;
  onManualSave: (price: number) => void;
}) {
  const source = resolvePriceSource(priceRecord);

  if (holding.currentPrice == null) {
    return (
      <div className="min-w-[180px]">
        <p className="text-sm text-slate-400">Price unavailable.</p>
        <p className="mt-1 text-xs text-slate-500">
          Price Source:{" "}
          <span className={priceSourceClass(source)}>{source}</span>
        </p>
        <p className="mt-1 text-xs text-amber-400/90">
          Enter a manual price or refresh auto prices.
        </p>
        <ManualPriceOverride holding={holding} onSave={onManualSave} />
      </div>
    );
  }

  return (
    <div className="min-w-[180px]">
      <p className="font-medium text-white">
        {formatNativeValue(holding, holding.currentPrice)}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Price Source:{" "}
        <span className={priceSourceClass(source)}>{source}</span>
      </p>
      {source === "Auto" && priceRecord?.priceUnavailable && (
        <p className="mt-1 text-xs text-amber-400">
          Price unavailable. Using last successful update.
        </p>
      )}
      {source === "Auto" && priceRecord?.lastPriceUpdate && (
        <p className="mt-1 text-xs text-slate-500">
          Last Updated {formatSingaporeDateTime(priceRecord.lastPriceUpdate)}
        </p>
      )}
      {source === "Manual" && priceRecord?.manualPriceUpdatedAt && (
        <p className="mt-1 text-xs text-slate-500">
          Manual set {formatSingaporeDateTime(priceRecord.manualPriceUpdatedAt)}
        </p>
      )}
      <ManualPriceOverride holding={holding} onSave={onManualSave} />
    </div>
  );
}

export function StockHoldingsTable() {
  const { data, stockData, optionsData, services, refresh } = usePortfolio();
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const fxRateValid = stockData?.fxRateValid ?? false;
  const fxRate = stockData?.fxRate ?? null;
  const holdings = stockData?.holdings ?? [];
  const transactions = stockData?.transactions ?? [];
  const contributions = data?.contributions ?? [];

  const priceByPosition = useMemo(() => {
    const map = new Map<string, StockPrice>();
    for (const price of stockData?.prices ?? []) {
      map.set(`${price.market}-${price.ticker}`, price);
    }
    return map;
  }, [stockData?.prices]);

  const filtered = useMemo(() => {
    if (marketFilter === "ALL") return holdings;
    return holdings.filter((h) => h.market === marketFilter);
  }, [holdings, marketFilter]);

  const summary = useMemo(
    () =>
      buildStockPortfolioSummary(
        holdings,
        contributions,
        transactions,
        fxRate,
        sumRealizedOptionsPlUsd(optionsData?.trades ?? []),
        stockData?.cashFlow.fxConversions ?? []
      ),
    [holdings, contributions, transactions, fxRate, optionsData?.trades, stockData?.cashFlow.fxConversions]
  );

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      await services.stockPriceUpdates.refreshAllPrices();
      refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualPriceSave = (
    holding: CalculatedHolding,
    manualPrice: number
  ) => {
    services.stockTracker.upsertManualPrice(
      holding.market,
      holding.ticker,
      manualPrice
    );
    refresh();
  };

  return (
    <div className="space-y-6">
      {!fxRateValid && holdings.some((h) => h.market === "US") && (
        <FxRateErrorBanner />
      )}

      {marketFilter === "ALL" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard
              label="Total Stock Value"
              value={formatSgd(summary.allMarketTotalValueSgd)}
              highlight
              icon={<Wallet size={18} />}
              subValue={`Holdings ${formatSgd(summary.totalStockHoldingsSgd)}`}
            />
            <SummaryCard
              label="Stock P/L"
              value={formatSgd(summary.allMarketPLSgd)}
              trend={plTrend(summary.allMarketPLSgd)}
              icon={<TrendingUp size={18} />}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard
              label="Total Stock Contribution"
              value={formatSgd(summary.totalStockContributionSgd)}
              icon={<PiggyBank size={18} />}
              trend="neutral"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard
              label="US Total Value"
              value={formatSgd(summary.usTotalValueSgd)}
              subValue={formatUsd(summary.usTotalValueUsd)}
            />
            <SummaryCard
              label="US Available Cash"
              value={formatSgd(summary.usAvailableTradingCashSgd)}
              subValue={formatUsd(summary.usAvailableTradingCashUsd)}
              trend="neutral"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard
              label="SG Total Value"
              value={formatSgd(summary.sgTotalValueSgd)}
            />
            <SummaryCard
              label="SG Available Cash"
              value={formatSgd(summary.sgAvailableTradingCashSgd)}
              trend="neutral"
            />
          </div>
        </div>
      )}

      {marketFilter === "US" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="US Total Value"
            value={formatSgd(summary.usTotalValueSgd)}
            subValue={formatUsd(summary.usTotalValueUsd)}
          />
          <SummaryCard
            label="US Available Cash"
            value={formatSgd(summary.usAvailableTradingCashSgd)}
            subValue={formatUsd(summary.usAvailableTradingCashUsd)}
            trend="neutral"
          />
          <SummaryCard
            label="US Market P/L"
            value={formatSgd(summary.usMarketPLSgd)}
            trend={plTrend(summary.usMarketPLSgd)}
            subValue={formatUsd(summary.usMarketPLUsd)}
          />
          <SummaryCard
            label="US Stock Contribution"
            value={formatSgd(summary.usStockContributionSgd)}
            subValue={formatUsd(summary.usStockContributionUsd)}
            trend="neutral"
            icon={<PiggyBank size={18} />}
          />
        </div>
      )}

      {marketFilter === "SG" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="SG Total Value"
            value={formatSgd(summary.sgTotalValueSgd)}
          />
          <SummaryCard
            label="SG Available Cash"
            value={formatSgd(summary.sgAvailableTradingCashSgd)}
            trend="neutral"
          />
          <SummaryCard
            label="SG Market P/L"
            value={formatSgd(summary.sgMarketPLSgd)}
            trend={plTrend(summary.sgMarketPLSgd)}
          />
          <SummaryCard
            label="SG Stock Contribution"
            value={formatSgd(summary.sgStockContributionSgd)}
            trend="neutral"
            icon={<PiggyBank size={18} />}
          />
        </div>
      )}

      <p className="text-xs text-slate-500">
        {coerceNumber(summary.openPositionCount)} open position
        {coerceNumber(summary.openPositionCount) === 1 ? "" : "s"} · Auto prices (US 6:00 AM
        SGT · SG 6:00 PM SGT) · Manual override available when auto is missing.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRefreshPrices}
          disabled={refreshing || holdings.length === 0}
        >
          <RefreshCw
            size={14}
            className={`mr-1.5 inline ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing…" : "Refresh Prices"}
        </Button>
        {(["ALL", "US", "SG"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setMarketFilter(filter)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              marketFilter === filter
                ? "bg-accent text-white"
                : "bg-surface-card text-slate-400 hover:text-white"
            }`}
          >
            {filter === "ALL" ? "All Markets" : filter}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-border/60">
        <table className="w-full text-sm">
          <thead className="bg-surface/60">
            <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Avg Cost</th>
              <th className="px-4 py-3">Cost Basis</th>
              <th className="px-4 py-3">Current Price</th>
              <th className="px-4 py-3">Market Value</th>
              <th className="px-4 py-3">Unrealised P/L</th>
              <th className="px-4 py-3">Realised P/L</th>
              <th className="px-4 py-3">Dividends</th>
              <th className="px-4 py-3">SGD Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  <p>No holdings yet.</p>
                  <p className="mt-2 text-xs text-slate-600">
                    Add your first stock transaction.
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((holding) => {
                const priceRecord = priceByPosition.get(
                  `${holding.market}-${holding.ticker}`
                );

                return (
                  <tr
                    key={`${holding.market}-${holding.ticker}`}
                    className="border-b border-surface-border/40 last:border-0 hover:bg-surface/30"
                  >
                    <td className="px-4 py-3 text-slate-300">{holding.market}</td>
                    <td className="px-4 py-3 font-medium text-white">
                      {holding.ticker}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {holding.assetName}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {coerceNumber(holding.quantity)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatNativeValue(holding, holding.averageCost)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatNativeValue(holding, holding.totalCost)}
                    </td>
                    <td className="px-4 py-3">
                      <PriceDisplay
                        holding={holding}
                        priceRecord={priceRecord}
                        onManualSave={(price) =>
                          handleManualPriceSave(holding, price)
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <MarketValueCell
                        holding={holding}
                        fxRateValid={fxRateValid}
                      />
                    </td>
                    <td
                      className={`px-4 py-3 ${plColorClass(
                        holding.unrealisedPL,
                        holding.currentPrice == null
                      )}`}
                    >
                      {holding.currentPrice != null
                        ? formatNativeValue(holding, holding.unrealisedPL)
                        : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 ${plColorClass(holding.realisedPL)}`}
                    >
                      {formatNativeValue(holding, holding.realisedPL)}
                    </td>
                    <td
                      className={`px-4 py-3 ${plColorClass(holding.dividendIncome)}`}
                    >
                      {formatNativeValue(holding, holding.dividendIncome)}
                    </td>
                    <td className="px-4 py-3">
                      <SgdValueCell holding={holding} fxRateValid={fxRateValid} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
