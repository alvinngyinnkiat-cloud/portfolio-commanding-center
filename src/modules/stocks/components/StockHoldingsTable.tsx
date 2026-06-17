"use client";

import { useMemo, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { CalculatedHolding, StockMarket, StockPrice } from "@/core/domain/types";
import {
  buildStockPortfolioSummary,
  plTrend,
} from "@/core/calculations/stocks/summary";
import {
  filterPositionsByMarket,
  splitOpenAndClosedPositions,
  summarizePositionOverview,
} from "@/core/calculations/stocks/holdings";
import { formatSgd, formatSingaporeDateTime, formatUsd, formatPercent } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { UsMarketValueBreakdownCards } from "./UsMarketValueBreakdownCards";
import { SgMarketValueBreakdownCards } from "./SgMarketValueBreakdownCards";
import { StackedValue } from "@/shared/components/ui/StackedValue";
import { Modal } from "@/shared/components/ui/Modal";
import {
  dataTableHeadClass,
  dataTableRowClass,
  dataTableTdLeftClass,
  dataTableTdRightClass,
  dataTableThLeftClass,
  dataTableThRightClass,
  dataTableWrapperClass,
  dataTableClass,
} from "@/shared/components/ui/data-table";
import { FxRateErrorBanner } from "@/shared/components/ui/FxRateErrorBanner";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import {
  resolvePriceSource,
} from "@/core/calculations/stocks/price-normalize";
import type { PriceDisplaySource } from "@/core/domain/types";
import { TrendingUp, RefreshCw, PiggyBank, Briefcase, Archive, DollarSign, Pencil } from "lucide-react";

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

function priceSourceClass(source: PriceDisplaySource): string {
  if (source === "Auto") return "text-emerald-400";
  if (source === "Manual") return "text-amber-300";
  return "text-slate-500";
}

function unrealisedPercent(holding: CalculatedHolding): number | null {
  if (holding.currentPrice == null || holding.totalCost <= 0) return null;
  return (holding.unrealisedPL / holding.totalCost) * 100;
}

function StockPriceModal({
  holding,
  priceRecord,
  onClose,
  onSave,
}: {
  holding: CalculatedHolding;
  priceRecord?: StockPrice;
  onClose: () => void;
  onSave: (price: number) => void;
}) {
  const source = resolvePriceSource(priceRecord);
  const [value, setValue] = useState(
    holding.currentPrice != null ? String(holding.currentPrice) : ""
  );
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Price must be greater than zero");
      return;
    }
    onSave(parsed);
    onClose();
  };

  const sourceSecondary =
    source === "Auto" && priceRecord?.lastPriceUpdate
      ? `Auto • ${formatSingaporeDateTime(priceRecord.lastPriceUpdate).split(",")[0]?.trim() ?? ""}`
      : source === "Manual" && priceRecord?.manualPriceUpdatedAt
        ? `Manual • ${formatSingaporeDateTime(priceRecord.manualPriceUpdatedAt).split(",")[0]?.trim() ?? ""}`
        : source;

  return (
    <Modal title={`Edit Price — ${holding.ticker}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3">
          <StackedValue
            primary={
              holding.currentPrice != null
                ? formatNativeValue(holding, holding.currentPrice)
                : "—"
            }
            secondary={sourceSecondary}
          />
        </div>
        <Input
          label="Manual Override"
          type="number"
          step="any"
          min="0"
          placeholder="Enter price"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          error={error ?? undefined}
          hint="Overrides auto price for unrealised P/L and market value."
        />
        <p className="text-xs text-slate-500">
          Price Source:{" "}
          <span className={priceSourceClass(source)}>{source}</span>
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Price</Button>
        </div>
      </div>
    </Modal>
  );
}

function CompactPriceCell({
  holding,
  priceRecord,
  onEdit,
}: {
  holding: CalculatedHolding;
  priceRecord?: StockPrice;
  onEdit: () => void;
}) {
  const source = resolvePriceSource(priceRecord);
  const sourceSecondary =
    source === "Auto" && priceRecord?.lastPriceUpdate
      ? `Auto • ${formatSingaporeDateTime(priceRecord.lastPriceUpdate).split(",")[0]?.trim() ?? ""}`
      : source === "Manual" && priceRecord?.manualPriceUpdatedAt
        ? `Manual • ${formatSingaporeDateTime(priceRecord.manualPriceUpdatedAt).split(",")[0]?.trim() ?? ""}`
        : source;

  return (
    <div className="flex items-center justify-end gap-1">
      <StackedValue
        align="right"
        primary={
          holding.currentPrice != null
            ? formatNativeValue(holding, holding.currentPrice)
            : "Missing"
        }
        secondary={holding.currentPrice != null ? sourceSecondary : "Set price"}
        primaryClassName={
          holding.currentPrice != null
            ? "font-medium text-white"
            : "font-medium text-slate-500"
        }
      />
      <button
        type="button"
        onClick={onEdit}
        title="Edit price"
        className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-surface/80 hover:text-white"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}

function MarketValueCell({
  holding,
  fxRateValid,
}: {
  holding: CalculatedHolding;
  fxRateValid: boolean;
}) {
  if (holding.currentPrice == null) {
    return <span className="text-slate-500">Missing</span>;
  }

  if (holding.market === "US") {
    return (
      <StackedValue
        align="right"
        primary={formatUsd(holding.marketValue)}
        secondary={
          fxRateValid && holding.sgdValue != null
            ? `≈ ${formatSgd(holding.sgdValue)}`
            : "FX required"
        }
      />
    );
  }

  return (
    <StackedValue
      align="right"
      primary={formatSgd(holding.marketValue)}
      secondary={undefined}
    />
  );
}

function UnrealisedPlCell({ holding }: { holding: CalculatedHolding }) {
  const pct = unrealisedPercent(holding);
  if (holding.currentPrice == null) {
    return <span className="text-slate-500">—</span>;
  }

  return (
    <StackedValue
      align="right"
      primary={formatNativeValue(holding, holding.unrealisedPL)}
      secondary={pct != null ? formatPercent(pct) : undefined}
      primaryClassName={`font-medium ${plColorClass(holding.unrealisedPL)}`}
      secondaryClassName={`text-[11px] ${plColorClass(holding.unrealisedPL)}`}
    />
  );
}

function ClosedPositionsTable({ positions }: { positions: CalculatedHolding[] }) {
  if (positions.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-slate-500">
        No closed positions.
      </p>
    );
  }

  return (
    <div className={dataTableWrapperClass}>
      <table className={dataTableClass}>
        <thead className={dataTableHeadClass}>
          <tr>
            <th className={dataTableThLeftClass}>Market</th>
            <th className={dataTableThLeftClass}>Ticker</th>
            <th className={dataTableThRightClass}>Realised P/L</th>
            <th className={dataTableThRightClass}>Dividends</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((holding) => (
            <tr
              key={`closed-${holding.market}-${holding.ticker}`}
              className={dataTableRowClass}
            >
              <td className={dataTableTdLeftClass}>{holding.market}</td>
              <td className={`${dataTableTdLeftClass} font-medium text-white`}>
                {holding.ticker}
              </td>
              <td className={`${dataTableTdRightClass} ${plColorClass(holding.realisedPL)}`}>
                {formatNativeValue(holding, holding.realisedPL)}
              </td>
              <td className={`${dataTableTdRightClass} ${plColorClass(holding.dividendIncome)}`}>
                {formatNativeValue(holding, holding.dividendIncome)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StockHoldingsTable() {
  const { data, stockData, optionsData, services, refresh } = usePortfolio();
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [priceModal, setPriceModal] = useState<{
    holding: CalculatedHolding;
    priceRecord?: StockPrice;
  } | null>(null);

  const fxRateValid = stockData?.fxRateValid ?? false;
  const fxRate = stockData?.fxRate ?? null;
  const holdings = stockData?.holdings ?? [];
  const allPositions = stockData?.allPositions ?? holdings;
  const transactions = stockData?.transactions ?? [];
  const contributions = data?.contributions ?? [];

  const marketPositions = useMemo(
    () => filterPositionsByMarket(allPositions, marketFilter),
    [allPositions, marketFilter]
  );

  const { open: openPositions, closed: closedPositions } = useMemo(
    () => splitOpenAndClosedPositions(marketPositions),
    [marketPositions]
  );

  const positionOverview = useMemo(
    () => summarizePositionOverview(marketPositions, fxRate),
    [marketPositions, fxRate]
  );

  const priceByPosition = useMemo(() => {
    const map = new Map<string, StockPrice>();
    for (const price of stockData?.prices ?? []) {
      map.set(`${price.market}-${price.ticker}`, price);
    }
    return map;
  }, [stockData?.prices]);

  const filtered = openPositions;

  const brokerUsdCashOverride = data?.settings.brokerUsdCashOverride ?? null;

  const summary = useMemo(
    () =>
      buildStockPortfolioSummary(
        holdings,
        contributions,
        transactions,
        fxRate,
        optionsData?.trades ?? [],
        stockData?.cashFlow.fxConversions ?? [],
        brokerUsdCashOverride
      ),
    [
      holdings,
      contributions,
      transactions,
      fxRate,
      optionsData?.trades,
      stockData?.cashFlow.fxConversions,
      brokerUsdCashOverride,
    ]
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

  const openMarketValueDisplay =
    marketFilter === "US"
      ? {
          value: formatUsd(positionOverview.openMarketValueUsd),
          subValue:
            fxRateValid && positionOverview.openMarketValueUsd > 0
              ? formatSgd(
                  positionOverview.openMarketValueSgd -
                    positionOverview.openMarketValueSgdMarket
                )
              : undefined,
        }
      : marketFilter === "SG"
        ? { value: formatSgd(positionOverview.openMarketValueSgdMarket) }
        : { value: formatSgd(positionOverview.openMarketValueSgd) };

  const closedPlDisplay =
    marketFilter === "US"
      ? {
          value: formatUsd(positionOverview.closedRealisedPLUsd),
          trend: plTrend(positionOverview.closedRealisedPLUsd),
        }
      : marketFilter === "SG"
        ? {
            value: formatSgd(positionOverview.closedRealisedPLSgdMarket),
            trend: plTrend(positionOverview.closedRealisedPLSgdMarket),
          }
        : {
            value: formatSgd(positionOverview.closedRealisedPLSgd),
            trend: plTrend(positionOverview.closedRealisedPLSgd),
          };

  const dividendsDisplay =
    marketFilter === "US"
      ? { value: formatUsd(positionOverview.totalDividendsUsd) }
      : marketFilter === "SG"
        ? { value: formatSgd(positionOverview.totalDividendsSgdMarket) }
        : { value: formatSgd(positionOverview.totalDividendsSgd) };

  const marketLabel =
    marketFilter === "ALL" ? "All Markets" : marketFilter;

  return (
    <div className="min-w-0 space-y-6">
      {!fxRateValid && holdings.some((h) => h.market === "US") && (
        <FxRateErrorBanner />
      )}

      <div className="flex flex-wrap items-center gap-2">
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

      <div>
        <h3 className="text-sm font-semibold text-white">
          Position Overview · {marketLabel}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Open and closed positions for this market view.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            label="Total Open Positions"
            value={String(positionOverview.openPositionCount)}
            icon={<Briefcase size={18} />}
            subValue="Positive quantity"
          />
          <SummaryCard
            label="Total Closed Positions"
            value={String(positionOverview.closedPositionCount)}
            icon={<Archive size={18} />}
            subValue="Fully sold positions"
          />
          <SummaryCard
            label="Open Market Value"
            value={openMarketValueDisplay.value}
            subValue={openMarketValueDisplay.subValue}
            icon={<TrendingUp size={18} />}
          />
          <SummaryCard
            label="Closed Realised P/L"
            value={closedPlDisplay.value}
            trend={closedPlDisplay.trend}
            icon={<TrendingUp size={18} />}
          />
          <SummaryCard
            label="Total Dividends"
            value={dividendsDisplay.value}
            icon={<DollarSign size={18} />}
          />
        </div>
      </div>

      {marketFilter === "US" && (
        <div className="space-y-4">
          <UsMarketValueBreakdownCards summary={summary} />
          <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      )}

      {marketFilter === "SG" && (
        <div className="space-y-4">
          <SgMarketValueBreakdownCards summary={summary} />
          <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Auto prices (US 6:00 AM SGT · SG 6:00 PM SGT) · Manual override
          available when auto is missing.
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRefreshPrices}
          disabled={refreshing || openPositions.length === 0}
        >
          <RefreshCw
            size={14}
            className={`mr-1.5 inline ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing…" : "Refresh Prices"}
        </Button>
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Open Positions</h3>
          <p className="mt-1 text-xs text-slate-500">
            Active holdings with positive quantity.
          </p>
        </div>
        <div className={dataTableWrapperClass}>
          <table className={dataTableClass}>
            <thead className={dataTableHeadClass}>
              <tr>
                <th className={`${dataTableThLeftClass} w-[3rem]`}>Mkt</th>
                <th className={`${dataTableThLeftClass} w-[4rem]`}>Ticker</th>
                <th className={`${dataTableThRightClass} w-[5.5rem]`}>Qty / Avg</th>
                <th className={`${dataTableThRightClass} w-[5.5rem]`}>Cost Basis</th>
                <th className={`${dataTableThRightClass} w-[6.5rem]`}>Price</th>
                <th className={`${dataTableThRightClass} w-[6.5rem]`}>Mkt Value</th>
                <th className={`${dataTableThRightClass} w-[6rem]`}>Unrealised</th>
                <th className={`${dataTableThRightClass} w-[5rem]`}>Realised</th>
                <th className={`${dataTableThRightClass} w-[5rem]`}>Div</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-2 py-6 text-center text-slate-500"
                  >
                    <p>No open positions.</p>
                    <p className="mt-2 text-xs text-slate-600">
                      Add a stock transaction or switch market filter.
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
                      key={`open-${holding.market}-${holding.ticker}`}
                      className={dataTableRowClass}
                    >
                      <td className={dataTableTdLeftClass}>{holding.market}</td>
                      <td className={`${dataTableTdLeftClass} font-medium text-white`}>
                        {holding.ticker}
                      </td>
                      <td className={dataTableTdRightClass}>
                        <StackedValue
                          align="right"
                          primary={String(coerceNumber(holding.quantity))}
                          secondary={formatNativeValue(holding, holding.averageCost)}
                        />
                      </td>
                      <td className={dataTableTdRightClass}>
                        {formatNativeValue(holding, holding.totalCost)}
                      </td>
                      <td className={dataTableTdRightClass}>
                        <CompactPriceCell
                          holding={holding}
                          priceRecord={priceRecord}
                          onEdit={() =>
                            setPriceModal({ holding, priceRecord })
                          }
                        />
                      </td>
                      <td className={dataTableTdRightClass}>
                        <MarketValueCell
                          holding={holding}
                          fxRateValid={fxRateValid}
                        />
                      </td>
                      <td className={dataTableTdRightClass}>
                        <UnrealisedPlCell holding={holding} />
                      </td>
                      <td
                        className={`${dataTableTdRightClass} ${plColorClass(holding.realisedPL)}`}
                      >
                        {formatNativeValue(holding, holding.realisedPL)}
                      </td>
                      <td
                        className={`${dataTableTdRightClass} ${plColorClass(holding.dividendIncome)}`}
                      >
                        {formatNativeValue(holding, holding.dividendIncome)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Closed Positions</h3>
          <p className="mt-1 text-xs text-slate-500">
            Fully sold positions — realised P/L and dividends are preserved.
          </p>
        </div>
        <ClosedPositionsTable positions={closedPositions} />
      </section>

      {priceModal && (
        <StockPriceModal
          holding={priceModal.holding}
          priceRecord={priceModal.priceRecord}
          onClose={() => setPriceModal(null)}
          onSave={(price) => handleManualPriceSave(priceModal.holding, price)}
        />
      )}
    </div>
  );
}
