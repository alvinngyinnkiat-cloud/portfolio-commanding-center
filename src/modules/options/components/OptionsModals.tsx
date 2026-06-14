"use client";

import { useMemo, useState } from "react";
import type { OptionsOpenTradeRow, OptionsStrategy, OptionsTrade } from "@/core/domain/types/options";
import {
  calculateRealizedPlUsd,
  calculateRemainingCapacityUsd,
  calculateUnrealizedPlUsd,
  calculateVerticalSpreadMetrics,
  calculateIronCondorMetrics,
  calculateOptionDollarValue,
  calculatePerShareOptionPrice,
  defaultSplitForTradeType,
  isVerticalSpreadStrategy,
  isIronCondorStrategy,
  requiresManualMaxRisk,
  sumOpenRiskUsd,
  type CloseTradeDraft,
  type ClosedTradeEditDraft,
  type OpenTradeDraft,
} from "@/core/calculations/options";
import { buildUsAvailableCashResult } from "@/core/calculations/us-cash";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Select } from "@/shared/components/ui/Select";
import { Modal } from "@/shared/components/ui/Modal";
import { formatUsd } from "@/shared/lib/format";
import { capacityLabel, STRATEGY_OPTIONS } from "./options-utils";
import { deriveCapacityStatus } from "@/core/calculations/options/capacity";
import { splitForTrade } from "@/core/calculations/options/split";
import { usePortfolio } from "@/context/PortfolioContext";

function premiumOptionPriceFromTrade(trade: OptionsTrade): string {
  const price = calculatePerShareOptionPrice(trade.openPremiumUsd, trade.contracts);
  return price != null ? price.toFixed(2) : "";
}

function parsePremiumDollarValue(
  optionPriceStr: string,
  contracts: number
): number | null {
  const optionPrice =
    optionPriceStr.trim() === "" ? null : parseFloat(optionPriceStr);
  if (
    optionPrice == null ||
    !Number.isFinite(optionPrice) ||
    optionPrice < 0 ||
    !Number.isInteger(contracts) ||
    contracts <= 0
  ) {
    return null;
  }
  return calculateOptionDollarValue(optionPrice, contracts);
}

const emptyOpenForm = {
  tradeType: "personal" as const,
  strategy: "bullPut" as const,
  strategyLabel: "",
  underlying: "",
  contracts: "1",
  shortStrikeUsd: "",
  longStrikeUsd: "",
  bullPutShortStrikeUsd: "",
  bullPutLongStrikeUsd: "",
  bearCallShortStrikeUsd: "",
  bearCallLongStrikeUsd: "",
  expirationDate: "",
  openDate: new Date().toISOString().slice(0, 10),
  openPremiumOptionPrice: "",
  openFeesUsd: "0",
  maxRiskUsd: "",
  userSharePercent: "55",
  clientSharePercent: "45",
  notes: "",
};

type OpenTradeForm = Omit<typeof emptyOpenForm, "strategy" | "tradeType"> & {
  tradeType: "personal" | "shared";
  strategy: OptionsStrategy;
  underlyingPriceUsd?: string;
};

function buildClosedEditFormState(trade: OptionsTrade) {
  const closeDebitOptionPrice =
    trade.closePremiumUsd != null && trade.contracts > 0
      ? calculatePerShareOptionPrice(trade.closePremiumUsd, trade.contracts)
      : null;

  return {
    tradeType: trade.tradeType,
    strategy: trade.strategy,
    strategyLabel: trade.strategyLabel ?? "",
    underlying: trade.underlying,
    contracts: String(trade.contracts),
    shortStrikeUsd:
      trade.shortStrikeUsd != null ? String(trade.shortStrikeUsd) : "",
    longStrikeUsd:
      trade.longStrikeUsd != null ? String(trade.longStrikeUsd) : "",
    bullPutShortStrikeUsd:
      trade.bullPutShortStrikeUsd != null
        ? String(trade.bullPutShortStrikeUsd)
        : "",
    bullPutLongStrikeUsd:
      trade.bullPutLongStrikeUsd != null
        ? String(trade.bullPutLongStrikeUsd)
        : "",
    bearCallShortStrikeUsd:
      trade.bearCallShortStrikeUsd != null
        ? String(trade.bearCallShortStrikeUsd)
        : "",
    bearCallLongStrikeUsd:
      trade.bearCallLongStrikeUsd != null
        ? String(trade.bearCallLongStrikeUsd)
        : "",
    expirationDate: trade.expirationDate,
    openDate: trade.openDate,
    openPremiumOptionPrice: premiumOptionPriceFromTrade(trade),
    openFeesUsd: String(trade.openFeesUsd),
    maxRiskUsd: String(trade.maxRiskUsd),
    userSharePercent: String(trade.userSharePercent),
    clientSharePercent: String(trade.clientSharePercent),
    notes: trade.notes ?? "",
    closeDate: trade.closeDate ?? "",
    closeDebitOptionPrice:
      closeDebitOptionPrice != null ? closeDebitOptionPrice.toFixed(2) : "0",
    closeFeesUsd: String(trade.closeFeesUsd ?? 0),
  };
}

export function OpenTradeModal({
  onClose,
  editTrade,
}: {
  onClose: () => void;
  editTrade?: OptionsTrade;
}) {
  const { optionsData, data, stockData, services, refresh } = usePortfolio();
  const settings = optionsData?.settings;
  const [form, setForm] = useState<OpenTradeForm>(() => {
    if (!editTrade) return { ...emptyOpenForm };
    return {
      tradeType: editTrade.tradeType,
      strategy: editTrade.strategy,
      strategyLabel: editTrade.strategyLabel ?? "",
      underlying: editTrade.underlying,
      contracts: String(editTrade.contracts),
      shortStrikeUsd:
        editTrade.shortStrikeUsd != null ? String(editTrade.shortStrikeUsd) : "",
      longStrikeUsd:
        editTrade.longStrikeUsd != null ? String(editTrade.longStrikeUsd) : "",
      bullPutShortStrikeUsd:
        editTrade.bullPutShortStrikeUsd != null
          ? String(editTrade.bullPutShortStrikeUsd)
          : "",
      bullPutLongStrikeUsd:
        editTrade.bullPutLongStrikeUsd != null
          ? String(editTrade.bullPutLongStrikeUsd)
          : "",
      bearCallShortStrikeUsd:
        editTrade.bearCallShortStrikeUsd != null
          ? String(editTrade.bearCallShortStrikeUsd)
          : "",
      bearCallLongStrikeUsd:
        editTrade.bearCallLongStrikeUsd != null
          ? String(editTrade.bearCallLongStrikeUsd)
          : "",
      expirationDate: editTrade.expirationDate,
      openDate: editTrade.openDate,
      openPremiumOptionPrice: premiumOptionPriceFromTrade(editTrade),
      openFeesUsd: String(editTrade.openFeesUsd),
      maxRiskUsd: String(editTrade.maxRiskUsd),
      userSharePercent: String(editTrade.userSharePercent),
      clientSharePercent: String(editTrade.clientSharePercent),
      notes: editTrade.notes ?? "",
      underlyingPriceUsd:
        editTrade.underlyingPriceUsd != null
          ? String(editTrade.underlyingPriceUsd)
          : "",
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isVertical = isVerticalSpreadStrategy(form.strategy);
  const isIronCondor = isIronCondorStrategy(form.strategy);
  const showManualMaxRisk = requiresManualMaxRisk(form.strategy);

  const spreadPreview = useMemo(() => {
    if (!isVertical) return null;
    const strategy = form.strategy;
    if (!isVerticalSpreadStrategy(strategy)) return null;
    const shortStrike = parseFloat(form.shortStrikeUsd);
    const longStrike = parseFloat(form.longStrikeUsd);
    const contracts = parseInt(form.contracts, 10);
    const openPremiumUsd = parsePremiumDollarValue(
      form.openPremiumOptionPrice,
      contracts
    );
    const openFees = parseFloat(form.openFeesUsd);
    if (
      !Number.isFinite(shortStrike) ||
      !Number.isFinite(longStrike) ||
      !Number.isInteger(contracts) ||
      contracts <= 0 ||
      openPremiumUsd == null ||
      !Number.isFinite(openFees)
    ) {
      return null;
    }
    return calculateVerticalSpreadMetrics({
      strategy,
      shortStrikeUsd: shortStrike,
      longStrikeUsd: longStrike,
      contracts,
      openPremiumUsd,
      openFeesUsd: openFees,
    });
  }, [
    isVertical,
    form.strategy,
    form.shortStrikeUsd,
    form.longStrikeUsd,
    form.contracts,
    form.openPremiumOptionPrice,
    form.openFeesUsd,
  ]);

  const ironCondorPreview = useMemo(() => {
    if (!isIronCondor) return null;
    const bullPutShort = parseFloat(form.bullPutShortStrikeUsd);
    const bullPutLong = parseFloat(form.bullPutLongStrikeUsd);
    const bearCallShort = parseFloat(form.bearCallShortStrikeUsd);
    const bearCallLong = parseFloat(form.bearCallLongStrikeUsd);
    const contracts = parseInt(form.contracts, 10);
    const openPremiumUsd = parsePremiumDollarValue(
      form.openPremiumOptionPrice,
      contracts
    );
    const openFees = parseFloat(form.openFeesUsd);
    if (
      !Number.isFinite(bullPutShort) ||
      !Number.isFinite(bullPutLong) ||
      !Number.isFinite(bearCallShort) ||
      !Number.isFinite(bearCallLong) ||
      !Number.isInteger(contracts) ||
      contracts <= 0 ||
      openPremiumUsd == null ||
      !Number.isFinite(openFees)
    ) {
      return null;
    }
    return calculateIronCondorMetrics({
      bullPutShortStrikeUsd: bullPutShort,
      bullPutLongStrikeUsd: bullPutLong,
      bearCallShortStrikeUsd: bearCallShort,
      bearCallLongStrikeUsd: bearCallLong,
      contracts,
      openPremiumUsd,
      openFeesUsd: openFees,
    });
  }, [
    isIronCondor,
    form.bullPutShortStrikeUsd,
    form.bullPutLongStrikeUsd,
    form.bearCallShortStrikeUsd,
    form.bearCallLongStrikeUsd,
    form.contracts,
    form.openPremiumOptionPrice,
    form.openFeesUsd,
  ]);

  const autoRiskPreview = spreadPreview?.maxRiskUsd ?? ironCondorPreview?.maxRiskUsd;

  const contractsCount = parseInt(form.contracts, 10);
  const openPremiumOptionPrice =
    form.openPremiumOptionPrice.trim() === ""
      ? null
      : parseFloat(form.openPremiumOptionPrice);
  const openPremiumDollarValue = parsePremiumDollarValue(
    form.openPremiumOptionPrice,
    contractsCount
  );

  const capacityPreview = useMemo(() => {
    if (!optionsData || !data || !stockData) return null;
    const cash = buildUsAvailableCashResult({
      contributions: data.contributions,
      stockTransactions: stockData.transactions,
      fxRate: optionsData.fxRate,
      realizedOptionsPlUsd: optionsData.summary.totalRealizedPlUsd,
    });
    const openRisk = sumOpenRiskUsd(optionsData.trades);
    let addRisk = 0;
    if (!editTrade) {
      if (autoRiskPreview != null && autoRiskPreview > 0) {
        addRisk = autoRiskPreview;
      } else if (showManualMaxRisk) {
        const draftRisk = parseFloat(form.maxRiskUsd);
        if (Number.isFinite(draftRisk) && draftRisk > 0) addRisk = draftRisk;
      }
    }
    const projected = calculateRemainingCapacityUsd(
      cash.usAvailableCashUsd,
      openRisk + addRisk
    );
    return {
      cash: cash.usAvailableCashUsd,
      openRisk,
      addRisk,
      projected,
      status: deriveCapacityStatus(projected),
    };
  }, [
    optionsData,
    data,
    stockData,
    form.maxRiskUsd,
    autoRiskPreview,
    showManualMaxRisk,
    editTrade,
  ]);

  const handleStrategyChange = (strategy: OptionsStrategy) => {
    setForm((prev) => ({
      ...prev,
      strategy,
      shortStrikeUsd: isVerticalSpreadStrategy(strategy) ? prev.shortStrikeUsd : "",
      longStrikeUsd: isVerticalSpreadStrategy(strategy) ? prev.longStrikeUsd : "",
      bullPutShortStrikeUsd: isIronCondorStrategy(strategy) ? prev.bullPutShortStrikeUsd : "",
      bullPutLongStrikeUsd: isIronCondorStrategy(strategy) ? prev.bullPutLongStrikeUsd : "",
      bearCallShortStrikeUsd: isIronCondorStrategy(strategy) ? prev.bearCallShortStrikeUsd : "",
      bearCallLongStrikeUsd: isIronCondorStrategy(strategy) ? prev.bearCallLongStrikeUsd : "",
      maxRiskUsd: requiresManualMaxRisk(strategy) ? prev.maxRiskUsd : "",
      strategyLabel: strategy === "custom" ? prev.strategyLabel : "",
    }));
  };

  const handleTradeTypeChange = (tradeType: "personal" | "shared") => {
    const split = defaultSplitForTradeType(tradeType, settings!);
    setForm((prev) => ({
      ...prev,
      tradeType,
      userSharePercent: String(split.userSharePercent),
      clientSharePercent: String(split.clientSharePercent),
    }));
  };

  const handleSubmit = async () => {
    if (!settings) return;
    setSubmitting(true);
    const contracts = parseInt(form.contracts, 10);
    const openPremiumUsd = parsePremiumDollarValue(
      form.openPremiumOptionPrice,
      contracts
    );
    if (openPremiumUsd == null) {
      setSubmitting(false);
      setErrors({ openPremiumUsd: "Enter a valid premium option price" });
      return;
    }

    const draft: OpenTradeDraft = {
      id: editTrade?.id,
      tradeType: form.tradeType,
      strategy: form.strategy,
      strategyLabel: form.strategyLabel || undefined,
      underlying: form.underlying,
      contracts,
      shortStrikeUsd: isVertical ? parseFloat(form.shortStrikeUsd) : undefined,
      longStrikeUsd: isVertical ? parseFloat(form.longStrikeUsd) : undefined,
      bullPutShortStrikeUsd: isIronCondor
        ? parseFloat(form.bullPutShortStrikeUsd)
        : undefined,
      bullPutLongStrikeUsd: isIronCondor
        ? parseFloat(form.bullPutLongStrikeUsd)
        : undefined,
      bearCallShortStrikeUsd: isIronCondor
        ? parseFloat(form.bearCallShortStrikeUsd)
        : undefined,
      bearCallLongStrikeUsd: isIronCondor
        ? parseFloat(form.bearCallLongStrikeUsd)
        : undefined,
      expirationDate: form.expirationDate,
      openDate: form.openDate,
      openPremiumUsd,
      openFeesUsd: parseFloat(form.openFeesUsd),
      maxRiskUsd: showManualMaxRisk ? parseFloat(form.maxRiskUsd) : undefined,
      userSharePercent: parseFloat(form.userSharePercent),
      clientSharePercent: parseFloat(form.clientSharePercent),
      notes: form.notes || undefined,
      underlyingPriceUsd: (() => {
        const raw = form.underlyingPriceUsd?.trim();
        return editTrade && raw ? parseFloat(raw) : undefined;
      })(),
    };

    const result = services.optionsTrades.openTrade(draft);
    setSubmitting(false);
    if (!result.ok) {
      const map: Record<string, string> = {};
      for (const err of result.errors) map[err.field] = err.message;
      setErrors(map);
      return;
    }

    if (
      capacityPreview &&
      capacityPreview.projected < 0 &&
      !window.confirm(
        "Projected capacity is negative (NO TRADE). Open this trade anyway?"
      )
    ) {
      return;
    }

    refresh();
    onClose();
  };

  return (
    <Modal title={editTrade ? "Edit Open Trade" : "Open New Trade"} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="radio"
              checked={form.tradeType === "personal"}
              onChange={() => handleTradeTypeChange("personal")}
            />
            Personal (100%)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="radio"
              checked={form.tradeType === "shared"}
              onChange={() => handleTradeTypeChange("shared")}
            />
            Shared
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Strategy"
            value={form.strategy}
            onChange={(e) => handleStrategyChange(e.target.value as OptionsStrategy)}
            options={STRATEGY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          {isVertical && (
            <p className="text-xs text-slate-500 sm:col-span-2">
              Bull Put / Bear Call: enter strikes and premium — max risk is auto-calculated.
            </p>
          )}
          {isIronCondor && (
            <p className="text-xs text-slate-500 sm:col-span-2">
              Iron Condor: one trade (bull put + bear call) — risk uses the wider wing only.
            </p>
          )}
          {showManualMaxRisk && (
            <p className="text-xs text-slate-500 sm:col-span-2">
              Custom strategy: enter max risk manually.
            </p>
          )}
          {form.strategy === "custom" && (
            <Input
              label="Custom label"
              value={form.strategyLabel}
              onChange={(e) => setForm((p) => ({ ...p, strategyLabel: e.target.value }))}
              error={errors.strategyLabel}
            />
          )}
          <Input
            label="Underlying"
            value={form.underlying}
            onChange={(e) => setForm((p) => ({ ...p, underlying: e.target.value }))}
            error={errors.underlying}
          />
          <Input
            label="Contracts"
            type="number"
            min="1"
            value={form.contracts}
            onChange={(e) => setForm((p) => ({ ...p, contracts: e.target.value }))}
            error={errors.contracts}
          />
          {isVertical && (
            <>
              <Input
                label="Short strike"
                type="number"
                step="any"
                min="0"
                value={form.shortStrikeUsd}
                onChange={(e) => setForm((p) => ({ ...p, shortStrikeUsd: e.target.value }))}
                error={errors.shortStrikeUsd}
              />
              <Input
                label="Long strike"
                type="number"
                step="any"
                min="0"
                value={form.longStrikeUsd}
                onChange={(e) => setForm((p) => ({ ...p, longStrikeUsd: e.target.value }))}
                error={errors.longStrikeUsd}
              />
            </>
          )}
          {isIronCondor && (
            <>
              <Input
                label="Bull put short strike"
                type="number"
                step="any"
                min="0"
                value={form.bullPutShortStrikeUsd}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bullPutShortStrikeUsd: e.target.value }))
                }
                error={errors.bullPutShortStrikeUsd}
              />
              <Input
                label="Bull put long strike"
                type="number"
                step="any"
                min="0"
                value={form.bullPutLongStrikeUsd}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bullPutLongStrikeUsd: e.target.value }))
                }
                error={errors.bullPutLongStrikeUsd}
              />
              <Input
                label="Bear call short strike"
                type="number"
                step="any"
                min="0"
                value={form.bearCallShortStrikeUsd}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bearCallShortStrikeUsd: e.target.value }))
                }
                error={errors.bearCallShortStrikeUsd}
              />
              <Input
                label="Bear call long strike"
                type="number"
                step="any"
                min="0"
                value={form.bearCallLongStrikeUsd}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bearCallLongStrikeUsd: e.target.value }))
                }
                error={errors.bearCallLongStrikeUsd}
              />
            </>
          )}
          <Input
            label="Open date"
            type="date"
            value={form.openDate}
            onChange={(e) => setForm((p) => ({ ...p, openDate: e.target.value }))}
            error={errors.openDate}
          />
          <Input
            label="Expiration"
            type="date"
            value={form.expirationDate}
            onChange={(e) => setForm((p) => ({ ...p, expirationDate: e.target.value }))}
            error={errors.expirationDate}
          />
          <Input
            label="Premium Received (Option Price)"
            type="number"
            step="any"
            min="0"
            placeholder="1.00"
            value={form.openPremiumOptionPrice}
            onChange={(e) =>
              setForm((p) => ({ ...p, openPremiumOptionPrice: e.target.value }))
            }
            error={errors.openPremiumUsd}
          />
          <Input
            label="Opening fees (USD)"
            type="number"
            step="any"
            min="0"
            value={form.openFeesUsd}
            onChange={(e) => setForm((p) => ({ ...p, openFeesUsd: e.target.value }))}
            error={errors.openFeesUsd}
          />
          {openPremiumOptionPrice != null && openPremiumDollarValue != null && (
            <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3 text-sm text-slate-400 sm:col-span-2">
              <p>
                Option Price:{" "}
                <span className="font-medium text-slate-200">
                  {openPremiumOptionPrice.toFixed(2)}
                </span>
              </p>
              <p>
                Dollar Value:{" "}
                <span className="font-medium text-slate-200">
                  {formatUsd(openPremiumDollarValue)}
                </span>
              </p>
            </div>
          )}
          {showManualMaxRisk && (
            <Input
              label="Max risk (USD) — manual"
              type="number"
              step="any"
              min="0"
              value={form.maxRiskUsd}
              onChange={(e) => setForm((p) => ({ ...p, maxRiskUsd: e.target.value }))}
              error={errors.maxRiskUsd}
            />
          )}
        </div>

        {spreadPreview && (
          <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3 text-xs text-slate-400">
            <p className="mb-1 text-sm font-medium text-slate-300">Auto-calculated</p>
            <p>Width: ${spreadPreview.widthPerShare.toFixed(2)}/share · {formatUsd(spreadPreview.spreadWidthUsd)} total</p>
            <p>Net credit: {formatUsd(spreadPreview.netCreditUsd)}</p>
            <p>
              75% TP exit price:{" "}
              {calculatePerShareOptionPrice(
                spreadPreview.tpExitPrice75Usd,
                contractsCount
              )?.toFixed(2) ?? "—"}{" "}
              ({formatUsd(spreadPreview.tpExitPrice75Usd)})
            </p>
            <p>Max profit: {formatUsd(spreadPreview.maxProfitUsd)}</p>
            <p>Max risk: {formatUsd(spreadPreview.maxRiskUsd)}</p>
            <p>Breakeven: ${spreadPreview.breakevenUsd.toFixed(2)}</p>
          </div>
        )}

        {ironCondorPreview && (
          <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3 text-xs text-slate-400">
            <p className="mb-1 text-sm font-medium text-slate-300">Auto-calculated</p>
            <p>
              Bull put width: ${ironCondorPreview.bullPutWidthPerShare.toFixed(2)}/share · Bear
              call width: ${ironCondorPreview.bearCallWidthPerShare.toFixed(2)}/share
            </p>
            <p>
              Iron condor width: ${ironCondorPreview.ironCondorWidthPerShare.toFixed(2)}/share ·{" "}
              {formatUsd(ironCondorPreview.spreadWidthUsd)} total
            </p>
            <p>Net credit: {formatUsd(ironCondorPreview.netCreditUsd)}</p>
            <p>
              75% TP exit price:{" "}
              {calculatePerShareOptionPrice(
                ironCondorPreview.tpExitPrice75Usd,
                contractsCount
              )?.toFixed(2) ?? "—"}{" "}
              ({formatUsd(ironCondorPreview.tpExitPrice75Usd)})
            </p>
            <p>Max profit: {formatUsd(ironCondorPreview.maxProfitUsd)}</p>
            <p>Max risk: {formatUsd(ironCondorPreview.maxRiskUsd)}</p>
            <p>
              Breakevens: ${ironCondorPreview.lowerBreakevenUsd.toFixed(2)} – $
              {ironCondorPreview.upperBreakevenUsd.toFixed(2)}
            </p>
          </div>
        )}

        {form.tradeType === "shared" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Your %"
              type="number"
              min="0"
              max="100"
              value={form.userSharePercent}
              onChange={(e) => setForm((p) => ({ ...p, userSharePercent: e.target.value }))}
            />
            <Input
              label="Client %"
              type="number"
              min="0"
              max="100"
              value={form.clientSharePercent}
              onChange={(e) => setForm((p) => ({ ...p, clientSharePercent: e.target.value }))}
            />
          </div>
        )}

        <Input
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />

        {editTrade && (
          <Input
            label="Underlying Price (Fallback)"
            type="number"
            step="any"
            min="0"
            placeholder="195.50"
            value={form.underlyingPriceUsd}
            onChange={(e) =>
              setForm((p) => ({ ...p, underlyingPriceUsd: e.target.value }))
            }
            error={errors.underlyingPriceUsd}
            hint="Only if Scanner has no watchlist price for this ticker."
          />
        )}

        {capacityPreview && (
          <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3 text-xs text-slate-400">
            <p>US Available Cash: {formatUsd(capacityPreview.cash)}</p>
            <p>Current open risk: {formatUsd(capacityPreview.openRisk)}</p>
            {!editTrade && capacityPreview.addRisk > 0 && (
              <p>This trade adds: {formatUsd(capacityPreview.addRisk)}</p>
            )}
            <p>
              Projected capacity: {formatUsd(capacityPreview.projected)} ·{" "}
              {capacityLabel(capacityPreview.status)}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {editTrade ? "Save" : "Open Trade"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function UpdateMarkModal({
  row,
  onClose,
}: {
  row: OptionsOpenTradeRow;
  onClose: () => void;
}) {
  const { services, refresh } = usePortfolio();
  const scannerPrice = row.underlyingPrice;
  const initialOptionPrice =
    row.trade.currentValueUsd != null
      ? calculatePerShareOptionPrice(
          row.trade.currentValueUsd,
          row.trade.contracts
        )
      : null;
  const [value, setValue] = useState(
    initialOptionPrice != null ? initialOptionPrice.toFixed(2) : ""
  );
  const [underlyingValue, setUnderlyingValue] = useState(
    row.trade.underlyingPriceUsd != null
      ? row.trade.underlyingPriceUsd.toFixed(2)
      : ""
  );
  const [error, setError] = useState<string | null>(null);

  const optionPrice = value.trim() === "" ? null : parseFloat(value);
  const dollarValue =
    optionPrice != null && Number.isFinite(optionPrice) && optionPrice >= 0
      ? calculateOptionDollarValue(optionPrice, row.trade.contracts)
      : null;
  const preview =
    dollarValue != null
      ? calculateUnrealizedPlUsd({
          openPremiumUsd: row.trade.openPremiumUsd,
          openFeesUsd: row.trade.openFeesUsd,
          currentValueUsd: dollarValue,
        })
      : null;
  const split = preview != null ? splitForTrade(row.trade, preview) : null;

  const save = () => {
    const update: {
      currentValueUsd?: number | null;
      underlyingPriceUsd?: number | null;
    } = {};

    if (value.trim() !== "") {
      const parsed = parseFloat(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Enter a valid option price");
        return;
      }
      update.currentValueUsd = calculateOptionDollarValue(
        parsed,
        row.trade.contracts
      );
    }

    if (underlyingValue.trim() !== "") {
      const parsedUnderlying = parseFloat(underlyingValue);
      if (!Number.isFinite(parsedUnderlying) || parsedUnderlying <= 0) {
        setError("Enter a valid underlying price");
        return;
      }
      update.underlyingPriceUsd = parsedUnderlying;
    }

    if (
      update.currentValueUsd === undefined &&
      update.underlyingPriceUsd === undefined
    ) {
      setError("Enter at least one value to save");
      return;
    }

    const result = services.optionsTrades.updateMark(row.trade.id, update);
    if (!result.ok) {
      setError(result.errors[0]?.message ?? "Update failed");
      return;
    }
    refresh();
    onClose();
  };

  const clear = () => {
    services.optionsTrades.updateMark(row.trade.id, { currentValueUsd: null });
    refresh();
    onClose();
  };

  return (
    <Modal title={`Update Mark — ${row.trade.underlying}`} onClose={onClose}>
      <div className="space-y-4">
        <Input
          label="Current Market Value (Option Price)"
          type="number"
          step="any"
          min="0"
          placeholder="0.50"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={error ?? undefined}
        />
        <Input
          label="Underlying Price (Fallback)"
          type="number"
          step="any"
          min="0"
          placeholder="195.50"
          value={underlyingValue}
          onChange={(e) => setUnderlyingValue(e.target.value)}
          hint={
            scannerPrice.source !== "unavailable" &&
            scannerPrice.source !== "manual_fallback"
              ? `Scanner price: ${scannerPrice.priceUsd?.toFixed(2)} — fallback not needed`
              : "Scanner has no price — enter manually only if needed"
          }
        />
        {optionPrice != null && dollarValue != null && (
          <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3 text-sm text-slate-400">
            <p>
              Option Price:{" "}
              <span className="font-medium text-slate-200">
                {optionPrice.toFixed(2)}
              </span>
            </p>
            <p>
              Dollar Value:{" "}
              <span className="font-medium text-slate-200">
                {formatUsd(dollarValue)}
              </span>
            </p>
            {preview != null && split && (
              <>
                <p className="mt-2">Unrealized P/L: {formatUsd(preview)}</p>
                <p>Your leg: {formatUsd(split.userLegUsd)}</p>
                <p>Client leg: {formatUsd(split.clientLegUsd)}</p>
              </>
            )}
          </div>
        )}
        <p className="text-xs text-slate-500">
          Option price is for unrealized P/L only. Breakeven difference uses
          Scanner Watchlist prices automatically. Updating mark does not change
          US Available Cash.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={clear}>
            Clear mark
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save Mark</Button>
        </div>
      </div>
    </Modal>
  );
}

export function CloseTradeModal({
  trade,
  onClose,
}: {
  trade: OptionsTrade;
  onClose: () => void;
}) {
  const { services, refresh } = usePortfolio();
  const [form, setForm] = useState({
    closeDate: new Date().toISOString().slice(0, 10),
    closeDebitOptionPrice: "0",
    closeFeesUsd: "0",
    notesAppend: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const closeDebitOptionPrice =
    form.closeDebitOptionPrice.trim() === ""
      ? null
      : parseFloat(form.closeDebitOptionPrice);
  const closeDebitDollarValue =
    closeDebitOptionPrice != null &&
    Number.isFinite(closeDebitOptionPrice) &&
    closeDebitOptionPrice >= 0 &&
    trade.contracts > 0
      ? calculateOptionDollarValue(closeDebitOptionPrice, trade.contracts)
      : null;
  const closeFeesUsd = parseFloat(form.closeFeesUsd);

  const realized =
    closeDebitDollarValue != null && Number.isFinite(closeFeesUsd)
      ? calculateRealizedPlUsd({
          openPremiumUsd: trade.openPremiumUsd,
          openFeesUsd: trade.openFeesUsd,
          closePremiumUsd: closeDebitDollarValue,
          closeFeesUsd: Number.isFinite(closeFeesUsd) ? closeFeesUsd : 0,
        })
      : null;
  const legs = realized != null ? splitForTrade(trade, realized) : null;

  const submit = () => {
    if (trade.contracts <= 0) {
      setErrors({ closePremiumUsd: "Contracts must be greater than zero" });
      return;
    }
    const optionPrice = parseFloat(form.closeDebitOptionPrice);
    if (!Number.isFinite(optionPrice) || optionPrice < 0) {
      setErrors({ closePremiumUsd: "Enter a valid close debit option price" });
      return;
    }
    const closePremiumUsd = calculateOptionDollarValue(
      optionPrice,
      trade.contracts
    );
    const fees = parseFloat(form.closeFeesUsd);
    const draft: CloseTradeDraft = {
      closeDate: form.closeDate,
      closePremiumUsd,
      closeFeesUsd: Number.isFinite(fees) ? fees : 0,
      notesAppend: form.notesAppend || undefined,
    };

    const result = services.optionsTrades.closeTrade(trade.id, draft);
    if (!result.ok) {
      const map: Record<string, string> = {};
      for (const err of result.errors) map[err.field] = err.message;
      setErrors(map);
      return;
    }
    refresh();
    onClose();
  };

  return (
    <Modal title={`Close Trade — ${trade.underlying}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Close date"
            type="date"
            value={form.closeDate}
            onChange={(e) => setForm((p) => ({ ...p, closeDate: e.target.value }))}
            error={errors.closeDate}
          />
          <Input
            label="Close Debit (Option Price)"
            type="number"
            step="any"
            min="0"
            placeholder="0.24"
            value={form.closeDebitOptionPrice}
            onChange={(e) =>
              setForm((p) => ({ ...p, closeDebitOptionPrice: e.target.value }))
            }
            error={errors.closePremiumUsd}
          />
          <Input
            label="Close fees (USD)"
            type="number"
            step="any"
            min="0"
            value={form.closeFeesUsd}
            onChange={(e) => setForm((p) => ({ ...p, closeFeesUsd: e.target.value }))}
            error={errors.closeFeesUsd}
          />
        </div>
        {closeDebitOptionPrice != null && closeDebitDollarValue != null && (
          <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3 text-sm text-slate-400">
            <p>
              Option Price:{" "}
              <span className="font-medium text-slate-200">
                {closeDebitOptionPrice.toFixed(2)}
              </span>
            </p>
            <p>
              Dollar Value:{" "}
              <span className="font-medium text-slate-200">
                {formatUsd(closeDebitDollarValue)}
              </span>
            </p>
          </div>
        )}
        {realized != null && legs && (
          <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3 text-sm text-slate-300">
            <p>Realized P/L: {formatUsd(realized)}</p>
            <p>Your leg: {formatUsd(legs.userLegUsd)}</p>
            <p>Client leg: {formatUsd(legs.clientLegUsd)}</p>
            <p className="mt-2 text-xs text-slate-500">
              US Available Cash will change by {formatUsd(realized)} on confirm (full
              amount for shared trades; client leg is reporting only).
            </p>
          </div>
        )}
        <p className="text-xs text-slate-500">
          Enter broker option price (e.g. 0.24). Close debit dollar value = price ×
          100 × {trade.contracts} contract{trade.contracts === 1 ? "" : "s"}.
        </p>
        <Input
          label="Notes (append)"
          value={form.notesAppend}
          onChange={(e) => setForm((p) => ({ ...p, notesAppend: e.target.value }))}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Confirm Close</Button>
        </div>
      </div>
    </Modal>
  );
}

export function EditClosedTradeModal({
  trade,
  onClose,
}: {
  trade: OptionsTrade;
  onClose: () => void;
}) {
  const { optionsData, services, refresh } = usePortfolio();
  const settings = optionsData?.settings;
  const [form, setForm] = useState(() => buildClosedEditFormState(trade));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isVertical = isVerticalSpreadStrategy(form.strategy);
  const isIronCondor = isIronCondorStrategy(form.strategy);
  const showManualMaxRisk = requiresManualMaxRisk(form.strategy);
  const contracts = parseInt(form.contracts, 10);

  const closeDebitOptionPrice =
    form.closeDebitOptionPrice.trim() === ""
      ? null
      : parseFloat(form.closeDebitOptionPrice);
  const closeDebitDollarValue =
    closeDebitOptionPrice != null &&
    Number.isFinite(closeDebitOptionPrice) &&
    closeDebitOptionPrice >= 0 &&
    Number.isInteger(contracts) &&
    contracts > 0
      ? calculateOptionDollarValue(closeDebitOptionPrice, contracts)
      : null;
  const closeFeesUsd = parseFloat(form.closeFeesUsd);
  const openPremiumOptionPrice =
    form.openPremiumOptionPrice.trim() === ""
      ? null
      : parseFloat(form.openPremiumOptionPrice);
  const openPremiumDollarValue = parsePremiumDollarValue(
    form.openPremiumOptionPrice,
    contracts
  );
  const openFeesUsd = parseFloat(form.openFeesUsd);

  const realizedPreview =
    closeDebitDollarValue != null &&
    openPremiumDollarValue != null &&
    Number.isFinite(openFeesUsd) &&
    Number.isFinite(closeFeesUsd)
      ? calculateRealizedPlUsd({
          openPremiumUsd: openPremiumDollarValue,
          openFeesUsd,
          closePremiumUsd: closeDebitDollarValue,
          closeFeesUsd,
        })
      : null;
  const legsPreview =
    realizedPreview != null
      ? splitForTrade(
          {
            ...trade,
            tradeType: form.tradeType,
            userSharePercent: parseFloat(form.userSharePercent) || 0,
            clientSharePercent: parseFloat(form.clientSharePercent) || 0,
          },
          realizedPreview
        )
      : null;

  const handleStrategyChange = (strategy: OptionsStrategy) => {
    setForm((prev) => ({
      ...prev,
      strategy,
      shortStrikeUsd: isVerticalSpreadStrategy(strategy) ? prev.shortStrikeUsd : "",
      longStrikeUsd: isVerticalSpreadStrategy(strategy) ? prev.longStrikeUsd : "",
      bullPutShortStrikeUsd: isIronCondorStrategy(strategy)
        ? prev.bullPutShortStrikeUsd
        : "",
      bullPutLongStrikeUsd: isIronCondorStrategy(strategy)
        ? prev.bullPutLongStrikeUsd
        : "",
      bearCallShortStrikeUsd: isIronCondorStrategy(strategy)
        ? prev.bearCallShortStrikeUsd
        : "",
      bearCallLongStrikeUsd: isIronCondorStrategy(strategy)
        ? prev.bearCallLongStrikeUsd
        : "",
      maxRiskUsd: requiresManualMaxRisk(strategy) ? prev.maxRiskUsd : "",
      strategyLabel: strategy === "custom" ? prev.strategyLabel : "",
    }));
  };

  const handleTradeTypeChange = (tradeType: "personal" | "shared") => {
    if (!settings) return;
    const split = defaultSplitForTradeType(tradeType, settings);
    setForm((prev) => ({
      ...prev,
      tradeType,
      userSharePercent: String(split.userSharePercent),
      clientSharePercent: String(split.clientSharePercent),
    }));
  };

  const handleSubmit = () => {
    if (!settings) return;
    if (!Number.isInteger(contracts) || contracts <= 0) {
      setErrors({ contracts: "Contracts must be greater than zero" });
      return;
    }
    const optionPrice = parseFloat(form.closeDebitOptionPrice);
    if (!Number.isFinite(optionPrice) || optionPrice < 0) {
      setErrors({ closePremiumUsd: "Enter a valid close debit option price" });
      return;
    }
    const openPremiumUsd = parsePremiumDollarValue(
      form.openPremiumOptionPrice,
      contracts
    );
    if (openPremiumUsd == null) {
      setErrors({ openPremiumUsd: "Enter a valid premium option price" });
      return;
    }

    setSubmitting(true);
    const draft: ClosedTradeEditDraft = {
      tradeType: form.tradeType,
      strategy: form.strategy,
      strategyLabel: form.strategyLabel || undefined,
      underlying: form.underlying,
      expirationDate: form.expirationDate,
      contracts,
      shortStrikeUsd: isVertical ? parseFloat(form.shortStrikeUsd) : undefined,
      longStrikeUsd: isVertical ? parseFloat(form.longStrikeUsd) : undefined,
      bullPutShortStrikeUsd: isIronCondor
        ? parseFloat(form.bullPutShortStrikeUsd)
        : undefined,
      bullPutLongStrikeUsd: isIronCondor
        ? parseFloat(form.bullPutLongStrikeUsd)
        : undefined,
      bearCallShortStrikeUsd: isIronCondor
        ? parseFloat(form.bearCallShortStrikeUsd)
        : undefined,
      bearCallLongStrikeUsd: isIronCondor
        ? parseFloat(form.bearCallLongStrikeUsd)
        : undefined,
      openDate: form.openDate,
      openPremiumUsd,
      openFeesUsd: parseFloat(form.openFeesUsd),
      maxRiskUsd: showManualMaxRisk ? parseFloat(form.maxRiskUsd) : undefined,
      userSharePercent: parseFloat(form.userSharePercent),
      clientSharePercent: parseFloat(form.clientSharePercent),
      closeDate: form.closeDate,
      closePremiumUsd: calculateOptionDollarValue(optionPrice, contracts),
      closeFeesUsd: parseFloat(form.closeFeesUsd),
      notes: form.notes || undefined,
    };

    const result = services.optionsTrades.updateClosedTrade(trade.id, draft);
    setSubmitting(false);
    if (!result.ok) {
      const map: Record<string, string> = {};
      for (const err of result.errors) map[err.field] = err.message;
      setErrors(map);
      return;
    }
    refresh();
    onClose();
  };

  return (
    <Modal title={`Edit Closed Trade — ${trade.underlying}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="radio"
              checked={form.tradeType === "personal"}
              onChange={() => handleTradeTypeChange("personal")}
            />
            Personal (100%)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="radio"
              checked={form.tradeType === "shared"}
              onChange={() => handleTradeTypeChange("shared")}
            />
            Shared
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Strategy"
            value={form.strategy}
            onChange={(e) => handleStrategyChange(e.target.value as OptionsStrategy)}
            options={STRATEGY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          {form.strategy === "custom" && (
            <Input
              label="Custom label"
              value={form.strategyLabel}
              onChange={(e) => setForm((p) => ({ ...p, strategyLabel: e.target.value }))}
              error={errors.strategyLabel}
            />
          )}
          <Input
            label="Underlying"
            value={form.underlying}
            onChange={(e) => setForm((p) => ({ ...p, underlying: e.target.value }))}
            error={errors.underlying}
          />
          <Input
            label="Contracts"
            type="number"
            min="1"
            value={form.contracts}
            onChange={(e) => setForm((p) => ({ ...p, contracts: e.target.value }))}
            error={errors.contracts}
          />
          {isVertical && (
            <>
              <Input
                label="Short strike"
                type="number"
                step="any"
                min="0"
                value={form.shortStrikeUsd}
                onChange={(e) => setForm((p) => ({ ...p, shortStrikeUsd: e.target.value }))}
                error={errors.shortStrikeUsd}
              />
              <Input
                label="Long strike"
                type="number"
                step="any"
                min="0"
                value={form.longStrikeUsd}
                onChange={(e) => setForm((p) => ({ ...p, longStrikeUsd: e.target.value }))}
                error={errors.longStrikeUsd}
              />
            </>
          )}
          {isIronCondor && (
            <>
              <Input
                label="Bull put short strike"
                type="number"
                step="any"
                min="0"
                value={form.bullPutShortStrikeUsd}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bullPutShortStrikeUsd: e.target.value }))
                }
                error={errors.bullPutShortStrikeUsd}
              />
              <Input
                label="Bull put long strike"
                type="number"
                step="any"
                min="0"
                value={form.bullPutLongStrikeUsd}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bullPutLongStrikeUsd: e.target.value }))
                }
                error={errors.bullPutLongStrikeUsd}
              />
              <Input
                label="Bear call short strike"
                type="number"
                step="any"
                min="0"
                value={form.bearCallShortStrikeUsd}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bearCallShortStrikeUsd: e.target.value }))
                }
                error={errors.bearCallShortStrikeUsd}
              />
              <Input
                label="Bear call long strike"
                type="number"
                step="any"
                min="0"
                value={form.bearCallLongStrikeUsd}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bearCallLongStrikeUsd: e.target.value }))
                }
                error={errors.bearCallLongStrikeUsd}
              />
            </>
          )}
          <Input
            label="Open date"
            type="date"
            value={form.openDate}
            onChange={(e) => setForm((p) => ({ ...p, openDate: e.target.value }))}
            error={errors.openDate}
          />
          <Input
            label="Close date"
            type="date"
            value={form.closeDate}
            onChange={(e) => setForm((p) => ({ ...p, closeDate: e.target.value }))}
            error={errors.closeDate}
          />
          <Input
            label="Premium Received (Option Price)"
            type="number"
            step="any"
            min="0"
            placeholder="1.00"
            value={form.openPremiumOptionPrice}
            onChange={(e) =>
              setForm((p) => ({ ...p, openPremiumOptionPrice: e.target.value }))
            }
            error={errors.openPremiumUsd}
          />
          <Input
            label="Opening fees (USD)"
            type="number"
            step="any"
            min="0"
            value={form.openFeesUsd}
            onChange={(e) => setForm((p) => ({ ...p, openFeesUsd: e.target.value }))}
            error={errors.openFeesUsd}
          />
          {openPremiumOptionPrice != null && openPremiumDollarValue != null && (
            <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3 text-sm text-slate-400 sm:col-span-2">
              <p>
                Option Price:{" "}
                <span className="font-medium text-slate-200">
                  {openPremiumOptionPrice.toFixed(2)}
                </span>
              </p>
              <p>
                Dollar Value:{" "}
                <span className="font-medium text-slate-200">
                  {formatUsd(openPremiumDollarValue)}
                </span>
              </p>
            </div>
          )}
          <Input
            label="Close Debit (Option Price)"
            type="number"
            step="any"
            min="0"
            placeholder="0.24"
            value={form.closeDebitOptionPrice}
            onChange={(e) =>
              setForm((p) => ({ ...p, closeDebitOptionPrice: e.target.value }))
            }
            error={errors.closePremiumUsd}
          />
          <Input
            label="Close fees (USD)"
            type="number"
            step="any"
            min="0"
            value={form.closeFeesUsd}
            onChange={(e) => setForm((p) => ({ ...p, closeFeesUsd: e.target.value }))}
            error={errors.closeFeesUsd}
          />
          {showManualMaxRisk && (
            <Input
              label="Max risk (USD) — manual"
              type="number"
              step="any"
              min="0"
              value={form.maxRiskUsd}
              onChange={(e) => setForm((p) => ({ ...p, maxRiskUsd: e.target.value }))}
              error={errors.maxRiskUsd}
            />
          )}
        </div>

        {closeDebitOptionPrice != null && closeDebitDollarValue != null && (
          <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3 text-sm text-slate-400">
            <p>
              Close option price:{" "}
              <span className="font-medium text-slate-200">
                {closeDebitOptionPrice.toFixed(2)}
              </span>
            </p>
            <p>
              Close debit dollar value:{" "}
              <span className="font-medium text-slate-200">
                {formatUsd(closeDebitDollarValue)}
              </span>
            </p>
          </div>
        )}

        {form.tradeType === "shared" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Your %"
              type="number"
              min="0"
              max="100"
              value={form.userSharePercent}
              onChange={(e) => setForm((p) => ({ ...p, userSharePercent: e.target.value }))}
            />
            <Input
              label="Client %"
              type="number"
              min="0"
              max="100"
              value={form.clientSharePercent}
              onChange={(e) => setForm((p) => ({ ...p, clientSharePercent: e.target.value }))}
            />
          </div>
        )}

        {realizedPreview != null && legsPreview && (
          <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3 text-sm text-slate-300">
            <p className="mb-1 text-sm font-medium text-slate-200">Recalculated on save</p>
            <p>Realized P/L: {formatUsd(realizedPreview)}</p>
            <p>Your leg: {formatUsd(legsPreview.userLegUsd)}</p>
            <p>Client leg: {formatUsd(legsPreview.clientLegUsd)}</p>
            <p className="mt-2 text-xs text-slate-500">
              US Available Cash uses full realized P/L. Editing updates cash by the
              difference from the previous realized amount.
            </p>
          </div>
        )}

        <Input
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function EditClosedNotesModal({
  trade,
  onClose,
}: {
  trade: OptionsTrade;
  onClose: () => void;
}) {
  const { services, refresh } = usePortfolio();
  const [notes, setNotes] = useState(trade.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const result = services.optionsTrades.updateClosedTradeNotes(trade.id, notes);
    if (!result.ok) {
      setError(result.errors[0]?.message ?? "Update failed");
      return;
    }
    refresh();
    onClose();
  };

  return (
    <Modal title={`Edit Notes — ${trade.underlying}`} onClose={onClose}>
      <div className="space-y-4">
        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          error={error ?? undefined}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save Notes</Button>
        </div>
      </div>
    </Modal>
  );
}
