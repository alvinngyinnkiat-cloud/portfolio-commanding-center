import type { StockTransaction } from "@/core/domain/types";
import type { OptionsTrade } from "@/core/domain/types/options";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import { usdToSgd } from "@/core/calculations/fx";
import { isValidFxRate } from "@/core/calculations/fx-validation";
import {
  computeCloseEventCashFlowUsd,
  computeOptionOpenCashFlowUsd,
} from "@/core/calculations/us-cash/options-cash-flow";
import { calculateUsAvailableCashUsd } from "@/core/calculations/us-cash/ledger";
import { buildUsEffectiveCashFields } from "@/core/calculations/us-cash/effective-cash";
import { resolveCloseEvents } from "@/core/calculations/options/contract-tracking";
import {
  resolveDividendCashAmount,
  resolveStandaloneFeeAmount,
  resolveTransactionGrossAmount,
} from "./transaction-amounts";
import type { UsCashLedgerInput } from "@/core/calculations/us-cash/types";

export interface FxPerformanceMetrics {
  /** Remaining SGD cost basis after proportional USD spend (informational). */
  fxCostBasisSgd: number;
  currentUsdCashUsd: number;
  currentUsdValueSgd: number;
  fxGainLossSgd: number;
  fxRateValid: boolean;
}

interface UsdCashSimulationEvent {
  date: string;
  createdAt: string;
  sgdCostAdd: number;
  usdInflow: number;
  usdOutflow: number;
}

function compareDateAsc(a: string, b: string): number {
  return a.localeCompare(b);
}

function compareEventsAsc(a: UsdCashSimulationEvent, b: UsdCashSimulationEvent): number {
  const byDate = compareDateAsc(a.date, b.date);
  if (byDate !== 0) return byDate;
  return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
}

function reduceFxCostBasisProportionally(
  usdBalance: number,
  fxCostBasisSgd: number,
  usdOutflow: number
): number {
  if (usdOutflow <= 0 || usdBalance <= 0 || fxCostBasisSgd <= 0) {
    return fxCostBasisSgd;
  }
  const ratio = Math.min(1, usdOutflow / usdBalance);
  return fxCostBasisSgd * (1 - ratio);
}

function buyCashEffect(transaction: StockTransaction): number {
  return resolveTransactionGrossAmount(transaction) + transaction.fees;
}

function sellCashEffect(transaction: StockTransaction): number {
  return resolveTransactionGrossAmount(transaction) - transaction.fees;
}

function buildUsdCashSimulationEvents(
  fxConversions: StockFxConversion[],
  stockTransactions: StockTransaction[],
  optionsTrades: OptionsTrade[]
): UsdCashSimulationEvent[] {
  const events: UsdCashSimulationEvent[] = [];

  for (const fx of fxConversions) {
    if (fx.direction === "sgd_to_usd") {
      events.push({
        date: fx.date,
        createdAt: fx.createdAt,
        sgdCostAdd: fx.sgdAmount,
        usdInflow: fx.usdAmount,
        usdOutflow: 0,
      });
      continue;
    }

    events.push({
      date: fx.date,
      createdAt: fx.createdAt,
      sgdCostAdd: 0,
      usdInflow: 0,
      usdOutflow: fx.usdAmount,
    });
  }

  for (const tx of stockTransactions) {
    if (tx.market !== "US") continue;

    switch (tx.transactionType) {
      case "buy":
        events.push({
          date: tx.date,
          createdAt: tx.createdAt,
          sgdCostAdd: 0,
          usdInflow: 0,
          usdOutflow: buyCashEffect(tx),
        });
        break;
      case "sell":
        events.push({
          date: tx.date,
          createdAt: tx.createdAt,
          sgdCostAdd: 0,
          usdInflow: sellCashEffect(tx),
          usdOutflow: 0,
        });
        break;
      case "dividend":
        events.push({
          date: tx.date,
          createdAt: tx.createdAt,
          sgdCostAdd: 0,
          usdInflow: resolveDividendCashAmount(tx),
          usdOutflow: 0,
        });
        break;
      case "fee":
        events.push({
          date: tx.date,
          createdAt: tx.createdAt,
          sgdCostAdd: 0,
          usdInflow: 0,
          usdOutflow: resolveStandaloneFeeAmount(tx),
        });
        break;
      default: {
        const _exhaustive: never = tx.transactionType;
        return _exhaustive;
      }
    }
  }

  for (const trade of optionsTrades) {
    const openFlow = computeOptionOpenCashFlowUsd(trade);
    events.push({
      date: trade.openDate,
      createdAt: trade.openDate,
      sgdCostAdd: 0,
      usdInflow: openFlow > 0 ? openFlow : 0,
      usdOutflow: openFlow < 0 ? -openFlow : 0,
    });

    for (const event of resolveCloseEvents(trade)) {
      const closeFlow = computeCloseEventCashFlowUsd(trade, event);
      events.push({
        date: event.closeDate,
        createdAt: event.createdAt,
        sgdCostAdd: 0,
        usdInflow: closeFlow > 0 ? closeFlow : 0,
        usdOutflow: closeFlow < 0 ? -closeFlow : 0,
      });
    }
  }

  return events.sort(compareEventsAsc);
}

/** Remaining FX cost basis after proportional USD outflows (informational only). */
export function calculateRemainingFxCostBasisSgd(
  fxConversions: StockFxConversion[],
  stockTransactions: StockTransaction[],
  optionsTrades: OptionsTrade[] = []
): number {
  let usdBalance = 0;
  let fxCostBasisSgd = 0;

  for (const event of buildUsdCashSimulationEvents(
    fxConversions,
    stockTransactions,
    optionsTrades
  )) {
    if (event.sgdCostAdd > 0) {
      fxCostBasisSgd += event.sgdCostAdd;
      usdBalance += event.usdInflow;
    }

    if (event.usdOutflow > 0) {
      fxCostBasisSgd = reduceFxCostBasisProportionally(
        usdBalance,
        fxCostBasisSgd,
        event.usdOutflow
      );
      usdBalance = Math.max(0, usdBalance - event.usdOutflow);
    }

    if (event.usdInflow > 0 && event.sgdCostAdd === 0) {
      usdBalance += event.usdInflow;
    }
  }

  return fxCostBasisSgd;
}

export function buildFxPerformanceMetrics(
  input: UsCashLedgerInput & { brokerUsdCashOverride?: number | null }
): FxPerformanceMetrics {
  const fxRateValid = isValidFxRate(input.fxRate);
  const systemUsdCash = calculateUsAvailableCashUsd(input);
  const effectiveCash = buildUsEffectiveCashFields(
    systemUsdCash,
    input.brokerUsdCashOverride
  );
  const currentUsdCashUsd = effectiveCash.usAvailableTradingCashUsd;
  const fxCostBasisSgd = calculateRemainingFxCostBasisSgd(
    input.fxConversions ?? [],
    input.stockTransactions,
    input.optionsTrades ?? []
  );

  const currentUsdValueSgd =
    fxRateValid && input.fxRate != null
      ? usdToSgd(currentUsdCashUsd, input.fxRate)
      : 0;
  const fxGainLossSgd = currentUsdValueSgd - fxCostBasisSgd;

  return {
    fxCostBasisSgd,
    currentUsdCashUsd,
    currentUsdValueSgd,
    fxGainLossSgd,
    fxRateValid,
  };
}
