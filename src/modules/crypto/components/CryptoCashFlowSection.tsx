"use client";

import { useMemo, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { ContributionTransaction, ContributionType } from "@/core/domain/types";
import { plTrend } from "@/core/calculations/crypto/summary";
import { getPersistenceManager } from "@/core/database/supabase";
import { generateId } from "@/core/database/local/local-storage";
import { formatDate, formatPercent, formatSgd } from "@/shared/lib/format";
import { toLocalDateString } from "@/shared/lib/date";
import { sortByDateDesc } from "@/shared/lib/sort";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { Modal } from "@/shared/components/ui/Modal";
import { Wallet, Coins, PiggyBank, TrendingUp } from "lucide-react";

const HISTORY_PREVIEW_LIMIT = 5;

interface DepositForm {
  date: string;
  type: ContributionType;
  amountSgd: string;
  notes: string;
}

const emptyDepositForm = (): DepositForm => ({
  date: toLocalDateString(),
  type: "deposit",
  amountSgd: "",
  notes: "",
});

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

function DepositHistoryTable({
  rows,
  onEdit,
  onDelete,
}: {
  rows: ContributionTransaction[];
  onEdit: (row: ContributionTransaction) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border/60">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-surface/60 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Amount SGD</th>
            <th className="px-4 py-3 text-left">Notes</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                No deposit or withdrawal records yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-surface-border/40 text-slate-300 last:border-0"
              >
                <td className="px-4 py-3">{formatDate(row.date)}</td>
                <td className="px-4 py-3 capitalize">{row.type}</td>
                <td className="px-4 py-3 font-medium text-white">
                  {formatSgd(row.amountSgd)}
                </td>
                <td className="px-4 py-3">{row.notes ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => onEdit(row)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      className="px-2 py-1 text-xs text-accent-red"
                      onClick={() => onDelete(row.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function CryptoCashFlowSection() {
  const { cryptoData, data, services, refresh } = usePortfolio();
  const [depositForm, setDepositForm] = useState<DepositForm>(emptyDepositForm);
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);
  const [showAllDeposits, setShowAllDeposits] = useState(false);

  const summary = cryptoData?.summary;

  const transactions = useMemo(
    () =>
      sortByDateDesc(
        (data?.contributions ?? []).filter((row) => row.category === "crypto")
      ),
    [data?.contributions]
  );

  const previewTransactions = useMemo(
    () => transactions.slice(0, HISTORY_PREVIEW_LIMIT),
    [transactions]
  );
  const transactionPreviewCount = Math.min(
    transactions.length,
    HISTORY_PREVIEW_LIMIT
  );

  const resetDepositForm = () => {
    setEditingDepositId(null);
    setDepositForm(emptyDepositForm());
  };

  const handleDepositSubmit = () => {
    const amount = parseFloat(depositForm.amountSgd);
    if (!amount) return;

    const entry: ContributionTransaction = {
      id: editingDepositId ?? generateId(),
      date: depositForm.date,
      type: depositForm.type,
      category: "crypto",
      amountSgd: amount,
      notes: depositForm.notes || undefined,
    };

    services.contributions.upsert(entry);
    resetDepositForm();
    refresh();
  };

  const handleEditDeposit = (row: ContributionTransaction) => {
    setShowAllDeposits(false);
    setEditingDepositId(row.id);
    setDepositForm({
      date: row.date,
      type: row.type,
      amountSgd: String(row.amountSgd),
      notes: row.notes ?? "",
    });
  };

  const handleDeleteDeposit = async (id: string) => {
    if (!window.confirm("Delete this deposit/withdrawal?")) return;
    services.contributions.delete(id);
    if (editingDepositId === id) resetDepositForm();
    await getPersistenceManager()?.drainSyncQueue();
    refresh();
  };

  if (!summary) return null;

  return (
    <div className="min-w-0 space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Cash Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            label="Total Crypto Contribution"
            value={formatSgd(summary.cryptoContributionSgd)}
            icon={<Wallet size={18} />}
            subValue="Buy amounts + fees · capital deployed"
          />
          <SummaryCard
            label="Crypto Cash Balance"
            value={formatSgd(summary.totalCryptoCashContributed)}
            icon={<PiggyBank size={18} />}
            subValue="Net deposits − withdrawals"
          />
          <SummaryCard
            label="Total Available Crypto Cash"
            value={formatSgd(summary.availableTradingCashSgd)}
            icon={<PiggyBank size={18} />}
          />
          <SummaryCard
            label="Crypto Holdings Value"
            value={formatSgd(summary.cryptoHoldingsValueSgd)}
            icon={<Coins size={18} />}
            subValue={`${summary.holdingCount} holding${summary.holdingCount === 1 ? "" : "s"}`}
          />
          <SummaryCard
            label="Crypto P/L"
            value={formatSgd(summary.cryptoProfitLossSgd)}
            trend={plTrend(summary.cryptoProfitLossSgd)}
            icon={<TrendingUp size={18} />}
            subValue={formatPercent(summary.cryptoProfitLossPercent)}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-surface-border/80 bg-surface/30 p-5">
        <h3 className="font-medium text-white">
          {editingDepositId ? "Edit Deposit / Withdrawal" : "Deposit / Withdrawal"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Date"
            type="date"
            value={depositForm.date}
            onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })}
          />
          <Select
            label="Type"
            value={depositForm.type}
            onChange={(e) =>
              setDepositForm({
                ...depositForm,
                type: e.target.value as ContributionType,
              })
            }
            options={[
              { value: "deposit", label: "Deposit" },
              { value: "withdrawal", label: "Withdrawal" },
            ]}
          />
          <Input
            label="Amount SGD"
            type="number"
            min="0"
            step="0.01"
            value={depositForm.amountSgd}
            onChange={(e) =>
              setDepositForm({ ...depositForm, amountSgd: e.target.value })
            }
          />
          <Input
            label="Notes"
            value={depositForm.notes}
            onChange={(e) => setDepositForm({ ...depositForm, notes: e.target.value })}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDepositSubmit}>
            {editingDepositId ? "Save Changes" : "Add Transaction"}
          </Button>
          {editingDepositId && (
            <Button variant="secondary" onClick={resetDepositForm}>
              Cancel
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-medium text-white">Deposit / Withdrawal History</h3>
        <DepositHistoryTable
          rows={previewTransactions}
          onEdit={handleEditDeposit}
          onDelete={handleDeleteDeposit}
        />
        <HistoryFooter
          total={transactions.length}
          previewCount={transactionPreviewCount}
          onViewAll={() => setShowAllDeposits(true)}
        />
      </section>

      {showAllDeposits && (
        <Modal
          title="Deposit / Withdrawal History"
          onClose={() => setShowAllDeposits(false)}
          wide
        >
          <DepositHistoryTable
            rows={transactions}
            onEdit={handleEditDeposit}
            onDelete={handleDeleteDeposit}
          />
          <p className="mt-4 text-sm text-slate-500">
            Showing {transactions.length} of {transactions.length} record
            {transactions.length === 1 ? "" : "s"}
          </p>
        </Modal>
      )}
    </div>
  );
}
