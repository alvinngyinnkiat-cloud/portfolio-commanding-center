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
