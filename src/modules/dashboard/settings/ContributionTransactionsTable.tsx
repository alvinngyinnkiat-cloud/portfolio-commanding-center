"use client";

import { useEffect, useMemo, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type {
  ContributionTransaction,
  ContributionType,
  ContributionCategory,
} from "@/core/domain/types";
import {
  calculateStockAllocation,
  getContributionCashDisplay,
} from "@/core/calculations/contribution-cash";
import { isValidFxRate } from "@/core/calculations/fx-validation";
import { generateId } from "@/core/database/local/local-storage";
import { formatSgd, formatUsd, formatDate } from "@/shared/lib/format";
import { toLocalDateString } from "@/shared/lib/date";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
import { FxRateErrorBanner } from "@/shared/components/ui/FxRateErrorBanner";
import { normalizeCashBalances } from "@/core/domain/defaults";

interface ContributionForm {
  date: string;
  type: ContributionType;
  category: ContributionCategory;
  amountSgd: string;
  usdAllocationPercent: string;
  fxRate: string;
  notes: string;
}

function emptyForm(globalFxRate?: number | null): ContributionForm {
  return {
    date: toLocalDateString(),
    type: "deposit",
    category: "stock",
    amountSgd: "",
    usdAllocationPercent: "75",
    fxRate:
      globalFxRate != null && isValidFxRate(globalFxRate)
        ? String(globalFxRate)
        : "",
    notes: "",
  };
}

export function ContributionTransactionsTable() {
  const { data, services, refresh } = usePortfolio();
  const [form, setForm] = useState<ContributionForm>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  const fxRate = data?.settings.usdSgdFxRate;
  const fxRateValid = data?.fxRateValid ?? isValidFxRate(fxRate);
  const contributions = data?.contributions ?? [];
  const cashBalances = normalizeCashBalances(data?.cashBalances);

  useEffect(() => {
    if (editingId != null) return;
    if (fxRate == null || !isValidFxRate(fxRate)) return;
    setForm((current) =>
      current.fxRate ? current : { ...current, fxRate: String(fxRate) }
    );
  }, [fxRate, editingId]);

  const formFxRate = parseFloat(form.fxRate);
  const previewFxValid = isValidFxRate(formFxRate);

  const stockPreview = useMemo(() => {
    if (!previewFxValid) return null;
    const amount = parseFloat(form.amountSgd);
    if (form.category !== "stock" || !amount) return null;
    const usdPct = parseFloat(form.usdAllocationPercent) || 0;
    return calculateStockAllocation(amount, usdPct, formFxRate);
  }, [
    form.category,
    form.amountSgd,
    form.usdAllocationPercent,
    form.fxRate,
    previewFxValid,
  ]);

  const sgdAllocationPercent =
    stockPreview?.sgdAllocationPercent ??
    100 - (parseFloat(form.usdAllocationPercent) || 0);

  const handleSubmit = () => {
    const amount = parseFloat(form.amountSgd);
    if (!form.date || !amount) return;

    const entry: ContributionTransaction = {
      id: editingId ?? generateId(),
      date: form.date,
      type: form.type,
      category: form.category,
      amountSgd: amount,
      notes: form.notes || undefined,
    };

    if (form.category === "stock") {
      entry.usdAllocationPercent = parseFloat(form.usdAllocationPercent) || 0;
      const txFx = parseFloat(form.fxRate);
      if (isValidFxRate(txFx)) {
        entry.fxRate = txFx;
      }
    }

    services.contributions.upsert(entry);
    setEditingId(null);
    setForm(emptyForm(fxRate));
    refresh();
  };

  const handleEdit = (c: ContributionTransaction) => {
    setEditingId(c.id);
    setForm({
      date: c.date,
      type: c.type,
      category: c.category,
      amountSgd: String(c.amountSgd),
      usdAllocationPercent:
        c.category === "stock"
          ? String(c.usdAllocationPercent ?? 100)
          : "75",
      fxRate:
        c.fxRate != null
          ? String(c.fxRate)
          : fxRate != null && isValidFxRate(fxRate)
            ? String(fxRate)
            : "",
      notes: c.notes ?? "",
    });
  };

  const handleDelete = (id: string) => {
    services.contributions.delete(id);
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm(fxRate));
    }
    refresh();
  };

  return (
    <div className="space-y-6">
      {!fxRateValid && <FxRateErrorBanner />}

      <div className="grid gap-3 rounded-xl border border-surface-border/60 bg-surface/40 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-slate-500">USD Trading Cash</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {fxRateValid ? formatUsd(cashBalances.usdTradingCashUsd) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">SGD Trading Cash</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {fxRateValid ? formatSgd(cashBalances.sgdTradingCashSgd) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Crypto Cash</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {fxRateValid ? formatSgd(cashBalances.cryptoCashSgd) : "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-surface-border/60 bg-surface/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <Select
          label="Type"
          value={form.type}
          onChange={(e) =>
            setForm({
              ...form,
              type: e.target.value as ContributionType,
            })
          }
          options={[
            { value: "deposit", label: "Deposit" },
            { value: "withdrawal", label: "Withdrawal" },
          ]}
        />
        <Select
          label="Category"
          value={form.category}
          onChange={(e) =>
            setForm({
              ...form,
              category: e.target.value as ContributionCategory,
            })
          }
          options={[
            { value: "stock", label: "Stock" },
            { value: "crypto", label: "Crypto" },
            { value: "cash", label: "Personal Cash" },
          ]}
        />
        <Input
          label="Amount (SGD)"
          type="number"
          step="0.01"
          value={form.amountSgd}
          onChange={(e) => setForm({ ...form, amountSgd: e.target.value })}
          hint="Total Contribution uses this original SGD amount"
        />
        {form.category === "stock" && (
          <>
            <Input
              label="USD allocation %"
              type="number"
              step="1"
              min="0"
              max="100"
              value={form.usdAllocationPercent}
              onChange={(e) =>
                setForm({ ...form, usdAllocationPercent: e.target.value })
              }
            />
            <Input
              label="SGD allocation %"
              type="number"
              value={String(sgdAllocationPercent)}
              readOnly
              hint="Auto-calculated: 100% − USD %"
            />
            <Input
              label="USD/SGD FX Rate"
              type="number"
              step="0.0001"
              min="0"
              value={form.fxRate}
              onChange={(e) => setForm({ ...form, fxRate: e.target.value })}
              hint="FX rate used for this transaction's USD conversion"
            />
          </>
        )}
        <Input
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      {form.category === "stock" && stockPreview && (
        <div className="grid gap-3 rounded-xl border border-surface-border/60 bg-surface/40 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-slate-500">
              USD Trading Cash preview
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {formatUsd(stockPreview.usdAmountUsd)} USD
            </p>
            <p className="text-xs text-slate-500">
              ({formatSgd(stockPreview.usdAmountSgd)} SGD allocated @ FX{" "}
              {form.fxRate})
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              SGD Trading Cash preview
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {formatSgd(stockPreview.sgdAmountSgd)}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSubmit}>
          {editingId ? "Update Transaction" : "Add Transaction"}
        </Button>
        {editingId && (
          <Button
            variant="ghost"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm(fxRate));
            }}
          >
            Cancel
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-border/60">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-surface/60">
            <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Amount SGD</th>
              <th className="px-4 py-3">USD %</th>
              <th className="px-4 py-3">SGD %</th>
              <th className="px-4 py-3">FX Rate</th>
              <th className="px-4 py-3">USD Cash Added</th>
              <th className="px-4 py-3">SGD Cash Added</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contributions.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No transactions yet.
                </td>
              </tr>
            ) : (
              contributions.map((c) => {
                const display =
                  fxRateValid && fxRate != null
                    ? getContributionCashDisplay(c, fxRate)
                    : null;

                return (
                  <tr
                    key={c.id}
                    className="border-b border-surface-border/40 last:border-0 hover:bg-surface/30"
                  >
                    <td className="px-4 py-3 text-slate-300">
                      {formatDate(c.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          c.type === "deposit"
                            ? "bg-accent-green/15 text-accent-green"
                            : "bg-accent-red/15 text-accent-red"
                        }`}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.category}</td>
                    <td className="px-4 py-3 font-medium text-white">
                      {formatSgd(c.amountSgd)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {display?.usdAllocationPercent != null
                        ? `${display.usdAllocationPercent}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {display?.sgdAllocationPercent != null
                        ? `${display.sgdAllocationPercent}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {display?.fxRate != null ? display.fxRate.toFixed(4) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {display && c.category === "stock"
                        ? formatUsd(display.usdCashAddedUsd)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {display && c.category === "stock"
                        ? formatSgd(display.sgdCashAddedSgd)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {c.notes ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(c)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(c.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
