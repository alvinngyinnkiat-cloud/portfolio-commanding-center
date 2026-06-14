export type StockFxDirection = "sgd_to_usd" | "usd_to_sgd";

export interface StockFxConversion {
  id: string;
  date: string;
  direction: StockFxDirection;
  sgdAmount: number;
  usdAmount: number;
  notes?: string;
  createdAt: string;
}
