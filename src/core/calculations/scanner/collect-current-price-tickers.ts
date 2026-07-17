import type { OptionsOpenTradeRow } from "@/core/domain/types/options";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import type { CurrentPriceTickerInput } from "@/core/services/current-price-service";

/** Collect unique open-trade tickers with Module 5 manual/saved fallbacks. */
export function collectOpenTradeCurrentPriceInputs(
  rows: OptionsOpenTradeRow[]
): CurrentPriceTickerInput[] {
  const map = new Map<string, CurrentPriceTickerInput>();

  for (const row of rows) {
    const ticker = normalizeTicker(row.trade.underlying);
    if (!ticker) continue;
    const existing = map.get(ticker);
    const manualPriceUsd = row.trade.underlyingPriceUsd ?? existing?.manualPriceUsd;
    map.set(ticker, {
      ticker,
      manualPriceUsd,
      savedTradePriceUsd: manualPriceUsd,
    });
  }

  return [...map.values()];
}

/** Collect unique foundation tickers from income overlay views. */
export function collectFoundationCurrentPriceInputs(
  tickers: string[],
  openRows: OptionsOpenTradeRow[]
): CurrentPriceTickerInput[] {
  const openByTicker = new Map<string, OptionsOpenTradeRow>();
  for (const row of openRows) {
    openByTicker.set(normalizeTicker(row.trade.underlying), row);
  }

  return tickers.map((ticker) => {
    const normalized = normalizeTicker(ticker);
    const row = openByTicker.get(normalized);
    const manualPriceUsd = row?.trade.underlyingPriceUsd ?? null;
    return {
      ticker: normalized,
      manualPriceUsd,
      savedTradePriceUsd: manualPriceUsd,
    };
  });
}
