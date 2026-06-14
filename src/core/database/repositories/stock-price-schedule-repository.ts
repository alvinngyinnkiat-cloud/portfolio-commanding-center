export interface StockPriceScheduleState {
  usLastUpdateDate: string | null;
  sgLastUpdateDate: string | null;
  /** SGT date when US daily candles were last refreshed */
  usLastCandleUpdateDate?: string | null;
}

export interface StockPriceScheduleRepository {
  get(): StockPriceScheduleState;
  set(state: StockPriceScheduleState): void;
}
