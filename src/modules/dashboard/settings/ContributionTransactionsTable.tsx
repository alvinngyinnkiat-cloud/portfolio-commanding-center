"use client";

import { useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type {
  ContributionTransaction,
  ContributionType,
  ContributionCategory,
} from "@/core/domain/types";
import { getContributionCashDisplay } from "@/core/calculations/contribution-cash";
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
  notes: string;
}

function emptyForm(): ContributionForm {
  return {
    date: toLocalDateString(),
    type: "deposit",
    category: "crypto",
    amountSgd: "",
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
  const settingsContributions = contributions.filter((c) => c.category !== "stock");

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

    services.contributions.upsert(entry);
    setEditingId(null);
    setForm(emptyForm());
    refresh();
  };

  const handleEdit = (c: ContributionTransaction) => {
    setEditingId(c.id);
    setForm({
      date: c.date,
      type: c.type,
      category: c.category,
      amountSgd: String(c.amountSgd),
      notes: c.notes ?? "",
    });
  };

  const handleDelete = (id: string) => {
    services.contributions.delete(id);
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm());
    }
    refresh();
  };

  return (
    <div className="space-y-6">
      {!fxRateValid && <FxRateErrorBanner />}

      <div className="grid gap-3 rounded-xl border border-surface-border/60 bg-surface/40 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-slate-500">US Available Cash</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {fxRateValid ? formatUsd(cashBalances.usdTradingCashUsd) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">SG Available Cash</p>
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
          hint="Stock deposits are managed in Stock Tracker → Cash Flow"
        />
        <Input
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSubmit}>
          {editingId ? "Update Transaction" : "Add Transaction"}
        </Button>
        {editingId && (
          <Button
            variant="ghost"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm());
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
              <th className="px-4 py-3">Cash Impact</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {settingsContributions.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No crypto or personal cash transactions yet.
                </td>
              </tr>
            ) : (
              settingsContributions.map((c) => {
                const display =
                  fxRateValid && fxRate != null
                    ? getContributionCashDisplay(c, fxRate)
                    : null;
                const cashImpact =
                  c.category === "crypto"
                    ? formatSgd(display?.cryptoCashAddedSgd ?? 0)
                    : "—";

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
                    <td className="px-4 py-3 text-slate-300">{cashImpact}</td>
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
