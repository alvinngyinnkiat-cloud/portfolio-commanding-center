"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { CryptoHoldingRow } from "@/core/domain/types";
import { formatSgd } from "@/shared/lib/format";
import { compareDateDescWithCreatedAt } from "@/shared/lib/sort";

type CryptoTransactionType = "buy" | "sell" | "staking";

interface CryptoTransactionRow {
  id: string;
  sortKey: string;
  type: CryptoTransactionType;
  assetName: string;
  amountSgd: number;
  feesSgd: number;
  currentValueSgd: number;
  notes?: string;
}

function compareHoldingNewestFirst(a: CryptoHoldingRow, b: CryptoHoldingRow): number {
  return compareDateDescWithCreatedAt(
    { date: "", createdAt: a.id },
    { date: "", createdAt: b.id }
  );
}

export function CryptoTransactionsSection() {
  const { cryptoData } = usePortfolio();
  const rows = cryptoData?.rows ?? [];

  const transactions = useMemo<CryptoTransactionRow[]>(() => {
    return [...rows]
      .sort(compareHoldingNewestFirst)
      .map((row) => ({
        id: row.id,
        sortKey: row.id,
        type: "buy" as const,
        assetName: row.assetName,
        amountSgd: row.investedSgd,
        feesSgd: row.feesSgd ?? 0,
        currentValueSgd: row.currentValueSgd,
        notes: row.notes,
      }));
  }, [rows]);

  return (
    <div className="min-w-0 space-y-4">
      <p className="text-xs text-slate-500">
        Buy entries are derived from holdings. Add or edit holdings in the Holdings
        tab. Sell and staking reward types are not tracked separately yet.
      </p>

      <div className="overflow-x-auto rounded-xl border border-surface-border/60">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface/60 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Asset</th>
              <th className="px-4 py-3 text-left">Buy Amount</th>
              <th className="px-4 py-3 text-left">Fees</th>
              <th className="px-4 py-3 text-left">Current Value</th>
              <th className="px-4 py-3 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No buy transactions yet.
                </td>
              </tr>
            ) : (
              transactions.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-surface-border/40 text-slate-300 last:border-0"
                >
                  <td className="px-4 py-3 capitalize text-white">{row.type}</td>
                  <td className="px-4 py-3 font-medium text-white">
                    {row.assetName}
                  </td>
                  <td className="px-4 py-3">{formatSgd(row.amountSgd)}</td>
                  <td className="px-4 py-3">{formatSgd(row.feesSgd)}</td>
                  <td className="px-4 py-3">{formatSgd(row.currentValueSgd)}</td>
                  <td className="px-4 py-3">{row.notes ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
