"use client";

import { useMemo } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { CryptoTrade } from "@/core/domain/types";
import { formatDate, formatSgd } from "@/shared/lib/format";
import { compareDateDescWithCreatedAt } from "@/shared/lib/sort";

export function CryptoTransactionsSection() {
  const { cryptoData } = usePortfolio();

  const transactions = useMemo(
    () =>
      [...(cryptoData?.trades ?? [])].sort((a, b) =>
        compareDateDescWithCreatedAt(
          { date: a.date, createdAt: a.createdAt ?? a.id },
          { date: b.date, createdAt: b.createdAt ?? b.id }
        )
      ),
    [cryptoData?.trades]
  );

  return (
    <div className="min-w-0 space-y-4">
      <p className="text-xs text-slate-500">
        Buy and sell records from the Holdings tab. Newest transactions appear first.
      </p>

      <div className="overflow-x-auto rounded-xl border border-surface-border/60">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface/60 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Asset</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Amount SGD</th>
              <th className="px-4 py-3 text-left">Fees</th>
              <th className="px-4 py-3 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No buy or sell transactions yet.
                </td>
              </tr>
            ) : (
              transactions.map((row: CryptoTrade) => (
                <tr
                  key={row.id}
                  className="border-b border-surface-border/40 text-slate-300 last:border-0"
                >
                  <td className="px-4 py-3">{formatDate(row.date)}</td>
                  <td className="px-4 py-3 font-medium text-white">
                    {row.assetName}
                  </td>
                  <td className="px-4 py-3 capitalize text-white">{row.type}</td>
                  <td className="px-4 py-3">{formatSgd(row.amountSgd)}</td>
                  <td className="px-4 py-3">{formatSgd(row.feesSgd ?? 0)}</td>
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
