"use client";

import { useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type {
  ContributionTransaction,
  ContributionType,
  ContributionCategory,
} from "@/core/domain/types";
import { generateId } from "@/core/database/local/local-storage";
import { formatSgd, formatDate } from "@/shared/lib/format";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";

interface ContributionForm {
  date: string;
  type: ContributionType;
  category: ContributionCategory;
  amountSgd: string;
  notes: string;
}

const emptyForm: ContributionForm = {
  date: new Date().toISOString().split("T")[0],
  type: "deposit",
  category: "stock",
  amountSgd: "",
  notes: "",
};

export function ContributionTransactionsTable() {
  const { services, refresh } = usePortfolio();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const contributions = services.contributions.list();

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
    setForm(emptyForm);
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
      setForm(emptyForm);
    }
    refresh();
  };

  return (
    <Card title="Contribution Transactions" subtitle="All amounts in SGD">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          ]}
        />
        <Input
          label="Amount (SGD)"
          type="number"
          step="0.01"
          value={form.amountSgd}
          onChange={(e) => setForm({ ...form, amountSgd: e.target.value })}
        />
        <Input
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
      <div className="mb-4 flex gap-2">
        <Button onClick={handleSubmit}>
          {editingId ? "Update Transaction" : "Add Transaction"}
        </Button>
        {editingId && (
          <Button
            variant="ghost"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
            }}
          >
            Cancel
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs text-slate-500">
              <th className="pb-2 pr-4">Date</th>
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2 pr-4">Category</th>
              <th className="pb-2 pr-4">Amount</th>
              <th className="pb-2 pr-4">Notes</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contributions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-slate-500">
                  No transactions yet.
                </td>
              </tr>
            ) : (
              contributions.map((c) => (
                <tr key={c.id} className="border-b border-surface-border/50">
                  <td className="py-2 pr-4 text-slate-300">
                    {formatDate(c.date)}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        c.type === "deposit"
                          ? "text-accent-green"
                          : "text-accent-red"
                      }
                    >
                      {c.type}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-slate-300">{c.category}</td>
                  <td className="py-2 pr-4 font-medium text-white">
                    {formatSgd(c.amountSgd)}
                  </td>
                  <td className="py-2 pr-4 text-slate-400">{c.notes ?? "—"}</td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(c)}>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
