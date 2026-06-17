import type { OptionsTrade } from "@/core/domain/types/options";
import { resolveCloseEvents } from "@/core/calculations/options/contract-tracking";
import { isDebitStrategy } from "@/core/calculations/options/strategy-kind";

export interface OptionCashAuditRow {
  tradeId: string;
  ticker: string;
  openDate: string;
  closeDate: string;
  premiumReceivedUsd: number;
  openFeesUsd: number;
  closeDebitUsd: number;
  closeFeesUsd: number;
  realizedPlUsd: number;
  cashImpactUsd: number;
  cashImpactMatchesPl: boolean;
  isManualPl: boolean;
}

export interface OptionCashAuditSummary {
  totalPremiumReceivedUsd: number;
  totalRealizedPlUsd: number;
  differenceUsd: number;
}

/** Audit cash impact: Premium Received − Open Fees − Close Debit − Close Fees. */
export function computeOptionAuditCashImpactUsd(input: {
  premiumReceivedUsd: number;
  openFeesUsd: number;
  closeDebitUsd: number;
  closeFeesUsd: number;
}): number {
  return (
    input.premiumReceivedUsd -
    input.openFeesUsd -
    input.closeDebitUsd -
    input.closeFeesUsd
  );
}

export function buildOptionCashAuditRow(trade: OptionsTrade): OptionCashAuditRow | null {
  if (trade.status !== "closed") {
    return null;
  }

  const events = resolveCloseEvents(trade);
  const openFeesUsd = trade.openFeesUsd ?? 0;
  let premiumReceivedUsd = 0;
  let closeDebitUsd = 0;
  let closeFeesUsd = 0;
  let realizedPlUsd = 0;
  let isManualPl = false;

  if (isDebitStrategy(trade.strategy)) {
    closeDebitUsd = trade.openPremiumUsd;
    for (const event of events) {
      premiumReceivedUsd += event.closePremiumUsd;
      closeFeesUsd += event.closeFeesUsd ?? 0;
      if (event.closeMethod === "manual_pl") {
        isManualPl = true;
        realizedPlUsd = event.manualRealizedPlUsd ?? event.realizedPlUsd ?? 0;
      } else {
        realizedPlUsd += event.realizedPlUsd;
      }
    }
  } else {
    premiumReceivedUsd = trade.openPremiumUsd;
    for (const event of events) {
      closeDebitUsd += event.closePremiumUsd;
      closeFeesUsd += event.closeFeesUsd ?? 0;
      if (event.closeMethod === "manual_pl") {
        isManualPl = true;
        realizedPlUsd = event.manualRealizedPlUsd ?? event.realizedPlUsd ?? 0;
      } else {
        realizedPlUsd += event.realizedPlUsd;
      }
    }
  }

  if (events.length === 0) {
    closeFeesUsd = trade.closeFeesUsd ?? 0;
    realizedPlUsd = trade.realizedPlUsd ?? 0;
    isManualPl = trade.closeMethod === "manual_pl";
    if (isManualPl && trade.manualRealizedPlUsd != null) {
      realizedPlUsd = trade.manualRealizedPlUsd;
    }
    if (isDebitStrategy(trade.strategy)) {
      closeDebitUsd = trade.openPremiumUsd;
      premiumReceivedUsd = trade.closePremiumUsd ?? 0;
    } else {
      premiumReceivedUsd = trade.openPremiumUsd;
      closeDebitUsd = trade.closePremiumUsd ?? 0;
    }
  }

  const cashImpactUsd = computeOptionAuditCashImpactUsd({
    premiumReceivedUsd,
    openFeesUsd,
    closeDebitUsd,
    closeFeesUsd,
  });

  const closeDate =
    events[events.length - 1]?.closeDate ?? trade.closeDate ?? "—";

  return {
    tradeId: trade.id,
    ticker: trade.underlying,
    openDate: trade.openDate,
    closeDate,
    premiumReceivedUsd,
    openFeesUsd,
    closeDebitUsd,
    closeFeesUsd,
    realizedPlUsd,
    cashImpactUsd,
    cashImpactMatchesPl: Math.abs(cashImpactUsd - realizedPlUsd) < 0.01,
    isManualPl,
  };
}

export function buildOptionCashAuditRows(
  trades: OptionsTrade[]
): OptionCashAuditRow[] {
  return trades
    .map((trade) => buildOptionCashAuditRow(trade))
    .filter((row): row is OptionCashAuditRow => row != null)
    .sort((a, b) => b.closeDate.localeCompare(a.closeDate));
}

export function summarizeOptionCashAudit(
  rows: OptionCashAuditRow[]
): OptionCashAuditSummary {
  const totalPremiumReceivedUsd = rows.reduce(
    (sum, row) => sum + row.premiumReceivedUsd,
    0
  );
  const totalRealizedPlUsd = rows.reduce(
    (sum, row) => sum + row.realizedPlUsd,
    0
  );

  return {
    totalPremiumReceivedUsd,
    totalRealizedPlUsd,
    differenceUsd: totalPremiumReceivedUsd - totalRealizedPlUsd,
  };
}
