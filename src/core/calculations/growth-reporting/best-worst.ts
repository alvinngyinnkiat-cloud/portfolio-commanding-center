import type { BestWorstMonthData } from "./types";
import type { MonthlyPerformanceRow } from "./types";

export function buildBestWorstMonths(
  rows: MonthlyPerformanceRow[]
): BestWorstMonthData {
  if (rows.length === 0) {
    return {
      bestByDollars: null,
      worstByDollars: null,
      bestByPercent: null,
      worstByPercent: null,
      insufficientData: true,
    };
  }

  let bestByDollars: BestWorstMonthData["bestByDollars"] = null;
  let worstByDollars: BestWorstMonthData["worstByDollars"] = null;
  let bestByPercent: BestWorstMonthData["bestByPercent"] = null;
  let worstByPercent: BestWorstMonthData["worstByPercent"] = null;

  for (const row of rows) {
    if (
      !bestByDollars ||
      row.monthlyGrowthDollars > bestByDollars.value
    ) {
      bestByDollars = {
        month: row.monthLabel,
        value: row.monthlyGrowthDollars,
      };
    }
    if (
      !worstByDollars ||
      row.monthlyGrowthDollars < worstByDollars.value
    ) {
      worstByDollars = {
        month: row.monthLabel,
        value: row.monthlyGrowthDollars,
      };
    }

    if (row.monthlyGrowthPercent != null) {
      if (!bestByPercent || row.monthlyGrowthPercent > bestByPercent.value) {
        bestByPercent = {
          month: row.monthLabel,
          value: row.monthlyGrowthPercent,
        };
      }
      if (!worstByPercent || row.monthlyGrowthPercent < worstByPercent.value) {
        worstByPercent = {
          month: row.monthLabel,
          value: row.monthlyGrowthPercent,
        };
      }
    }
  }

  return {
    bestByDollars,
    worstByDollars,
    bestByPercent,
    worstByPercent,
    insufficientData: false,
  };
}
