"use client";

import { useMemo, useRef, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { CryptoTrade, CryptoTradeType } from "@/core/domain/types";
import {
  rebuildHoldingsFromTrades,
  validateCryptoTradeDraft,
  type CryptoTradeDraft,
} from "@/core/calculations/crypto";
import { formatCryptoTradeDate, formatSgd } from "@/shared/lib/format";
import { parseIsoDateString } from "@/shared/lib/date";
import { compareDateDescWithCreatedAt } from "@/shared/lib/sort";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
import { persistCryptoTradeChanges } from "@/modules/crypto/lib/persist-crypto-changes";

function toCryptoTradeDraft(trade: CryptoTrade): CryptoTradeDraft {
  return {
    date: trade.date,
    assetName: trade.assetName,
    type: trade.type,
    amountSgd: String(trade.amountSgd),
    feesSgd: trade.feesSgd != null ? String(trade.feesSgd) : "",
    notes: trade.notes ?? "",
  };
}

export function CryptoTransactionsSection() {
  const { cryptoData, services, refresh } = usePortfolio();
  const formRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CryptoTradeDraft | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const holdingsForValidation = useMemo(() => {
    const holdings = (cryptoData?.rows ?? []).map((row) => ({
      id: row.id,
      assetName: row.assetName,
      investedSgd: row.investedSgd,
      feesSgd: row.feesSgd,
      currentValueSgd: row.currentValueSgd,
      notes: row.notes,
    }));
    const trades = cryptoData?.trades ?? [];
    const tradesExcludingEdit =
      editingId != null ? trades.filter((row) => row.id !== editingId) : trades;
    return rebuildHoldingsFromTrades(tradesExcludingEdit, holdings);
  }, [cryptoData?.rows, cryptoData?.trades, editingId]);

  const isEditing = editingId != null && form != null;

  const resetForm = () => {
    setEditingId(null);
    setForm(null);
    setFormErrors({});
    setSaveError(null);
  };

  const handleEdit = (trade: CryptoTrade) => {
    setEditingId(trade.id);
    setForm(toCryptoTradeDraft(trade));
    setFormErrors({});
    setSaveError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSave = async () => {
    if (!services?.cryptoTrades || !form || !editingId || saving) return;

    const result = validateCryptoTradeDraft(form, holdingsForValidation);
    if (!result.valid) {
      setSaveError(null);
      setFormErrors(
        Object.fromEntries(
          Object.entries(result.errors).map(([key, value]) => [key, value ?? ""])
        )
      );
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const saved = services.cryptoTrades.upsertFromDraft(form, editingId);
      if (!saved) {
        setSaveError(
          "Could not save the transaction. Check all fields and try again."
        );
        return;
      }

      await persistCryptoTradeChanges();
      resetForm();
      refresh();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to save transaction to Supabase."
      );
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (trade: CryptoTrade) => {
    if (!services?.cryptoTrades || saving) return;

    const label = `${trade.type} ${trade.assetName} (${formatCryptoTradeDate(trade.date)})`;
    if (!window.confirm(`Delete transaction: ${label}?`)) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const deleted = services.cryptoTrades.delete(trade.id);
      if (!deleted) {
        setSaveError("Could not delete the transaction.");
        return;
      }

      if (editingId === trade.id) {
        resetForm();
      }

      await persistCryptoTradeChanges();
      refresh();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to delete transaction from Supabase."
      );
      refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      {isEditing && form && (
        <div
          ref={formRef}
          className="space-y-4 rounded-xl border border-accent/50 bg-accent/5 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Editing Transaction
          </p>
          <h3 className="text-sm font-semibold text-white">Update Transaction</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Date"
              type="date"
              value={parseIsoDateString(form.date) ?? ""}
              onChange={(e) => {
                setForm({ ...form, date: e.target.value });
                if (formErrors.date) {
                  setFormErrors((prev) => ({ ...prev, date: "" }));
                }
              }}
              error={formErrors.date}
            />
            <Input
              label="Asset Name"
              value={form.assetName}
              onChange={(e) =>
                setForm({ ...form, assetName: e.target.value })
              }
              error={formErrors.assetName}
            />
            <Select
              label="Transaction Type"
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as CryptoTradeType,
                })
              }
              options={[
                { value: "buy", label: "Buy" },
                { value: "sell", label: "Sell" },
              ]}
            />
            <Input
              label="Amount SGD"
              type="number"
              step="0.01"
              min="0"
              value={form.amountSgd}
              onChange={(e) =>
                setForm({ ...form, amountSgd: e.target.value })
              }
              error={formErrors.amountSgd}
            />
            <Input
              label="Fees SGD"
              type="number"
              step="0.01"
              min="0"
              value={form.feesSgd}
              onChange={(e) => setForm({ ...form, feesSgd: e.target.value })}
              error={formErrors.feesSgd}
            />
            <Input
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
            <Button
              variant="secondary"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
          {saveError && <p className="text-sm text-accent-red">{saveError}</p>}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Buy and sell records with date, amount, and fees — newest first. Edit or
        delete any row; holdings and dashboard totals rebuild from all transactions.
      </p>

      <div className="overflow-x-auto rounded-xl border border-surface-border/60">
        <table className="w-full min-w-[840px] text-sm">
          <thead className="bg-surface/60 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Asset</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Amount SGD</th>
              <th className="px-4 py-3 text-left">Fees</th>
              <th className="px-4 py-3 text-left">Notes</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No buy or sell transactions yet.
                </td>
              </tr>
            ) : (
              transactions.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-surface-border/40 text-slate-300 last:border-0"
                >
                  <td className="px-4 py-3">{formatCryptoTradeDate(row.date)}</td>
                  <td className="px-4 py-3 font-medium text-white">
                    {row.assetName}
                  </td>
                  <td className="px-4 py-3 capitalize text-white">{row.type}</td>
                  <td className="px-4 py-3">{formatSgd(row.amountSgd)}</td>
                  <td className="px-4 py-3">{formatSgd(row.feesSgd ?? 0)}</td>
                  <td className="px-4 py-3">{row.notes ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={editingId === row.id ? "primary" : "secondary"}
                        onClick={() => handleEdit(row)}
                        disabled={saving}
                        aria-pressed={editingId === row.id}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => void handleDelete(row)}
                        disabled={saving}
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
