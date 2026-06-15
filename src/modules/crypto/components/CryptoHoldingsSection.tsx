"use client";

import { useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { CryptoHoldingRow } from "@/core/domain/types";
import { validateCryptoHoldingDraft } from "@/core/calculations/crypto";
import { formatPercent, formatSgd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";

const emptyForm = {
  assetName: "",
  investedSgd: "",
  feesSgd: "",
  currentValueSgd: "",
  notes: "",
};

function plColorClass(value: number | null | undefined): string {
  const n = coerceNumber(value);
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-accent-red";
  return "text-slate-300";
}

function HoldingCells({ row }: { row: CryptoHoldingRow }) {
  return (
    <>
      <td className="px-4 py-3 font-medium text-white">{row.assetName}</td>
      <td className="px-4 py-3 text-slate-300">{formatSgd(row.investedSgd)}</td>
      <td className="px-4 py-3 text-slate-300">
        {formatSgd(row.contributionSgd)}
      </td>
      <td className="px-4 py-3 text-slate-300">
        {formatSgd(row.currentValueSgd)}
      </td>
      <td className={`px-4 py-3 ${plColorClass(row.profitLossSgd)}`}>
        {formatSgd(row.profitLossSgd)}
      </td>
      <td className={`px-4 py-3 ${plColorClass(row.profitLossPercent)}`}>
        {formatPercent(row.profitLossPercent)}
      </td>
    </>
  );
}

export function CryptoHoldingsSection() {
  const { cryptoData, services, refresh } = usePortfolio();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const rows = cryptoData?.rows ?? [];

  const handleSubmit = () => {
    const validation = validateCryptoHoldingDraft(form);
    if (!validation.valid) {
      setFormErrors(
        Object.fromEntries(
          Object.entries(validation.errors).map(([k, v]) => [k, v ?? ""])
        )
      );
      return;
    }

    services.cryptoHoldings.upsertFromDraft(form, editingId ?? undefined);
    setFormErrors({});
    setEditingId(null);
    setForm(emptyForm);
    refresh();
  };

  const handleEdit = (row: CryptoHoldingRow) => {
    setEditingId(row.id);
    setForm({
      assetName: row.assetName,
      investedSgd: String(row.investedSgd),
      feesSgd: String(row.feesSgd ?? 0),
      currentValueSgd: String(row.currentValueSgd),
      notes: row.notes ?? "",
    });
    setFormErrors({});
  };

  const handleDelete = (id: string) => {
    services.cryptoHoldings.delete(id);
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
      setFormErrors({});
    }
    refresh();
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  return (
    <div className="min-w-0 space-y-6">
      <div
        className={`grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3 ${
          editingId
            ? "border-accent/50 bg-accent/5"
            : "border-surface-border/60 bg-surface/40"
        }`}
      >
        {editingId && (
          <p className="text-xs font-semibold uppercase tracking-wide text-accent sm:col-span-2 lg:col-span-3">
            Editing Holding
          </p>
        )}
        <Input
          label="Asset Name"
          value={form.assetName}
          onChange={(e) => setForm({ ...form, assetName: e.target.value })}
          error={formErrors.assetName}
        />
        <Input
          label="Buy Amount (SGD)"
          type="number"
          step="0.01"
          min="0"
          value={form.investedSgd}
          onChange={(e) => setForm({ ...form, investedSgd: e.target.value })}
          error={formErrors.investedSgd}
        />
        <Input
          label="Fees (SGD)"
          type="number"
          step="0.01"
          min="0"
          value={form.feesSgd}
          onChange={(e) => setForm({ ...form, feesSgd: e.target.value })}
          error={formErrors.feesSgd}
        />
        <Input
          label="Current Value (SGD)"
          type="number"
          step="0.01"
          min="0"
          value={form.currentValueSgd}
          onChange={(e) => setForm({ ...form, currentValueSgd: e.target.value })}
          error={formErrors.currentValueSgd}
        />
        <Input
          label="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSubmit}>
          {editingId ? "Update Holding" : "Add Holding"}
        </Button>
        {editingId && (
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-border/60">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface/60">
            <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Buy SGD</th>
              <th className="px-4 py-3">Cost Basis</th>
              <th className="px-4 py-3">Current Value</th>
              <th className="px-4 py-3">P/L SGD</th>
              <th className="px-4 py-3">P/L %</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  <p>No crypto holdings yet.</p>
                  <p className="mt-2 text-xs text-slate-600">
                    Add your first holding above.
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-surface-border/40 last:border-0 hover:bg-surface/30"
                >
                  <HoldingCells row={row} />
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(row.id)}
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
    </div>
  );
}
