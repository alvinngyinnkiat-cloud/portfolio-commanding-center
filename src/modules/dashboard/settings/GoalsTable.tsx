"use client";

import { useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { Goal } from "@/core/domain/types";
import { generateId } from "@/core/database/local/local-storage";
import { formatSgd, formatDate } from "@/shared/lib/format";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";

const emptyForm = {
  name: "",
  targetAmountSgd: "",
  targetDate: "",
  active: "true",
};

export function GoalsTable() {
  const { services, refresh } = usePortfolio();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const goals = services.goals.list();

  const handleSubmit = () => {
    const amount = parseFloat(form.targetAmountSgd);
    if (!form.name || !amount) return;

    const entry: Goal = {
      id: editingId ?? generateId(),
      name: form.name,
      targetAmountSgd: amount,
      targetDate: form.targetDate || undefined,
      active: form.active === "true",
    };

    services.goals.upsert(entry);
    setEditingId(null);
    setForm(emptyForm);
    refresh();
  };

  const handleEdit = (g: Goal) => {
    setEditingId(g.id);
    setForm({
      name: g.name,
      targetAmountSgd: String(g.targetAmountSgd),
      targetDate: g.targetDate ?? "",
      active: g.active ? "true" : "false",
    });
  };

  const handleDelete = (id: string) => {
    services.goals.delete(id);
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
    }
    refresh();
  };

  return (
    <Card title="Goals">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Goal Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="Target Amount (SGD)"
          type="number"
          step="0.01"
          value={form.targetAmountSgd}
          onChange={(e) => setForm({ ...form, targetAmountSgd: e.target.value })}
        />
        <Input
          label="Target Date (optional)"
          type="date"
          value={form.targetDate}
          onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
        />
        <Select
          label="Status"
          value={form.active}
          onChange={(e) => setForm({ ...form, active: e.target.value })}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />
      </div>
      <div className="mb-4 flex gap-2">
        <Button onClick={handleSubmit}>
          {editingId ? "Update Goal" : "Add Goal"}
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
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Target</th>
              <th className="pb-2 pr-4">Target Date</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {goals.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-slate-500">
                  No goals yet.
                </td>
              </tr>
            ) : (
              goals.map((g) => (
                <tr key={g.id} className="border-b border-surface-border/50">
                  <td className="py-2 pr-4 font-medium text-white">{g.name}</td>
                  <td className="py-2 pr-4 text-slate-300">
                    {formatSgd(g.targetAmountSgd)}
                  </td>
                  <td className="py-2 pr-4 text-slate-400">
                    {g.targetDate ? formatDate(g.targetDate) : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        g.active ? "text-accent-green" : "text-slate-500"
                      }
                    >
                      {g.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(g)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(g.id)}
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
