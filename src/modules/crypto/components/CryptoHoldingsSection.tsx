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
import { parseIsoDateString, toLocalDateString } from "@/shared/lib/date";
import { getPersistenceManager } from "@/core/database/supabase";
import { persistCryptoTradeChanges } from "@/modules/crypto/lib/persist-crypto-changes";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { StackedValue } from "@/shared/components/ui/StackedValue";
import {
  dataTableClass,
  dataTableHeadClass,
  dataTableRowClass,
  dataTableTdLeftClass,
  dataTableTdRightClass,
  dataTableThLeftClass,
  dataTableThRightClass,
  dataTableWrapperClass,
} from "@/shared/components/ui/data-table";

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

function CryptoHoldingEditModal({
  row,
  onClose,
  onSave,
}: {
  row: CryptoHoldingRow;
  onClose: () => void;
  onSave: (currentValueSgd: string, notes: string) => Promise<void>;
}) {
  const [currentValue, setCurrentValue] = useState(String(row.currentValueSgd));
  const [notes, setNotes] = useState(row.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrentValue(String(row.currentValueSgd));
    setNotes(row.notes ?? "");
    setError(null);
  }, [row.id, row.currentValueSgd, row.notes]);

  const handleSave = async () => {
    const validation = validateCryptoHoldingValueDraft({
      currentValueSgd: currentValue,
      notes,
    });
    if (!validation.valid) {
      setError(validation.errors.currentValueSgd ?? "Invalid value");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(currentValue, notes);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Edit Holding — ${row.assetName}`} onClose={onClose}>
      <div className="space-y-4">
        <Input
          label="Current Value (SGD)"
          type="number"
          step="0.01"
          min="0"
          value={currentValue}
          onChange={(e) => {
            setCurrentValue(e.target.value);
            setError(null);
          }}
          error={error ?? undefined}
        />
        <Input
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <p className="text-xs text-slate-500">
          Cost basis is updated via buy/sell transactions.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function CryptoHoldingsSection() {
  const { cryptoData, services, refresh } = usePortfolio();
  const [tradeForm, setTradeForm] = useState(emptyTradeForm);
  const [editingRow, setEditingRow] = useState<CryptoHoldingRow | null>(null);
  const [tradeErrors, setTradeErrors] = useState<Record<string, string>>({});
  const [tradeSaveError, setTradeSaveError] = useState<string | null>(null);
  const [tradeSaving, setTradeSaving] = useState(false);

  const rows = cryptoData?.rows ?? [];

  const handleTradeSubmit = async () => {
    if (!services?.cryptoTrades || tradeSaving) return;

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
      setTradeSaveError(null);
      setTradeErrors(
        Object.fromEntries(
          Object.entries(result.errors).map(([key, value]) => [key, value ?? ""])
        )
      );
      return;
    }

    setTradeSaving(true);
    setTradeSaveError(null);

    try {
      const trade = services.cryptoTrades.upsertFromDraft(tradeForm);
      if (!trade) {
        setTradeSaveError(
          "Could not save the transaction record. Check all fields and try again."
        );
        return;
      }

      await persistCryptoTradeChanges();

      setTradeErrors({});
      setTradeForm(emptyTradeForm());
      refresh();
    } catch (error) {
      setTradeSaveError(
        error instanceof Error
          ? error.message
          : "Failed to save transaction to Supabase."
      );
      refresh();
    } finally {
      setTradeSaving(false);
    }
  };

  const saveHoldingEdit = async (currentValueSgd: string, notes: string) => {
    if (!services?.cryptoHoldings || !editingRow) return;

    services.cryptoHoldings.updateValuation(editingRow.id, {
      currentValueSgd,
      notes,
    });
    await getPersistenceManager()?.drainSyncQueue();
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
    if (editingRow?.id === row.id) {
      setEditingRow(null);
    }
    await persistCryptoTradeChanges();
    refresh();
  };

  return (
    <div className="min-w-0 space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Add Buy / Sell Transaction</h3>
        <div className="grid gap-4 rounded-xl border border-surface-border/60 bg-surface/40 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Date"
            type="date"
            value={parseIsoDateString(tradeForm.date) ?? ""}
            onChange={(e) => {
              const next = e.target.value;
              setTradeForm({ ...tradeForm, date: next });
              if (tradeErrors.date) {
                setTradeErrors((prev) => ({ ...prev, date: "" }));
              }
            }}
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
        <Button
          onClick={() => void handleTradeSubmit()}
          disabled={tradeSaving}
        >
          {tradeSaving ? "Saving…" : "Add Transaction"}
        </Button>
        {tradeSaveError && (
          <p className="text-sm text-accent-red">{tradeSaveError}</p>
        )}
      </section>

      <div className={dataTableWrapperClass}>
        <table className={dataTableClass}>
          <thead className={dataTableHeadClass}>
            <tr>
              <th className={`${dataTableThLeftClass} w-[20%]`}>Coin</th>
              <th className={`${dataTableThRightClass} w-[8%]`}>Qty</th>
              <th className={`${dataTableThRightClass} w-[14%]`}>Current Value</th>
              <th className={`${dataTableThRightClass} w-[14%]`}>Contribution</th>
              <th className={`${dataTableThRightClass} w-[14%]`}>P/L</th>
              <th className={`${dataTableThRightClass} w-[10%]`}>Alloc %</th>
              <th className={`${dataTableThLeftClass} w-[12%]`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-slate-500">
                  <p>No crypto holdings yet.</p>
                  <p className="mt-2 text-xs text-slate-600">
                    Record a buy transaction above, then set current value via Edit.
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className={dataTableRowClass}>
                  <td className={`${dataTableTdLeftClass} font-medium text-white`}>
                    {row.assetName}
                  </td>
                  <td className={dataTableTdRightClass}>—</td>
                  <td className={dataTableTdRightClass}>
                    {formatSgd(row.currentValueSgd)}
                  </td>
                  <td className={dataTableTdRightClass}>
                    {formatSgd(row.contributionSgd)}
                  </td>
                  <td className={dataTableTdRightClass}>
                    <StackedValue
                      align="right"
                      primary={formatSgd(row.profitLossSgd)}
                      secondary={formatPercent(row.profitLossPercent)}
                      primaryClassName={`font-medium ${plColorClass(row.profitLossSgd)}`}
                      secondaryClassName={`text-[11px] ${plColorClass(row.profitLossPercent)}`}
                    />
                  </td>
                  <td className={dataTableTdRightClass}>
                    {formatPercent(row.portfolioPercent)}
                  </td>
                  <td className={dataTableTdLeftClass}>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRow(row)}
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

      {editingRow && (
        <CryptoHoldingEditModal
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSave={saveHoldingEdit}
        />
      )}
    </div>
  );
}
