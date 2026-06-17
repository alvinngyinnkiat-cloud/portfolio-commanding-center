import type { OptionsCloseEvent, OptionsTrade } from "@/core/domain/types/options";
import {
  allocateOpenAmountsForContracts,
  resolveCloseEvents,
} from "@/core/calculations/options/contract-tracking";
import { isDebitStrategy } from "@/core/calculations/options/strategy-kind";

export interface OptionsCashFlowSummary {
  optionOpenCashFlowUsd: number;
  optionNormalCloseCashFlowUsd: number;
  optionManualCloseCashFlowUsd: number;
  optionCloseCashFlowUsd: number;
  netOptionsCashFlowUsd: number;
}

/** Display buckets for USD cash reconciliation report (section C). */
export interface OptionsReconciliationTotals {
  totalPremiumReceivedUsd: number;
  totalCloseDebitsUsd: number;
  totalOpeningFeesUsd: number;
  totalClosingFeesUsd: number;
  totalOptionFeesUsd: number;
  totalManualPlAdjustmentsUsd: number;
  /** Sum of manual realized P/L on manual_pl closed trades. */
  totalManualPlTradesUsd: number;
  manualPlTradeCount: number;
  openTradesPremiumUsd: number;
  closedTradesPremiumUsd: number;
}

/** Broker cash impact when an option trade is opened. */
export function computeOptionOpenCashFlowUsd(trade: OptionsTrade): number {
  if (isDebitStrategy(trade.strategy)) {
    return -(trade.openPremiumUsd + trade.openFeesUsd);
  }
  return trade.openPremiumUsd - trade.openFeesUsd;
}

function allocatedOpenCashFlowUsd(
  trade: OptionsTrade,
  contractsClosed: number
): number {
  const allocated = allocateOpenAmountsForContracts(trade, contractsClosed);
  if (isDebitStrategy(trade.strategy)) {
    return -(allocated.openPremiumUsd + allocated.openFeesUsd);
  }
  return allocated.openPremiumUsd - allocated.openFeesUsd;
}

/** Broker cash impact for one close event (normal or manual P/L). */
export function computeCloseEventCashFlowUsd(
  trade: OptionsTrade,
  event: OptionsCloseEvent
): number {
  const openFlow = allocatedOpenCashFlowUsd(trade, event.contractsClosed);

  if (event.closeMethod === "manual_pl") {
    const manualPl = event.manualRealizedPlUsd ?? event.realizedPlUsd;
    return manualPl - openFlow;
  }

  if (isDebitStrategy(trade.strategy)) {
    return event.closePremiumUsd - event.closeFeesUsd;
  }

  return -(event.closePremiumUsd + event.closeFeesUsd);
}

export function summarizeOptionsCashFlowUsd(
  trades: OptionsTrade[]
): OptionsCashFlowSummary {
  let optionOpenCashFlowUsd = 0;
  let optionNormalCloseCashFlowUsd = 0;
  let optionManualCloseCashFlowUsd = 0;

  for (const trade of trades) {
    optionOpenCashFlowUsd += computeOptionOpenCashFlowUsd(trade);

    for (const event of resolveCloseEvents(trade)) {
      const closeFlow = computeCloseEventCashFlowUsd(trade, event);
      if (event.closeMethod === "manual_pl") {
        optionManualCloseCashFlowUsd += closeFlow;
      } else {
        optionNormalCloseCashFlowUsd += closeFlow;
      }
    }
  }

  const optionCloseCashFlowUsd =
    optionNormalCloseCashFlowUsd + optionManualCloseCashFlowUsd;

  return {
    optionOpenCashFlowUsd,
    optionNormalCloseCashFlowUsd,
    optionManualCloseCashFlowUsd,
    optionCloseCashFlowUsd,
    netOptionsCashFlowUsd: optionOpenCashFlowUsd + optionCloseCashFlowUsd,
  };
}

/**
 * Options activity split for USD cash reconciliation.
 *
 * Net options cash =
 *   Premium Received − Close Debits − Option Fees + Manual P/L Adjustments
 */
export function summarizeOptionsReconciliationUsd(
  trades: OptionsTrade[]
): OptionsReconciliationTotals {
  let totalPremiumReceivedUsd = 0;
  let totalCloseDebitsUsd = 0;
  let totalOpeningFeesUsd = 0;
  let totalClosingFeesUsd = 0;
  let totalManualPlAdjustmentsUsd = 0;
  let totalManualPlTradesUsd = 0;
  let manualPlTradeCount = 0;
  let openTradesPremiumUsd = 0;
  let closedTradesPremiumUsd = 0;

  for (const trade of trades) {
    totalOpeningFeesUsd += trade.openFeesUsd ?? 0;

    if (trade.status === "open" && !isDebitStrategy(trade.strategy)) {
      openTradesPremiumUsd += trade.openPremiumUsd;
    }

    if (isDebitStrategy(trade.strategy)) {
      totalCloseDebitsUsd += trade.openPremiumUsd;
    } else if (trade.status === "closed") {
      closedTradesPremiumUsd += trade.openPremiumUsd;
      totalPremiumReceivedUsd += trade.openPremiumUsd;
    } else {
      totalPremiumReceivedUsd += trade.openPremiumUsd;
    }

    for (const event of resolveCloseEvents(trade)) {
      totalClosingFeesUsd += event.closeFeesUsd ?? 0;

      if (event.closeMethod === "manual_pl") {
        manualPlTradeCount += 1;
        const manualPl = event.manualRealizedPlUsd ?? event.realizedPlUsd ?? 0;
        totalManualPlTradesUsd += manualPl;
        totalManualPlAdjustmentsUsd += computeCloseEventCashFlowUsd(trade, event);
        continue;
      }

      if (isDebitStrategy(trade.strategy)) {
        totalPremiumReceivedUsd += event.closePremiumUsd;
        if (trade.status === "closed") {
          closedTradesPremiumUsd += event.closePremiumUsd;
        }
      } else {
        totalCloseDebitsUsd += event.closePremiumUsd;
      }
    }
  }

  const totalOptionFeesUsd = totalOpeningFeesUsd + totalClosingFeesUsd;

  return {
    totalPremiumReceivedUsd,
    totalCloseDebitsUsd,
    totalOpeningFeesUsd,
    totalClosingFeesUsd,
    totalOptionFeesUsd,
    totalManualPlAdjustmentsUsd,
    totalManualPlTradesUsd,
    manualPlTradeCount,
    openTradesPremiumUsd,
    closedTradesPremiumUsd,
  };
}
