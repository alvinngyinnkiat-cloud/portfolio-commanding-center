import type { UsAvailableCashResult } from "./types";

export interface UsCashTraceLine {
  label: string;
  amountUsd: number;
  operator: "+" | "−" | "=";
}

/** Human-readable USD cash reconciliation trace for QA. */
export function buildUsCashTrace(result: UsAvailableCashResult): UsCashTraceLine[] {
  const { breakdown, usAvailableCashUsd } = result;

  return [
    {
      label: "USD FX conversions received (net)",
      amountUsd: breakdown.usNetStockCashUsd,
      operator: "+",
    },
    {
      label: "US stock buys including fees",
      amountUsd: breakdown.stockBuySpendUsd,
      operator: "−",
    },
    {
      label: "US stock sells net of fees",
      amountUsd: breakdown.stockSellProceedsUsd,
      operator: "+",
    },
    {
      label: "US dividends",
      amountUsd: breakdown.stockDividendsUsd,
      operator: "+",
    },
    {
      label: "Standalone US fees",
      amountUsd: breakdown.standaloneFeesUsd,
      operator: "−",
    },
    {
      label: "Option open cash flows",
      amountUsd: breakdown.optionOpenCashFlowUsd,
      operator: "+",
    },
    {
      label: "Option close cash flows (normal)",
      amountUsd: breakdown.optionNormalCloseCashFlowUsd,
      operator: "+",
    },
    {
      label: "Manual P/L close cash adjustments",
      amountUsd: breakdown.optionManualCloseCashFlowUsd,
      operator: "+",
    },
    {
      label: "USD Cash",
      amountUsd: usAvailableCashUsd,
      operator: "=",
    },
  ];
}
