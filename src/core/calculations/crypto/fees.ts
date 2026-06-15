import type { CryptoTrade } from "@/core/domain/types";
import { parseIsoDateString } from "@/shared/lib/date";
import { normalizeFeesSgd } from "./contribution";

/** Sum of all buy and sell fees — informational only, not used in portfolio math. */
export function calculateTotalCryptoFeesPaid(trades: CryptoTrade[]): number {
  return trades.reduce(
    (sum, trade) => sum + normalizeFeesSgd(trade.feesSgd),
    0
  );
}

export function calculateCryptoFeesForMonth(
  trades: CryptoTrade[],
  date: Date = new Date()
): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  return trades.reduce((sum, trade) => {
    const iso = parseIsoDateString(trade.date);
    if (!iso) return sum;
    const [y, m] = iso.split("-").map(Number);
    if (y !== year || m !== month) return sum;
    return sum + normalizeFeesSgd(trade.feesSgd);
  }, 0);
}

export function calculateCryptoFeesForYear(
  trades: CryptoTrade[],
  date: Date = new Date()
): number {
  const year = date.getFullYear();

  return trades.reduce((sum, trade) => {
    const iso = parseIsoDateString(trade.date);
    if (!iso) return sum;
    if (Number(iso.split("-")[0]) !== year) return sum;
    return sum + normalizeFeesSgd(trade.feesSgd);
  }, 0);
}
