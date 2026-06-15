"use client";

import { useEffect, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { CryptoHoldingRow, CryptoTradeType } from "@/core/domain/types";
import {
  validateCryptoHoldingValueDraft,
  validateCryptoTradeDraft,
} from "@/core/calculations/crypto";
import { formatPercent, formatSgd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { toLocalDateString } from "@/shared/lib/date";
import { getPersistenceManager } from "@/core/database/supabase";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";

const emptyTradeForm = (): {
  date: string;
  assetName: string;
  type: CryptoTradeType;
  amountSgd: string;
  feesSgd: string;
  notes: string;
} => ({
  date: toLocalDateString(),
  assetName: "",
  type: "buy",
  amountSgd: "",
  feesSgd: "",
  notes: "",
});

function plColorClass(value: number | null | undefined): string {
  const n = coerceNumber(value);
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-accent-red";
  return "text-slate-300";
}

function InlineCurrentValueEditor({
  row,
  onSave,
  disabled,
}: {
  row: CryptoHoldingRow;
  onSave: (id: string, value: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(String(row.currentValueSgd));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(String(row.currentValueSgd));
    setError(null);
  }, [row.id, row.currentValueSgd]);

  const isDirty = draft !== String(row.currentValueSgd);

  const commit = async () => {
    if (!isDirty || saving || disabled) return;

    const validation = validateCryptoHoldingValueDraft({
      currentValueSgd: draft,
      notes: "",
    });
    if (!validation.valid) {
      setError(validation.errors.currentValueSgd ?? "Invalid value");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(row.id, draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-w-[9rem] flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step="0.01"
          min="0"
          value={draft}
          disabled={disabled || saving}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onBlur={() => {
            void commit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === "Escape") {
              setDraft(String(row.currentValueSgd));
              setError(null);
              e.currentTarget.blur();
            }
          }}
          aria-label={`Current value for ${row.assetName}`}
          className="w-full min-w-0 rounded-lg border border-surface-border bg-surface/80 px-2.5 py-1.5 text-sm text-white transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
        />
        {isDirty && (
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0 px-2 py-1 text-xs"
            disabled={saving || disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void commit()}
          >
            {saving ? "…" : "Save"}
          </Button>
        )}
      </div>
      {error && <span className="text-xs text-accent-red">{error}</span>}
    </div>
  );
}

export function CryptoHoldingsSection() {
  const { cryptoData, services, refresh } = usePortfolio();
  const [tradeForm, setTradeForm] = useState(emptyTradeForm);
  const [notesDraft, setNotesDraft] = useState("");
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);
  const [tradeErrors, setTradeErrors] = useState<Record<string, string>>({});

  const rows = cryptoData?.rows ?? [];
  const editingRow = rows.find((row) => row.id === editingHoldingId) ?? null;

  const handleTradeSubmit = () => {
    if (!services?.cryptoTrades) return;

    const result = validateCryptoTradeDraft(
      tradeForm,
      rows.map((row) => ({
        id: row.id,
        assetName: row.assetName,
        investedSgd: row.investedSgd,
        feesSgd: row.feesSgd,
        currentValueSgd: row.currentValueSgd,
        notes: row.notes,
      }))
    );

    if (!result.valid) {
      setTradeErrors(
        Object.fromEntries(
          Object.entries(result.errors).map(([key, value]) => [key, value ?? ""])
        )
      );
      return;
    }

    services.cryptoTrades.upsertFromDraft(tradeForm);
    setTradeErrors({});
    setTradeForm(emptyTradeForm());
    refresh();
  };

  const saveCurrentValue = async (id: string, currentValueSgd: string) => {
    if (!services?.cryptoHoldings) return;

    const row = rows.find((item) => item.id === id);
    services.cryptoHoldings.updateValuation(id, {
      currentValueSgd,
      notes: row?.notes ?? "",
    });
    await getPersistenceManager()?.drainSyncQueue();
    refresh();
  };

  const handleEditHolding = (row: CryptoHoldingRow) => {
    setEditingHoldingId(row.id);
    setNotesDraft(row.notes ?? "");
  };

  const handleNotesSubmit = async () => {
    if (!editingHoldingId || !services?.cryptoHoldings || !editingRow) return;

    services.cryptoHoldings.updateValuation(editingHoldingId, {
      currentValueSgd: String(editingRow.currentValueSgd),
      notes: notesDraft,
    });
    await getPersistenceManager()?.drainSyncQueue();
    setEditingHoldingId(null);
    setNotesDraft("");
    refresh();
  };

  const handleDeleteHolding = async (row: CryptoHoldingRow) => {
    if (!services?.cryptoTrades || !services?.cryptoHoldings) return;
    if (!window.confirm(`Delete ${row.assetName} and all related buy/sell records?`)) {
      return;
    }

    const trades = services.cryptoTrades.list();
    const assetKey = row.assetName.trim().toUpperCase();
    const remaining = trades.filter(
      (trade) => trade.assetName.trim().toUpperCase() !== assetKey
    );
    services.cryptoTrades.replaceAll(remaining);
    services.cryptoHoldings.delete(row.id);
    if (editingHoldingId === row.id) {
      setEditingHoldingId(null);
      setNotesDraft("");
    }
    await getPersistenceManager()?.drainSyncQueue();
    refresh();
  };

  const handleCancelEdit = () => {
    setEditingHoldingId(null);
    setNotesDraft("");
  };

  return (
    <div className="min-w-0 space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Add Buy / Sell Transaction</h3>
        <div className="grid gap-4 rounded-xl border border-surface-border/60 bg-surface/40 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Date"
            type="date"
            value={tradeForm.date}
            onChange={(e) => setTradeForm({ ...tradeForm, date: e.target.value })}
            error={tradeErrors.date}
          />
          <Input
            label="Asset Name"
            value={tradeForm.assetName}
            onChange={(e) => setTradeForm({ ...tradeForm, assetName: e.target.value })}
            error={tradeErrors.assetName}
          />
          <Select
            label="Transaction Type"
            value={tradeForm.type}
            onChange={(e) =>
              setTradeForm({
                ...tradeForm,
                type: e.target.value as "buy" | "sell",
              })
            }
            options={[
              { value: "buy", label: "Buy" },
              { value: "sell", label: "Sell" },
            ]}
          />
          <Input
            label="Buy/Sell Amount (SGD)"
            type="number"
            step="0.01"
            min="0"
            value={tradeForm.amountSgd}
            onChange={(e) => setTradeForm({ ...tradeForm, amountSgd: e.target.value })}
            error={tradeErrors.amountSgd}
          />
          <Input
            label="Fees (SGD)"
            type="number"
            step="0.01"
            min="0"
            value={tradeForm.feesSgd}
            onChange={(e) => setTradeForm({ ...tradeForm, feesSgd: e.target.value })}
            error={tradeErrors.feesSgd}
          />
          <Input
            label="Notes (optional)"
            value={tradeForm.notes}
            onChange={(e) => setTradeForm({ ...tradeForm, notes: e.target.value })}
          />
        </div>
        <Button onClick={handleTradeSubmit}>Add Transaction</Button>
      </section>

      {editingRow && (
        <section className="space-y-4 rounded-xl border border-accent/50 bg-accent/5 p-4">
          <h3 className="text-sm font-semibold text-accent">
            Edit Holding — {editingRow.assetName}
          </h3>
          <p className="text-xs text-slate-500">
            Update notes here. Change cost basis via buy/sell transactions; update
            current value inline in the table.
          </p>
          <Input
            label="Notes (optional)"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleNotesSubmit()}>Save Notes</Button>
            <Button variant="ghost" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <div className="overflow-x-auto rounded-xl border border-surface-border/60">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface/60">
            <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Asset</th>
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
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  <p>No crypto holdings yet.</p>
                  <p className="mt-2 text-xs text-slate-600">
                    Record a buy transaction above, then type current value directly in
                    the table.
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-surface-border/40 last:border-0 hover:bg-surface/30"
                >
                  <td className="px-4 py-3 font-medium text-white">{row.assetName}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatSgd(row.contributionSgd)}
                  </td>
                  <td className="px-4 py-3">
                    <InlineCurrentValueEditor
                      row={row}
                      onSave={saveCurrentValue}
                    />
                  </td>
                  <td className={`px-4 py-3 ${plColorClass(row.profitLossSgd)}`}>
                    {formatSgd(row.profitLossSgd)}
                  </td>
                  <td className={`px-4 py-3 ${plColorClass(row.profitLossPercent)}`}>
                    {formatPercent(row.profitLossPercent)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditHolding(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => void handleDeleteHolding(row)}
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
