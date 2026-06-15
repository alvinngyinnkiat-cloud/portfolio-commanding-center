import type { OptionsCloseEvent, OptionsTrade } from "@/core/domain/types/options";

/** Original contract count at open — `contracts` field is the source of truth. */
export function getOriginalContracts(trade: OptionsTrade): number {
  return trade.contracts;
}

/** Contracts still open on this trade. */
export function getRemainingContracts(trade: OptionsTrade): number {
  if (trade.remainingContracts != null) {
    return trade.remainingContracts;
  }
  return trade.status === "open" ? trade.contracts : 0;
}

/** Cumulative contracts closed (partial + final). */
export function getClosedContracts(trade: OptionsTrade): number {
  if (trade.closedContracts != null) {
    return trade.closedContracts;
  }
  if (trade.closeEvents?.length) {
    return trade.closeEvents.reduce((sum, event) => sum + event.contractsClosed, 0);
  }
  return trade.status === "closed" ? trade.contracts : 0;
}

export function sumCloseEventRealizedPlUsd(trade: OptionsTrade): number {
  return (trade.closeEvents ?? []).reduce(
    (sum, event) => sum + event.realizedPlUsd,
    0
  );
}

/** Total realized P/L — close events plus legacy closed-trade field. */
export function getTradeTotalRealizedPlUsd(trade: OptionsTrade): number {
  if (trade.closeEvents?.length) {
    return sumCloseEventRealizedPlUsd(trade);
  }
  if (trade.status === "closed" && trade.realizedPlUsd != null) {
    return trade.realizedPlUsd;
  }
  return 0;
}

export function allocateOpenAmountsForContracts(
  trade: OptionsTrade,
  contracts: number
): { openPremiumUsd: number; openFeesUsd: number } {
  const original = getOriginalContracts(trade);
  if (original <= 0 || contracts <= 0) {
    return { openPremiumUsd: 0, openFeesUsd: 0 };
  }
  const share = contracts / original;
  return {
    openPremiumUsd: trade.openPremiumUsd * share,
    openFeesUsd: trade.openFeesUsd * share,
  };
}

/** Scale trade fields to remaining open contracts for risk / economics / unrealized. */
export function tradeForRemainingContracts(trade: OptionsTrade): OptionsTrade {
  const remaining = getRemainingContracts(trade);
  const original = getOriginalContracts(trade);
  if (remaining <= 0 || remaining === original) {
    if (remaining === original) return trade;
    return { ...trade, contracts: remaining };
  }
  const share = remaining / original;
  return {
    ...trade,
    contracts: remaining,
    openPremiumUsd: trade.openPremiumUsd * share,
    openFeesUsd: trade.openFeesUsd * share,
    maxRiskUsd: trade.maxRiskUsd * share,
  };
}

export function scaleMaxRiskForRemaining(trade: OptionsTrade): number {
  const original = getOriginalContracts(trade);
  const remaining = getRemainingContracts(trade);
  if (original <= 0) return trade.maxRiskUsd;
  if (remaining <= 0) {
    return trade.status === "closed" ? 0 : trade.maxRiskUsd;
  }
  return trade.maxRiskUsd * (remaining / original);
}

export function initializeContractTracking(
  contracts: number
): Pick<OptionsTrade, "remainingContracts" | "closedContracts" | "closeEvents"> {
  return {
    remainingContracts: contracts,
    closedContracts: 0,
    closeEvents: [],
  };
}

export function appendCloseEvent(
  trade: OptionsTrade,
  event: OptionsCloseEvent
): Pick<OptionsTrade, "remainingContracts" | "closedContracts" | "closeEvents"> {
  const remaining = getRemainingContracts(trade) - event.contractsClosed;
  const closed = getClosedContracts(trade) + event.contractsClosed;
  return {
    remainingContracts: remaining,
    closedContracts: closed,
    closeEvents: [...(trade.closeEvents ?? []), event],
  };
}

/** Close events for display — synthesizes a legacy single-close row when needed. */
export function resolveCloseEvents(trade: OptionsTrade): OptionsCloseEvent[] {
  if (trade.closeEvents?.length) {
    return trade.closeEvents;
  }
  if (trade.status !== "closed" || !trade.closeDate) {
    return [];
  }
  return [
    {
      id: `${trade.id}-legacy`,
      closeDate: trade.closeDate,
      contractsClosed: trade.contracts,
      closePremiumUsd: trade.closePremiumUsd ?? 0,
      closeFeesUsd: trade.closeFeesUsd ?? 0,
      closeMethod: trade.closeMethod ?? "normal",
      manualRealizedPlUsd: trade.manualRealizedPlUsd,
      realizedPlUsd: trade.realizedPlUsd ?? 0,
      createdAt: trade.updatedAt,
    },
  ];
}
