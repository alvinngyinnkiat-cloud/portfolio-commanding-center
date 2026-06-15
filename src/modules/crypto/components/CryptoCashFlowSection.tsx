"use client";

import { useMemo, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { ContributionTransaction } from "@/core/domain/types";
import { formatDate, formatSgd } from "@/shared/lib/format";
import { sortByDateDesc } from "@/shared/lib/sort";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";

const HISTORY_PREVIEW_LIMIT = 5;

function HistoryFooter({
  total,
  previewCount,
  onViewAll,
}: {
  total: number;
  previewCount: number;
  onViewAll: () => void;
}) {
  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500">
        Showing {previewCount} of {total} record{total === 1 ? "" : "s"}
      </p>
      {total > HISTORY_PREVIEW_LIMIT && (
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={onViewAll}>
          View All
        </Button>
      )}
    </div>
  );
}

function CashFlowHistoryTable({
  rows,
  emptyMessage,
}: {
  rows: ContributionTransaction[];
  emptyMessage: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border/60">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-surface/60 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Amount SGD</th>
            <th className="px-4 py-3 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-surface-border/40 text-slate-300 last:border-0"
              >
                <td className="px-4 py-3">{formatDate(row.date)}</td>
                <td className="px-4 py-3 font-medium text-white">
                  {formatSgd(row.amountSgd)}
                </td>
                <td className="px-4 py-3">{row.notes ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function CryptoCashFlowSection() {
  const { data } = usePortfolio();
  const [showAllDeposits, setShowAllDeposits] = useState(false);
  const [showAllWithdrawals, setShowAllWithdrawals] = useState(false);

  const deposits = useMemo(
    () =>
      sortByDateDesc(
        (data?.contributions ?? []).filter(
          (row) => row.category === "crypto" && row.type === "deposit"
        )
      ),
    [data?.contributions]
  );

  const withdrawals = useMemo(
    () =>
      sortByDateDesc(
        (data?.contributions ?? []).filter(
          (row) => row.category === "crypto" && row.type === "withdrawal"
        )
      ),
    [data?.contributions]
  );

  const previewDeposits = deposits.slice(0, HISTORY_PREVIEW_LIMIT);
  const previewWithdrawals = withdrawals.slice(0, HISTORY_PREVIEW_LIMIT);
  const depositPreviewCount = Math.min(deposits.length, HISTORY_PREVIEW_LIMIT);
  const withdrawalPreviewCount = Math.min(
    withdrawals.length,
    HISTORY_PREVIEW_LIMIT
  );

  return (
    <div className="min-w-0 space-y-8">
      <p className="text-xs text-slate-500">
        Add or edit crypto deposits and withdrawals in Settings → Contributions.
        This tab shows cash flow history only.
      </p>

      <section className="space-y-4">
        <h3 className="font-medium text-white">Deposit History</h3>
        <CashFlowHistoryTable
          rows={previewDeposits}
          emptyMessage="No crypto deposit records yet."
        />
        <HistoryFooter
          total={deposits.length}
          previewCount={depositPreviewCount}
          onViewAll={() => setShowAllDeposits(true)}
        />
      </section>

      <section className="space-y-4">
        <h3 className="font-medium text-white">Withdrawal History</h3>
        <CashFlowHistoryTable
          rows={previewWithdrawals}
          emptyMessage="No crypto withdrawal records yet."
        />
        <HistoryFooter
          total={withdrawals.length}
          previewCount={withdrawalPreviewCount}
          onViewAll={() => setShowAllWithdrawals(true)}
        />
      </section>

      {showAllDeposits && (
        <Modal
          title="Crypto Deposit History"
          onClose={() => setShowAllDeposits(false)}
          wide
        >
          <CashFlowHistoryTable
            rows={deposits}
            emptyMessage="No crypto deposit records yet."
          />
          <p className="mt-4 text-sm text-slate-500">
            Showing {deposits.length} of {deposits.length} record
            {deposits.length === 1 ? "" : "s"}
          </p>
        </Modal>
      )}

      {showAllWithdrawals && (
        <Modal
          title="Crypto Withdrawal History"
          onClose={() => setShowAllWithdrawals(false)}
          wide
        >
          <CashFlowHistoryTable
            rows={withdrawals}
            emptyMessage="No crypto withdrawal records yet."
          />
          <p className="mt-4 text-sm text-slate-500">
            Showing {withdrawals.length} of {withdrawals.length} record
            {withdrawals.length === 1 ? "" : "s"}
          </p>
        </Modal>
      )}
    </div>
  );
}
