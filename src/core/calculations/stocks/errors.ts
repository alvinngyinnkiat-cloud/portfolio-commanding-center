export class SellExceedsHoldingsError extends Error {
  readonly market: string;
  readonly ticker: string;
  readonly requestedQuantity: number;
  readonly availableQuantity: number;

  constructor(
    market: string,
    ticker: string,
    requestedQuantity: number,
    availableQuantity: number
  ) {
    super(
      `Cannot sell ${requestedQuantity} shares of ${market}:${ticker}; only ${availableQuantity} held`
    );
    this.name = "SellExceedsHoldingsError";
    this.market = market;
    this.ticker = ticker;
    this.requestedQuantity = requestedQuantity;
    this.availableQuantity = availableQuantity;
  }
}
