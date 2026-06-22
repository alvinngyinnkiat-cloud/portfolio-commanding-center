"use client";

import { useMemo, useState, useEffect } from "react";
import type { OptionsCloseMethod, OptionsStrategy, OptionsTrade } from "@/core/domain/types/options";
import {
  calculateRemainingCapacityUsd,
  calculateVerticalSpreadMetrics,
  calculateIronCondorMetrics,
  calculateNakedCreditMetrics,
  calculateDebitOptionMetrics,
  calculateOptionDollarValue,
  calculatePerShareOptionPrice,
  defaultSplitForTradeType,
  getClosePremiumFieldLabel,
  getOpenPremiumFieldLabel,
  isDebitStrategy,
  isNakedCreditStrategy,
  isVerticalSpreadStrategy,
  isIronCondorStrategy,
  requiresManualMaxRisk,
  resolveClosedTradeRealizedPlUsd,
  resolvePartialCloseRealizedPlUsd,
  countsTowardCapacityRisk,
  sumOpenRiskUsdForCapacity,
  getRemainingContracts,
  getOriginalContracts,
  type CloseTradeDraft,
  type ClosedTradeEditDraft,
  type OpenTradeDraft,
  normalizeOptionsTradeDate,
  optionsTradeDateForInput,
  todayOptionsTradeDate,
} from "@/core/calculations/options";
import { buildUsAvailableCashResult, buildUsEffectiveCashFields } from "@/core/calculations/us-cash";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Select } from "@/shared/components/ui/Select";
import { Modal } from "@/shared/components/ui/Modal";
import { formatUsd } from "@/shared/lib/format";
import { capacityLabel, CLOSE_METHOD_OPTIONS, STRATEGY_OPTIONS } from "./options-utils";
import { deriveCapacityStatus } from "@/core/calculations/options/capacity";
import { splitForTrade } from "@/core/calculations/options/split";
import { usePortfolio } from "@/context/PortfolioContext";
import { DEFAULT_OPTIONS_SETTINGS } from "@/core/domain/defaults-options";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";

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
  openDate: "",
  openPremiumOptionPrice: "",
  openFeesUsd: "0",
  maxRiskUsd: "",
  userSharePercent: "55",
  clientSharePercent: "45",
  notes: "",
  openingShortPutDelta: "",
  openingShortCallDelta: "",
  openingPutSideDelta: "",
  openingCallSideDelta: "",
  openingEma20: "",
  openingSma50: "",
  openingSma200: "",
};

type OpenTradeForm = Omit<typeof emptyOpenForm, "strategy" | "tradeType"> & {
  tradeType: "personal" | "shared";
  strategy: OptionsStrategy;
  underlyingPriceUsd?: string;
};

function parseOptionalFloat(value: string | undefined): number | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseStrikeField(value: string): number | undefined {
  return parseOptionalFloat(value);
}

function closedEditStrikeFields(
  form: ReturnType<typeof buildClosedEditFormState>,
  strategy: OptionsStrategy
): Pick<
  ClosedTradeEditDraft,
  | "shortStrikeUsd"
  | "longStrikeUsd"
  | "bullPutShortStrikeUsd"
  | "bullPutLongStrikeUsd"
  | "bearCallShortStrikeUsd"
  | "bearCallLongStrikeUsd"
> {
  const isVertical = isVerticalSpreadStrategy(strategy);
  const isIronCondor = isIronCondorStrategy(strategy);
  const isNaked = isNakedCreditStrategy(strategy);
  const isDebit = isDebitStrategy(strategy);

  return {
    shortStrikeUsd:
      isVertical || isNaked ? parseStrikeField(form.shortStrikeUsd) : undefined,
    longStrikeUsd:
      isVertical || isDebit ? parseStrikeField(form.longStrikeUsd) : undefined,
    bullPutShortStrikeUsd: isIronCondor
      ? parseStrikeField(form.bullPutShortStrikeUsd)
      : undefined,
    bullPutLongStrikeUsd: isIronCondor
      ? parseStrikeField(form.bullPutLongStrikeUsd)
      : undefined,
    bearCallShortStrikeUsd: isIronCondor
      ? parseStrikeField(form.bearCallShortStrikeUsd)
      : undefined,
    bearCallLongStrikeUsd: isIronCondor
      ? parseStrikeField(form.bearCallLongStrikeUsd)
      : undefined,
  };
}

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
    expirationDate: optionsTradeDateForInput(trade.expirationDate),
    openDate: optionsTradeDateForInput(trade.openDate),
    openPremiumOptionPrice: premiumOptionPriceFromTrade(trade),
    openFeesUsd: String(trade.openFeesUsd),
    maxRiskUsd: String(trade.maxRiskUsd),
    userSharePercent: String(trade.userSharePercent),
    clientSharePercent: String(trade.clientSharePercent),
    notes: trade.notes ?? "",
    closeDate: optionsTradeDateForInput(trade.closeDate),
    closeMethod: (trade.closeMethod ?? "normal") as OptionsCloseMethod,
    closeDebitOptionPrice:
      closeDebitOptionPrice != null ? closeDebitOptionPrice.toFixed(2) : "0",
    closeFeesUsd: String(trade.closeFeesUsd ?? 0),
    manualRealizedPlUsd:
      trade.manualRealizedPlUsd != null ? String(trade.manualRealizedPlUsd) : "",
  };
}

export function OpenTradeModal({
  onClose,
  editTrade,
}: {
  onClose: () => void;
  editTrade?: OptionsTrade;
}) {
  const { optionsData, data, stockData, scannerData, services, refresh } = usePortfolio();
  const settings = optionsData?.settings;
  const [form, setForm] = useState<OpenTradeForm>(() => {
    if (!editTrade) {
      return { ...emptyOpenForm, openDate: todayOptionsTradeDate() };
    }
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
      expirationDate: optionsTradeDateForInput(editTrade.expirationDate),
      openDate: optionsTradeDateForInput(editTrade.openDate),
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
      openingShortPutDelta:
        editTrade.openingShortPutDelta != null
          ? String(editTrade.openingShortPutDelta)
          : "",
      openingShortCallDelta:
        editTrade.openingShortCallDelta != null
          ? String(editTrade.openingShortCallDelta)
          : "",
      openingPutSideDelta:
        editTrade.openingPutSideDelta != null
          ? String(editTrade.openingPutSideDelta)
          : "",
      openingCallSideDelta:
        editTrade.openingCallSideDelta != null
          ? String(editTrade.openingCallSideDelta)
          : "",
      openingEma20:
        editTrade.openingEma20 != null ? String(editTrade.openingEma20) : "",
      openingSma50:
        editTrade.openingSma50 != null ? String(editTrade.openingSma50) : "",
      openingSma200:
        editTrade.openingSma200 != null ? String(editTrade.openingSma200) : "",
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isVertical = isVerticalSpreadStrategy(form.strategy);
  const isIronCondor = isIronCondorStrategy(form.strategy);
  const isNaked = isNakedCreditStrategy(form.strategy);
  const isDebit = isDebitStrategy(form.strategy);
  const showManualMaxRisk = requiresManualMaxRisk(form.strategy);
  const openPremiumLabel = getOpenPremiumFieldLabel(form.strategy);
  const isDashboardStrategy =
    form.strategy === "bullPut" ||
    form.strategy === "bearCall" ||
    form.strategy === "ironCondor" ||
    form.strategy === "buyCall" ||
    form.strategy === "buyPut";
  const showOpeningSnapshot = !editTrade && isDashboardStrategy;
  const showOpeningSnapshotReadOnly = !!editTrade && isDashboardStrategy;

  useEffect(() => {
    if (editTrade || !form.underlying.trim()) return;
    const ticker = normalizeTicker(form.underlying);
    const scanResult = scannerData?.latestRun?.results.find(
      (row) => normalizeTicker(row.ticker) === ticker
    );
    if (!scanResult?.indicators) return;
    const { ema20, sma50, sma200 } = scanResult.indicators;
    setForm((prev) => ({
      ...prev,
      openingEma20:
        prev.openingEma20.trim() === "" && ema20 != null
          ? String(ema20)
          : prev.openingEma20,
      openingSma50:
        prev.openingSma50.trim() === "" && sma50 != null
          ? String(sma50)
          : prev.openingSma50,
      openingSma200:
        prev.openingSma200.trim() === "" && sma200 != null
          ? String(sma200)
          : prev.openingSma200,
    }));
  }, [editTrade, form.underlying, scannerData?.latestRun?.results]);

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

  const nakedPreview = useMemo(() => {
    if (!isNaked) return null;
    const strategy = form.strategy;
    if (!isNakedCreditStrategy(strategy)) return null;
    const strike = parseFloat(form.shortStrikeUsd);
    const contracts = parseInt(form.contracts, 10);
    const openPremiumUsd = parsePremiumDollarValue(
      form.openPremiumOptionPrice,
      contracts
    );
    const openFees = parseFloat(form.openFeesUsd);
    const manualMaxRisk = parseFloat(form.maxRiskUsd);
    if (
      !Number.isFinite(strike) ||
      !Number.isInteger(contracts) ||
      contracts <= 0 ||
      openPremiumUsd == null ||
      !Number.isFinite(openFees)
    ) {
      return null;
    }
    return calculateNakedCreditMetrics({
      strategy,
      strikeUsd: strike,
      contracts,
      openPremiumUsd,
      openFeesUsd: openFees,
      manualMaxRiskUsd:
        strategy === "sellCall" && Number.isFinite(manualMaxRisk)
          ? manualMaxRisk
          : undefined,
    });
  }, [
    isNaked,
    form.strategy,
    form.shortStrikeUsd,
    form.contracts,
    form.openPremiumOptionPrice,
    form.openFeesUsd,
    form.maxRiskUsd,
  ]);

  const debitPreview = useMemo(() => {
    if (!isDebit) return null;
    const strategy = form.strategy;
    if (!isDebitStrategy(strategy)) return null;
    const strike = parseFloat(form.longStrikeUsd);
    const contracts = parseInt(form.contracts, 10);
    const openPremiumUsd = parsePremiumDollarValue(
      form.openPremiumOptionPrice,
      contracts
    );
    const openFees = parseFloat(form.openFeesUsd);
    if (
      !Number.isFinite(strike) ||
      !Number.isInteger(contracts) ||
      contracts <= 0 ||
      openPremiumUsd == null ||
      !Number.isFinite(openFees)
    ) {
      return null;
    }
    return calculateDebitOptionMetrics({
      strategy,
      strikeUsd: strike,
      contracts,
      openPremiumUsd,
      openFeesUsd: openFees,
    });
  }, [
    isDebit,
    form.strategy,
    form.longStrikeUsd,
    form.contracts,
    form.openPremiumOptionPrice,
    form.openFeesUsd,
  ]);

  const autoRiskPreview =
    spreadPreview?.maxRiskUsd ??
    ironCondorPreview?.maxRiskUsd ??
    nakedPreview?.maxRiskUsd ??
    debitPreview?.maxRiskUsd;

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
      fxConversions: stockData?.cashFlow.fxConversions ?? [],
      stockTransactions: stockData.transactions,
      fxRate: optionsData.fxRate,
      optionsTrades: optionsData.trades,
    });
    const effectiveCash = buildUsEffectiveCashFields(
      cash.usAvailableCashUsd,
      data.settings.brokerUsdCashOverride
    );
    const openRisk = sumOpenRiskUsdForCapacity(optionsData.trades);
    let addRisk = 0;
    if (!editTrade) {
      if (autoRiskPreview != null && autoRiskPreview > 0) {
        addRisk = autoRiskPreview;
      } else if (showManualMaxRisk) {
        const draftRisk = parseFloat(form.maxRiskUsd);
        if (Number.isFinite(draftRisk) && draftRisk > 0) addRisk = draftRisk;
      }
      if (!countsTowardCapacityRisk({ expirationDate: form.expirationDate })) {
        addRisk = 0;
      }
    }
    const projected = calculateRemainingCapacityUsd(
      effectiveCash.usAvailableTradingCashUsd,
      openRisk + addRisk
    );
    return {
      cash: effectiveCash.usAvailableTradingCashUsd,
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
    form.expirationDate,
  ]);

  const handleStrategyChange = (strategy: OptionsStrategy) => {
    setForm((prev) => ({
      ...prev,
      strategy,
      shortStrikeUsd:
        isVerticalSpreadStrategy(strategy) || isNakedCreditStrategy(strategy)
          ? prev.shortStrikeUsd
          : "",
      longStrikeUsd:
        isVerticalSpreadStrategy(strategy) || isDebitStrategy(strategy)
          ? prev.longStrikeUsd
          : "",
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

    const openDate = normalizeOptionsTradeDate(form.openDate);
    const expirationDate = normalizeOptionsTradeDate(form.expirationDate);
    if (!openDate) {
      setSubmitting(false);
      setErrors({ openDate: "Open date must be YYYY-MM-DD" });
      return;
    }
    if (!expirationDate) {
      setSubmitting(false);
      setErrors({ expirationDate: "Expiration date must be YYYY-MM-DD" });
      return;
    }

    const draft: OpenTradeDraft = {
      id: editTrade?.id,
      tradeType: form.tradeType,
      strategy: form.strategy,
      strategyLabel: form.strategyLabel || undefined,
      underlying: form.underlying,
      contracts,
      shortStrikeUsd:
        isVertical || isNaked ? parseFloat(form.shortStrikeUsd) : undefined,
      longStrikeUsd:
        isVertical || isDebit ? parseFloat(form.longStrikeUsd) : undefined,
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
      expirationDate,
      openDate,
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
      ...(editTrade
        ? {}
        : {
            openingShortPutDelta: parseOptionalFloat(form.openingShortPutDelta),
            openingShortCallDelta: parseOptionalFloat(form.openingShortCallDelta),
            openingPutSideDelta: parseOptionalFloat(form.openingPutSideDelta),
            openingCallSideDelta: parseOptionalFloat(form.openingCallSideDelta),
            openingEma20: parseOptionalFloat(form.openingEma20),
            openingSma50: parseOptionalFloat(form.openingSma50),
            openingSma200: parseOptionalFloat(form.openingSma200),
          }),
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
              BULL PUT / BEAR CALL: enter strikes and premium — max risk is auto-calculated.
            </p>
          )}
          {isNaked && (
            <p className="text-xs text-slate-500 sm:col-span-2">
              {form.strategy === "sellPut"
                ? "SELL PUT: short put strike — net credit and breakeven auto-calculated."
                : "SELL CALL (covered): short call strike — max risk is manual (shares in Module 2)."}
            </p>
          )}
          {isDebit && (
            <p className="text-xs text-slate-500 sm:col-span-2">
              {form.strategy === "buyCall"
                ? "BUY CALL: long call strike — premium cost and breakeven auto-calculated."
                : "BUY PUT: long put strike — premium cost and breakeven auto-calculated."}
            </p>
          )}
          {isIronCondor && (
            <p className="text-xs text-slate-500 sm:col-span-2">
              IRON CONDOR: one trade (bull put + bear call) — risk uses the wider wing only.
            </p>
          )}
          {form.strategy === "custom" && (
            <p className="text-xs text-slate-500 sm:col-span-2">
              CUSTOM: enter strategy name and max risk manually.
            </p>
          )}
          {form.strategy === "sellCall" && (
            <p className="text-xs text-slate-500 sm:col-span-2">
              Covered call only — underlying shares tracked in Module 2.
            </p>
          )}
          {form.strategy === "custom" && (
            <Input
              label="Custom Strategy Name"
              value={form.strategyLabel}
              onChange={(e) => setForm((p) => ({ ...p, strategyLabel: e.target.value }))}
              error={errors.strategyLabel}
              placeholder="e.g. Bullish Synthetic"
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
          {isNaked && (
            <Input
              label={form.strategy === "sellPut" ? "Put strike" : "Call strike"}
              type="number"
              step="any"
              min="0"
              value={form.shortStrikeUsd}
              onChange={(e) => setForm((p) => ({ ...p, shortStrikeUsd: e.target.value }))}
              error={errors.shortStrikeUsd}
            />
          )}
          {isDebit && (
            <Input
              label={form.strategy === "buyCall" ? "Call strike" : "Put strike"}
              type="number"
              step="any"
              min="0"
              value={form.longStrikeUsd}
              onChange={(e) => setForm((p) => ({ ...p, longStrikeUsd: e.target.value }))}
              error={errors.longStrikeUsd}
            />
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
            label={openPremiumLabel}
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
                {isDebit ? "Premium Cost" : "Premium Dollar Value"}:{" "}
                <span className="font-medium text-slate-200">
                  {isDebit
                    ? formatUsd(
                        openPremiumDollarValue + (parseFloat(form.openFeesUsd) || 0)
                      )
                    : formatUsd(openPremiumDollarValue)}
                </span>
              </p>
            </div>
          )}
          {showManualMaxRisk && (
            <Input
              label={
                form.strategy === "sellCall"
                  ? "Max risk (USD) — manual (underlying shares)"
                  : "Max risk (USD) — manual"
              }
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

        {nakedPreview && (
          <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3 text-xs text-slate-400">
            <p className="mb-1 text-sm font-medium text-slate-300">Auto-calculated</p>
            <p>Net credit: {formatUsd(nakedPreview.netCreditUsd)}</p>
            <p>
              75% TP exit price:{" "}
              {calculatePerShareOptionPrice(
                nakedPreview.tpExitPrice75Usd,
                contractsCount
              )?.toFixed(2) ?? "—"}{" "}
              ({formatUsd(nakedPreview.tpExitPrice75Usd)})
            </p>
            <p>Max profit: {formatUsd(nakedPreview.maxProfitUsd)}</p>
            {form.strategy === "sellPut" && (
              <p>Max risk: {formatUsd(nakedPreview.maxRiskUsd)}</p>
            )}
            <p>Breakeven: ${nakedPreview.breakevenUsd.toFixed(2)}</p>
          </div>
        )}

        {debitPreview && (
          <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3 text-xs text-slate-400">
            <p className="mb-1 text-sm font-medium text-slate-300">Auto-calculated</p>
            <p>Premium cost: {formatUsd(debitPreview.premiumCostUsd)}</p>
            <p>
              75% TP price:{" "}
              {(debitPreview.premiumPaidPerShare * 1.75).toFixed(2)}{" "}
              ({formatUsd(debitPreview.tpExitPrice75Usd)})
            </p>
            <p>Max risk: {formatUsd(debitPreview.maxRiskUsd)}</p>
            <p>Breakeven: ${debitPreview.breakevenUsd.toFixed(2)}</p>
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

        {showOpeningSnapshot && (
          <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-4">
            <p className="mb-3 text-sm font-medium text-slate-300">
              Opening Snapshot (stored permanently)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {form.strategy === "bullPut" && (
                <Input
                  label="Opening Delta"
                  type="number"
                  step="any"
                  value={form.openingShortPutDelta}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, openingShortPutDelta: e.target.value }))
                  }
                />
              )}
              {form.strategy === "bearCall" && (
                <Input
                  label="Opening Delta"
                  type="number"
                  step="any"
                  value={form.openingShortCallDelta}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, openingShortCallDelta: e.target.value }))
                  }
                />
              )}
              {form.strategy === "buyCall" && (
                <Input
                  label="Opening Delta"
                  type="number"
                  step="any"
                  value={form.openingShortCallDelta}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, openingShortCallDelta: e.target.value }))
                  }
                />
              )}
              {form.strategy === "buyPut" && (
                <Input
                  label="Opening Delta"
                  type="number"
                  step="any"
                  value={form.openingShortPutDelta}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, openingShortPutDelta: e.target.value }))
                  }
                />
              )}
              {form.strategy === "ironCondor" && (
                <>
                  <Input
                    label="Opening Put Delta"
                    type="number"
                    step="any"
                    value={form.openingPutSideDelta}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, openingPutSideDelta: e.target.value }))
                    }
                  />
                  <Input
                    label="Opening Call Delta"
                    type="number"
                    step="any"
                    value={form.openingCallSideDelta}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, openingCallSideDelta: e.target.value }))
                    }
                  />
                </>
              )}
              <Input
                label="Opening EMA20"
                type="number"
                step="any"
                value={form.openingEma20}
                onChange={(e) =>
                  setForm((p) => ({ ...p, openingEma20: e.target.value }))
                }
                hint="Auto-filled from Scanner when available"
              />
              <Input
                label="Opening SMA50"
                type="number"
                step="any"
                value={form.openingSma50}
                onChange={(e) =>
                  setForm((p) => ({ ...p, openingSma50: e.target.value }))
                }
              />
              <Input
                label="Opening SMA200"
                type="number"
                step="any"
                value={form.openingSma200}
                onChange={(e) =>
                  setForm((p) => ({ ...p, openingSma200: e.target.value }))
                }
              />
            </div>
          </div>
        )}

        {showOpeningSnapshotReadOnly && (
          <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-3 text-xs text-slate-400">
            <p className="mb-1 text-sm font-medium text-slate-300">
              Opening snapshot (read-only)
            </p>
            {form.strategy === "bullPut" && (
              <p>Opening Delta: {form.openingShortPutDelta || "—"}</p>
            )}
            {form.strategy === "bearCall" && (
              <p>Opening Delta: {form.openingShortCallDelta || "—"}</p>
            )}
            {form.strategy === "buyCall" && (
              <p>Opening Delta: {form.openingShortCallDelta || "—"}</p>
            )}
            {form.strategy === "buyPut" && (
              <p>Opening Delta: {form.openingShortPutDelta || "—"}</p>
            )}
            {form.strategy === "ironCondor" && (
              <>
                <p>Opening Put Delta: {form.openingPutSideDelta || "—"}</p>
                <p>Opening Call Delta: {form.openingCallSideDelta || "—"}</p>
              </>
            )}
            <p>Opening EMA20: {form.openingEma20 || "—"}</p>
            <p>
              Opening SMA50 / SMA200: {form.openingSma50 || "—"} /{" "}
              {form.openingSma200 || "—"}
            </p>
          </div>
        )}

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
            <p>Current open risk (DTE ≤ 45): {formatUsd(capacityPreview.openRisk)}</p>
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

export function CloseTradeModal({
  trade,
  onClose,
}: {
  trade: OptionsTrade;
  onClose: () => void;
}) {
  const { services, refresh } = usePortfolio();
  const remainingContracts = getRemainingContracts(trade);
  const originalContracts = getOriginalContracts(trade);
  const [form, setForm] = useState({
    closeDate: todayOptionsTradeDate(),
    contractsToClose: String(remainingContracts),
    closeMethod: "normal" as OptionsCloseMethod,
    closeDebitOptionPrice: "0",
    closeFeesUsd: "0",
    manualRealizedPlUsd: "",
    notesAppend: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isManualClose = form.closeMethod === "manual_pl";
  const closePremiumLabel = getClosePremiumFieldLabel(trade.strategy);
  const contractsToClose = parseInt(form.contractsToClose, 10);
  const validContractsToClose =
    Number.isFinite(contractsToClose) &&
    contractsToClose > 0 &&
    contractsToClose <= remainingContracts;
  const closeDebitOptionPrice =
    form.closeDebitOptionPrice.trim() === ""
      ? null
      : parseFloat(form.closeDebitOptionPrice);
  const closeDebitDollarValue =
    !isManualClose &&
    closeDebitOptionPrice != null &&
    Number.isFinite(closeDebitOptionPrice) &&
    closeDebitOptionPrice >= 0 &&
    validContractsToClose
      ? calculateOptionDollarValue(closeDebitOptionPrice, contractsToClose)
      : null;
  const closeFeesUsd = parseFloat(form.closeFeesUsd);
  const manualRealizedPlUsd =
    form.manualRealizedPlUsd.trim() === ""
      ? null
      : parseFloat(form.manualRealizedPlUsd);

  const realized =
    isManualClose && manualRealizedPlUsd != null && Number.isFinite(manualRealizedPlUsd)
      ? manualRealizedPlUsd
      : closeDebitDollarValue != null && Number.isFinite(closeFeesUsd) && validContractsToClose
        ? resolvePartialCloseRealizedPlUsd({
            strategy: trade.strategy,
            closeMethod: "normal",
            originalOpenPremiumUsd: trade.openPremiumUsd,
            originalOpenFeesUsd: trade.openFeesUsd,
            originalContracts,
            contractsClosed: contractsToClose,
            closePremiumUsd: closeDebitDollarValue,
            closeFeesUsd: Number.isFinite(closeFeesUsd) ? closeFeesUsd : 0,
          })
        : null;
  const legs = realized != null ? splitForTrade(trade, realized) : null;

  const submit = () => {
    const closeDate = normalizeOptionsTradeDate(form.closeDate);
    if (!closeDate) {
      setErrors({ closeDate: "Close date must be YYYY-MM-DD" });
      return;
    }

    const contractsClosed = parseInt(form.contractsToClose, 10);
    if (!Number.isFinite(contractsClosed) || contractsClosed <= 0) {
      setErrors({ contractsToClose: "Enter contracts to close" });
      return;
    }
    if (contractsClosed > remainingContracts) {
      setErrors({
        contractsToClose: `Cannot exceed ${remainingContracts} remaining contract${remainingContracts === 1 ? "" : "s"}`,
      });
      return;
    }

    if (isManualClose) {
      const manual = parseFloat(form.manualRealizedPlUsd);
      if (!Number.isFinite(manual)) {
        setErrors({ manualRealizedPlUsd: "Enter the broker final realized P/L" });
        return;
      }
      const draft: CloseTradeDraft = {
        closeDate,
        contractsToClose: contractsClosed,
        closeMethod: "manual_pl",
        manualRealizedPlUsd: manual,
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
      return;
    }

    const optionPrice = parseFloat(form.closeDebitOptionPrice);
    if (!Number.isFinite(optionPrice) || optionPrice < 0) {
      setErrors({ closePremiumUsd: "Enter a valid close debit option price" });
      return;
    }
    const closePremiumUsd = calculateOptionDollarValue(optionPrice, contractsClosed);
    const fees = parseFloat(form.closeFeesUsd);
    const draft: CloseTradeDraft = {
      closeDate,
      contractsToClose: contractsClosed,
      closeMethod: "normal",
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
            label="Contracts to close"
            type="number"
            min={1}
            max={remainingContracts}
            value={form.contractsToClose}
            onChange={(e) =>
              setForm((p) => ({ ...p, contractsToClose: e.target.value }))
            }
            error={errors.contractsToClose}
          />
        </div>
        <p className="text-xs text-slate-500">
          Original: {originalContracts} · Remaining: {remainingContracts}
          {remainingContracts < originalContracts ? " (partial close enabled)" : ""}
        </p>
        <Select
          label="Close Method"
          value={form.closeMethod}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              closeMethod: e.target.value as OptionsCloseMethod,
            }))
          }
          options={CLOSE_METHOD_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />

        {isManualClose ? (
          <Input
            label="Final Realized P/L (USD)"
            type="number"
            step="any"
            placeholder="-1190.59"
            value={form.manualRealizedPlUsd}
            onChange={(e) =>
              setForm((p) => ({ ...p, manualRealizedPlUsd: e.target.value }))
            }
            error={errors.manualRealizedPlUsd}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={closePremiumLabel}
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
        )}

        {!isManualClose &&
          closeDebitOptionPrice != null &&
          closeDebitDollarValue != null && (
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
            <p>Your P/L: {formatUsd(legs.userLegUsd)}</p>
            <p>Client P/L: {formatUsd(legs.clientLegUsd)}</p>
            <p className="mt-2 text-xs text-slate-500">
              US Available Cash impact: {formatUsd(realized)} (full amount for shared
              trades; client leg is reporting only).
            </p>
          </div>
        )}
        {!isManualClose && (
          <p className="text-xs text-slate-500">
            Enter broker option price (e.g. 0.24). Close debit dollar value = price ×
            100 × {validContractsToClose ? contractsToClose : "—"} contract
            {contractsToClose === 1 ? "" : "s"} being closed.
          </p>
        )}
        {isManualClose && (
          <p className="text-xs text-slate-500">
            Use for assignment, exercise, liquidation, or broker-adjusted final P/L.
            Stock assignment legs stay in Options only — do not add to Stock Tracker.
          </p>
        )}
        <Input
          label="Notes (append)"
          value={form.notesAppend}
          onChange={(e) => setForm((p) => ({ ...p, notesAppend: e.target.value }))}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>
            {validContractsToClose && contractsToClose < remainingContracts
              ? `Close ${contractsToClose} Contract${contractsToClose === 1 ? "" : "s"}`
              : "Confirm Close"}
          </Button>
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
  const settings = optionsData?.settings ?? DEFAULT_OPTIONS_SETTINGS;
  const [form, setForm] = useState(() => buildClosedEditFormState(trade));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isVertical = isVerticalSpreadStrategy(form.strategy);
  const isIronCondor = isIronCondorStrategy(form.strategy);
  const isNaked = isNakedCreditStrategy(form.strategy);
  const isDebit = isDebitStrategy(form.strategy);
  const showManualMaxRisk = requiresManualMaxRisk(form.strategy);
  const contracts = parseInt(form.contracts, 10);

  const isManualClose = form.closeMethod === "manual_pl";
  const closeDebitOptionPrice =
    form.closeDebitOptionPrice.trim() === ""
      ? null
      : parseFloat(form.closeDebitOptionPrice);
  const closeDebitDollarValue =
    !isManualClose &&
    closeDebitOptionPrice != null &&
    Number.isFinite(closeDebitOptionPrice) &&
    closeDebitOptionPrice >= 0 &&
    Number.isInteger(contracts) &&
    contracts > 0
      ? calculateOptionDollarValue(closeDebitOptionPrice, contracts)
      : null;
  const closeFeesUsd = parseFloat(form.closeFeesUsd);
  const manualRealizedPlUsd =
    form.manualRealizedPlUsd.trim() === ""
      ? null
      : parseFloat(form.manualRealizedPlUsd);
  const openPremiumOptionPrice =
    form.openPremiumOptionPrice.trim() === ""
      ? null
      : parseFloat(form.openPremiumOptionPrice);
  const openPremiumDollarValue = parsePremiumDollarValue(
    form.openPremiumOptionPrice,
    contracts
  );
  const openFeesUsd = parseFloat(form.openFeesUsd);

  const previewTrade = {
    ...trade,
    tradeType: form.tradeType,
    userSharePercent: parseFloat(form.userSharePercent) || 0,
    clientSharePercent: parseFloat(form.clientSharePercent) || 0,
  };

  const realizedPreview =
    isManualClose &&
    manualRealizedPlUsd != null &&
    Number.isFinite(manualRealizedPlUsd) &&
    openPremiumDollarValue != null &&
    Number.isFinite(openFeesUsd)
      ? resolveClosedTradeRealizedPlUsd({
          strategy: form.strategy,
          closeMethod: "manual_pl",
          openPremiumUsd: openPremiumDollarValue,
          openFeesUsd,
          manualRealizedPlUsd,
        })
      : closeDebitDollarValue != null &&
          openPremiumDollarValue != null &&
          Number.isFinite(openFeesUsd) &&
          Number.isFinite(closeFeesUsd)
        ? resolveClosedTradeRealizedPlUsd({
            strategy: form.strategy,
            closeMethod: "normal",
            openPremiumUsd: openPremiumDollarValue,
            openFeesUsd,
            closePremiumUsd: closeDebitDollarValue,
            closeFeesUsd,
          })
        : null;
  const legsPreview =
    realizedPreview != null ? splitForTrade(previewTrade, realizedPreview) : null;

  const handleStrategyChange = (strategy: OptionsStrategy) => {
    setForm((prev) => ({
      ...prev,
      strategy,
      shortStrikeUsd:
        isVerticalSpreadStrategy(strategy) || isNakedCreditStrategy(strategy)
          ? prev.shortStrikeUsd
          : "",
      longStrikeUsd:
        isVerticalSpreadStrategy(strategy) || isDebitStrategy(strategy)
          ? prev.longStrikeUsd
          : "",
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
    const split = defaultSplitForTradeType(tradeType, settings);
    setForm((prev) => ({
      ...prev,
      tradeType,
      userSharePercent: String(split.userSharePercent),
      clientSharePercent: String(split.clientSharePercent),
    }));
  };

  const handleSubmit = () => {
    if (!services?.optionsTrades) {
      setErrors({ submit: "Options service is not ready. Try again in a moment." });
      return;
    }

    const openDate = normalizeOptionsTradeDate(form.openDate);
    const closeDate = normalizeOptionsTradeDate(form.closeDate);
    const expirationDate = normalizeOptionsTradeDate(form.expirationDate);
    if (!openDate) {
      setErrors({ openDate: "Open date must be YYYY-MM-DD" });
      return;
    }
    if (!closeDate) {
      setErrors({ closeDate: "Close date must be YYYY-MM-DD" });
      return;
    }
    if (!expirationDate) {
      setErrors({ expirationDate: "Expiration date must be YYYY-MM-DD" });
      return;
    }

    if (!Number.isInteger(contracts) || contracts <= 0) {
      setErrors({ contracts: "Contracts must be greater than zero" });
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

    const strikeFields = closedEditStrikeFields(form, form.strategy);
    const sharedFields = {
      tradeType: form.tradeType,
      strategy: form.strategy,
      strategyLabel: form.strategyLabel || undefined,
      underlying: form.underlying,
      expirationDate,
      contracts,
      ...strikeFields,
      openDate,
      openPremiumUsd,
      openFeesUsd: parseFloat(form.openFeesUsd),
      maxRiskUsd: showManualMaxRisk ? parseFloat(form.maxRiskUsd) : undefined,
      userSharePercent: parseFloat(form.userSharePercent),
      clientSharePercent: parseFloat(form.clientSharePercent),
      closeDate,
      notes: form.notes || undefined,
    };

    let draft: ClosedTradeEditDraft;
    if (isManualClose) {
      const manual = parseFloat(form.manualRealizedPlUsd);
      if (!Number.isFinite(manual)) {
        setErrors({ manualRealizedPlUsd: "Enter the broker final realized P/L" });
        return;
      }
      draft = {
        ...sharedFields,
        closeMethod: "manual_pl",
        manualRealizedPlUsd: manual,
      };
    } else {
      const optionPrice = parseFloat(form.closeDebitOptionPrice);
      if (!Number.isFinite(optionPrice) || optionPrice < 0) {
        setErrors({ closePremiumUsd: "Enter a valid close debit option price" });
        return;
      }
      draft = {
        ...sharedFields,
        closeMethod: "normal",
        closePremiumUsd: calculateOptionDollarValue(optionPrice, contracts),
        closeFeesUsd: parseFloat(form.closeFeesUsd),
      };
    }

    setSubmitting(true);
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
    <Modal
      title={`Edit Closed Trade — ${trade.underlying}`}
      onClose={onClose}
      wide
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {errors.submit && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {errors.submit}
          </p>
        )}
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
          {isNaked && (
            <p className="text-xs text-slate-500 sm:col-span-2">
              {form.strategy === "sellPut"
                ? "SELL PUT: short put strike required for save."
                : "SELL CALL: short call strike required for save."}
            </p>
          )}
          {isDebit && (
            <p className="text-xs text-slate-500 sm:col-span-2">
              {form.strategy === "buyCall"
                ? "BUY CALL: long call strike required for save."
                : "BUY PUT: long put strike required for save."}
            </p>
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
          {isNaked && (
            <Input
              label={form.strategy === "sellPut" ? "Put strike" : "Call strike"}
              type="number"
              step="any"
              min="0"
              value={form.shortStrikeUsd}
              onChange={(e) => setForm((p) => ({ ...p, shortStrikeUsd: e.target.value }))}
              error={errors.shortStrikeUsd}
            />
          )}
          {isDebit && (
            <Input
              label={form.strategy === "buyCall" ? "Call strike" : "Put strike"}
              type="number"
              step="any"
              min="0"
              value={form.longStrikeUsd}
              onChange={(e) => setForm((p) => ({ ...p, longStrikeUsd: e.target.value }))}
              error={errors.longStrikeUsd}
            />
          )}
          <Input
            label="Expiration"
            type="date"
            value={form.expirationDate}
            onChange={(e) => setForm((p) => ({ ...p, expirationDate: e.target.value }))}
            error={errors.expirationDate}
          />
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
          <Select
            label="Close Method"
            value={form.closeMethod}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                closeMethod: e.target.value as OptionsCloseMethod,
              }))
            }
            options={CLOSE_METHOD_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
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
          {isManualClose ? (
            <Input
              label="Final Realized P/L (USD)"
              type="number"
              step="any"
              placeholder="-1190.59"
              value={form.manualRealizedPlUsd}
              onChange={(e) =>
                setForm((p) => ({ ...p, manualRealizedPlUsd: e.target.value }))
              }
              error={errors.manualRealizedPlUsd}
            />
          ) : (
            <>
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
                onChange={(e) =>
                  setForm((p) => ({ ...p, closeFeesUsd: e.target.value }))
                }
                error={errors.closeFeesUsd}
              />
            </>
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

        {!isManualClose &&
          closeDebitOptionPrice != null &&
          closeDebitDollarValue != null && (
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
            <p>Your P/L: {formatUsd(legsPreview.userLegUsd)}</p>
            <p>Client P/L: {formatUsd(legsPreview.clientLegUsd)}</p>
            <p className="mt-2 text-xs text-slate-500">
              US Available Cash impact: {formatUsd(realizedPreview)} (difference from
              previous realized amount on save).
            </p>
          </div>
        )}

        <Input
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />
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
    <Modal
      title={`Edit Notes — ${trade.underlying}`}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save Notes</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          error={error ?? undefined}
        />
      </div>
    </Modal>
  );
}
