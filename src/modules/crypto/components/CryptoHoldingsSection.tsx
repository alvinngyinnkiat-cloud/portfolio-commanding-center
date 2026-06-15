"use client";

import { useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { CryptoHoldingRow, CryptoTradeType } from "@/core/domain/types";
import { validateCryptoHoldingValueDraft, validateCryptoTradeDraft } from "@/core/calculations/crypto";
import { formatPercent, formatSgd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { toLocalDateString } from "@/shared/lib/date";
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

const emptyValueForm = {
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
  const [tradeForm, setTradeForm] = useState(emptyTradeForm);
  const [valueForm, setValueForm] = useState(emptyValueForm);
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);
  const [tradeErrors, setTradeErrors] = useState<Record<string, string>>({});
  const [valueErrors, setValueErrors] = useState<Record<string, string>>({});

  const rows = cryptoData?.rows ?? [];

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

  const handleEditHolding = (row: CryptoHoldingRow) => {
    setEditingHoldingId(row.id);
    setValueForm({
      currentValueSgd: String(row.currentValueSgd),
      notes: row.notes ?? "",
    });
    setValueErrors({});
  };

  const handleValueSubmit = () => {
    if (!editingHoldingId || !services?.cryptoHoldings) return;

    const validation = validateCryptoHoldingValueDraft(valueForm);
    if (!validation.valid) {
      setValueErrors(
        Object.fromEntries(
          Object.entries(validation.errors).map(([key, value]) => [key, value ?? ""])
        )
      );
      return;
    }

    services.cryptoHoldings.updateValuation(editingHoldingId, valueForm);
    setEditingHoldingId(null);
    setValueForm(emptyValueForm);
    setValueErrors({});
    refresh();
  };

  const handleDeleteHolding = (row: CryptoHoldingRow) => {
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
      setValueForm(emptyValueForm);
    }
    refresh();
  };

  const handleCancelEdit = () => {
    setEditingHoldingId(null);
    setValueForm(emptyValueForm);
    setValueErrors({});
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

      {editingHoldingId && (
        <section className="space-y-4 rounded-xl border border-accent/50 bg-accent/5 p-4">
          <h3 className="text-sm font-semibold text-accent">Edit Holding Valuation</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Current Value (SGD)"
              type="number"
              step="0.01"
              min="0"
              value={valueForm.currentValueSgd}
              onChange={(e) =>
                setValueForm({ ...valueForm, currentValueSgd: e.target.value })
              }
              error={valueErrors.currentValueSgd}
            />
            <Input
              label="Notes (optional)"
              value={valueForm.notes}
              onChange={(e) => setValueForm({ ...valueForm, notes: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleValueSubmit}>Update Valuation</Button>
            <Button variant="ghost" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <div className="overflow-x-auto rounded-xl border border-surface-border/60">
        <table className="w-full min-w-[640px] text-sm">
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
                    Record a buy transaction above, then set current value from Edit.
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
                        onClick={() => handleEditHolding(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteHolding(row)}
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
