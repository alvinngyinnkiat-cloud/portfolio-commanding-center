"use client";

import { useMemo, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type {
  ContributionTransaction,
  ContributionType,
  StockFxConversion,
  StockFxDirection,
} from "@/core/domain/types";
import {
  calculateStockFxRate,
} from "@/core/calculations/stocks/cash-flow";
import { createStockFxConversionId } from "@/core/calculations/stocks/migrate-stock-cash-flow";
import { generateId } from "@/core/database/local/local-storage";
import { formatDate, formatSgd, formatUsd } from "@/shared/lib/format";
import { toLocalDateString } from "@/shared/lib/date";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { FxRateErrorBanner } from "@/shared/components/ui/FxRateErrorBanner";
import { Wallet, ArrowLeftRight } from "lucide-react";

interface DepositForm {
  date: string;
  type: ContributionType;
  amountSgd: string;
  notes: string;
}

interface FxForm {
  date: string;
  direction: StockFxDirection;
  sgdAmount: string;
  usdAmount: string;
  notes: string;
}

const emptyDepositForm = (): DepositForm => ({
  date: toLocalDateString(),
  type: "deposit",
  amountSgd: "",
  notes: "",
});

const emptyFxForm = (): FxForm => ({
  date: toLocalDateString(),
  direction: "sgd_to_usd",
  sgdAmount: "",
  usdAmount: "",
  notes: "",
});

export function StockCashFlowSection() {
  const { stockData, services, refresh } = usePortfolio();
  const [depositForm, setDepositForm] = useState<DepositForm>(emptyDepositForm);
  const [fxForm, setFxForm] = useState<FxForm>(emptyFxForm);
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);
  const [editingFxId, setEditingFxId] = useState<string | null>(null);

  const cashFlow = stockData?.cashFlow;
  const summary = cashFlow?.summary;
  const deposits = cashFlow?.deposits ?? [];
  const fxConversions = cashFlow?.fxConversions ?? [];
  const fxRateValid = summary?.fxRateValid ?? false;

  const fxPreviewRate = useMemo(() => {
    const sgd = parseFloat(fxForm.sgdAmount);
    const usd = parseFloat(fxForm.usdAmount);
    if (!sgd || !usd) return null;
    return calculateStockFxRate(sgd, usd);
  }, [fxForm.sgdAmount, fxForm.usdAmount]);

  const resetDepositForm = () => {
    setEditingDepositId(null);
    setDepositForm(emptyDepositForm());
  };

  const resetFxForm = () => {
    setEditingFxId(null);
    setFxForm(emptyFxForm());
  };

  const handleDepositSubmit = () => {
    if (!services) return;
    const amount = parseFloat(depositForm.amountSgd);
    if (!amount) return;

    const entry: ContributionTransaction = {
      id: editingDepositId ?? generateId(),
      date: depositForm.date,
      type: depositForm.type,
      category: "stock",
      amountSgd: amount,
      notes: depositForm.notes || undefined,
    };

    services.contributions.upsert(entry);
    resetDepositForm();
    refresh();
  };

  const handleFxSubmit = () => {
    if (!services) return;
    const sgdAmount = parseFloat(fxForm.sgdAmount);
    const usdAmount = parseFloat(fxForm.usdAmount);
    if (!sgdAmount || !usdAmount) return;

    const entry: StockFxConversion = {
      id: editingFxId ?? createStockFxConversionId(),
      date: fxForm.date,
      direction: fxForm.direction,
      sgdAmount,
      usdAmount,
      notes: fxForm.notes || undefined,
      createdAt: new Date().toISOString(),
    };

    services.stockFxConversions.upsert(entry);
    resetFxForm();
    refresh();
  };

  const handleEditDeposit = (row: ContributionTransaction) => {
    setEditingDepositId(row.id);
    setDepositForm({
      date: row.date,
      type: row.type,
      amountSgd: String(row.amountSgd),
      notes: row.notes ?? "",
    });
  };

  const handleEditFx = (row: StockFxConversion) => {
    setEditingFxId(row.id);
    setFxForm({
      date: row.date,
      direction: row.direction,
      sgdAmount: String(row.sgdAmount),
      usdAmount: String(row.usdAmount),
      notes: row.notes ?? "",
    });
  };

  const handleDeleteDeposit = (id: string) => {
    if (!services || !window.confirm("Delete this deposit/withdrawal?")) return;
    services.contributions.delete(id);
    if (editingDepositId === id) resetDepositForm();
    refresh();
  };

  const handleDeleteFx = (id: string) => {
    if (!services || !window.confirm("Delete this FX conversion?")) return;
    services.stockFxConversions.delete(id);
    if (editingFxId === id) resetFxForm();
    refresh();
  };

  return (
    <div className="space-y-8">
      {!fxRateValid && <FxRateErrorBanner />}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Cash Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            label="Total Stock Contribution"
            value={formatSgd(summary?.totalStockContributionSgd ?? 0)}
            icon={<Wallet size={18} />}
          />
          <SummaryCard
            label="SGD Cash Balance"
            value={formatSgd(summary?.sgdCashBalanceSgd ?? 0)}
            icon={<Wallet size={18} />}
          />
          <SummaryCard
            label="USD Cash Balance"
            value={formatUsd(summary?.usdCashBalanceUsd ?? 0)}
            icon={<Wallet size={18} />}
          />
          <SummaryCard
            label="USD Cash Value (SGD)"
            value={
              fxRateValid
                ? formatSgd(summary?.usdCashValueSgd ?? 0)
                : "FX required"
            }
            icon={<ArrowLeftRight size={18} />}
          />
          <SummaryCard
            label="Total Available Stock Cash"
            value={
              fxRateValid
                ? formatSgd(summary?.totalAvailableStockCashSgd ?? 0)
                : formatSgd(summary?.sgdCashBalanceSgd ?? 0)
            }
            icon={<Wallet size={18} />}
          />
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-surface-border/80 bg-surface/30 p-5">
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
        </div>

        <div className="space-y-4 rounded-2xl border border-surface-border/80 bg-surface/30 p-5">
          <h3 className="font-medium text-white">
            {editingFxId ? "Edit FX Conversion" : "FX Conversion"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              value={fxForm.date}
              onChange={(e) => setFxForm({ ...fxForm, date: e.target.value })}
            />
            <Select
              label="Direction"
              value={fxForm.direction}
              onChange={(e) =>
                setFxForm({
                  ...fxForm,
                  direction: e.target.value as StockFxDirection,
                })
              }
              options={[
                { value: "sgd_to_usd", label: "SGD → USD" },
                { value: "usd_to_sgd", label: "USD → SGD" },
              ]}
            />
            <Input
              label="SGD Amount"
              type="number"
              min="0"
              step="0.01"
              value={fxForm.sgdAmount}
              onChange={(e) => setFxForm({ ...fxForm, sgdAmount: e.target.value })}
            />
            <Input
              label="USD Amount"
              type="number"
              min="0"
              step="0.01"
              value={fxForm.usdAmount}
              onChange={(e) => setFxForm({ ...fxForm, usdAmount: e.target.value })}
            />
            <Input
              label="FX Rate (auto)"
              value={fxPreviewRate != null ? fxPreviewRate.toFixed(4) : "—"}
              readOnly
              disabled
            />
            <Input
              label="Notes"
              value={fxForm.notes}
              onChange={(e) => setFxForm({ ...fxForm, notes: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleFxSubmit}>
              {editingFxId ? "Save Changes" : "Add Conversion"}
            </Button>
            {editingFxId && (
              <Button variant="secondary" onClick={resetFxForm}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-medium text-white">Deposit / Withdrawal History</h3>
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
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No deposit or withdrawal records yet.
                  </td>
                </tr>
              ) : (
                deposits.map((row) => (
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
                          onClick={() => handleEditDeposit(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          className="px-2 py-1 text-xs text-accent-red"
                          onClick={() => handleDeleteDeposit(row.id)}
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
      </section>

      <section className="space-y-4">
        <h3 className="font-medium text-white">FX Conversion History</h3>
        <div className="overflow-x-auto rounded-xl border border-surface-border/60">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface/60 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Direction</th>
                <th className="px-4 py-3 text-left">SGD Amount</th>
                <th className="px-4 py-3 text-left">USD Amount</th>
                <th className="px-4 py-3 text-left">FX Rate</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fxConversions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No FX conversions yet.
                  </td>
                </tr>
              ) : (
                fxConversions.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-surface-border/40 text-slate-300 last:border-0"
                  >
                    <td className="px-4 py-3">{formatDate(row.date)}</td>
                    <td className="px-4 py-3">
                      {row.direction === "sgd_to_usd" ? "SGD → USD" : "USD → SGD"}
                    </td>
                    <td className="px-4 py-3">{formatSgd(row.sgdAmount)}</td>
                    <td className="px-4 py-3">{formatUsd(row.usdAmount)}</td>
                    <td className="px-4 py-3">
                      {calculateStockFxRate(row.sgdAmount, row.usdAmount).toFixed(4)}
                    </td>
                    <td className="px-4 py-3">{row.notes ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          className="px-2 py-1 text-xs"
                          onClick={() => handleEditFx(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          className="px-2 py-1 text-xs text-accent-red"
                          onClick={() => handleDeleteFx(row.id)}
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
      </section>
    </div>
  );
}
