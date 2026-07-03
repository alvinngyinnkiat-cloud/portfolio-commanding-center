import type { DailySnapshot, SnapshotType } from "@/core/domain/types";
import { normalizeDailySnapshot } from "@/core/calculations/snapshots";

/** Supabase `daily_snapshots` row shape. */
export interface DailySnapshotRow {
  id?: string;
  snapshot_date: string;
  created_at: string;
  type: SnapshotType;
  my_portfolio_sgd: number;
  total_portfolio_sgd: number;
  client_equity_sgd: number;
  us_stocks_sgd: number;
  sg_stocks_sgd: number;
  crypto_sgd: number;
  personal_cash_sgd: number;
  total_contribution_sgd: number;
  fx_rate_used: number | null;
  extended_data?: Record<string, unknown> | null;
}

export function dailySnapshotToRow(
  snapshot: DailySnapshot
): Omit<DailySnapshotRow, "id"> {
  return {
    snapshot_date: snapshot.date,
    created_at: snapshot.createdAt,
    type: snapshot.snapshotType,
    my_portfolio_sgd: snapshot.ownPortfolio,
    total_portfolio_sgd: snapshot.totalPortfolio,
    client_equity_sgd: snapshot.clientPortfolio,
    us_stocks_sgd: snapshot.usStocksEtfSgd,
    sg_stocks_sgd: snapshot.sgStocksSgd,
    crypto_sgd: snapshot.cryptoSgd,
    personal_cash_sgd: snapshot.personalCashSgd,
    total_contribution_sgd: snapshot.totalContribution,
    fx_rate_used: snapshot.fxRateUsed ?? null,
    extended_data: {
      netOptionsMarketValueSgd: snapshot.netOptionsMarketValueSgd ?? null,
      cryptoHoldingsValueSgd: snapshot.cryptoHoldingsValueSgd ?? null,
      totalCashSgd: snapshot.totalCashSgd ?? null,
      cashSgd: snapshot.cashSgd,
      breakdown: snapshot.breakdown ?? null,
    },
  };
}

export function rowToDailySnapshot(row: DailySnapshotRow): DailySnapshot {
  const extended = row.extended_data ?? {};
  const num = (value: unknown, fallback = 0) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  };

  return normalizeDailySnapshot({
    date: row.snapshot_date,
    createdAt: row.created_at,
    snapshotType: row.type === "automatic" ? "automatic" : "manual",
    ownPortfolio: num(row.my_portfolio_sgd),
    totalPortfolio: num(row.total_portfolio_sgd),
    clientPortfolio: num(row.client_equity_sgd),
    usStocksEtfSgd: num(row.us_stocks_sgd),
    sgStocksSgd: num(row.sg_stocks_sgd),
    cryptoSgd: num(row.crypto_sgd),
    personalCashSgd: num(row.personal_cash_sgd),
    totalContribution: num(row.total_contribution_sgd),
    fxRateUsed:
      row.fx_rate_used != null ? num(row.fx_rate_used, NaN) || undefined : undefined,
    netOptionsMarketValueSgd:
      extended.netOptionsMarketValueSgd as number | null | undefined,
    cryptoHoldingsValueSgd: extended.cryptoHoldingsValueSgd as number | undefined,
    totalCashSgd: extended.totalCashSgd as number | undefined,
    cashSgd: extended.cashSgd as number | undefined,
    breakdown: extended.breakdown as DailySnapshot["breakdown"],
  });
}
