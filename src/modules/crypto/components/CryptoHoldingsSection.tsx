"use client";

import { useEffect, useRef, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import { useCryptoSave } from "@/modules/crypto/lib/crypto-save-context";
import type { CryptoHoldingRow, CryptoTradeType } from "@/core/domain/types";
import {
  validateCryptoHoldingValueDraft,
  validateCryptoTradeDraft,
} from "@/core/calculations/crypto";
import { formatPercent, formatSgd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { parseIsoDateString, toLocalDateString } from "@/shared/lib/date";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";
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

function InlineCurrentValueCell({
  row,
  disabled,
  onSave,
}: {
  row: CryptoHoldingRow;
  disabled: boolean;
  onSave: (currentValueSgd: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(row.currentValueSgd));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!editing) {
      setDraft(String(row.currentValueSgd));
      setError(null);
    }
  }, [row.currentValueSgd, editing]);

  const startEdit = () => {
    if (disabled) return;
    cancelRef.current = false;
    setDraft(String(row.currentValueSgd));
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    cancelRef.current = true;
    setDraft(String(row.currentValueSgd));
    setError(null);
    setEditing(false);
  };

  const commit = async () => {
    if (cancelRef.current || saving) return;

    const validation = validateCryptoHoldingValueDraft({
      currentValueSgd: draft,
      notes: row.notes ?? "",
    });
    if (!validation.valid) {
      setError(validation.errors.currentValueSgd ?? "Invalid value");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = await onSave(draft);
      if (saved) {
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type="number"
            step="0.01"
            min="0"
            value={draft}
            disabled={disabled || saving}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void commit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancel();
              }
            }}
            className="w-28 rounded-lg border border-surface-border bg-surface/80 px-2 py-1 text-right text-sm text-white"
          />
          <Button size="sm" onClick={() => void commit()} disabled={disabled || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={cancel}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
        {error && <span className="text-xs text-accent-red">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      disabled={disabled}
      className="rounded px-1 text-right text-slate-200 underline decoration-dotted decoration-slate-600 underline-offset-2 hover:text-white hover:decoration-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
      title="Click to edit current value"
    >
      {formatSgd(row.currentValueSgd)}
    </button>
  );
}

export function CryptoHoldingsSection() {
  const { cryptoData, services } = usePortfolio();
  const { commitCryptoChange, status: saveStatus, error: saveError } =
    useCryptoSave();
  const [tradeForm, setTradeForm] = useState(emptyTradeForm);
  const [tradeErrors, setTradeErrors] = useState<Record<string, string>>({});
  const [tradeSaveError, setTradeSaveError] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState(false);

  const rows = cryptoData?.rows ?? [];
  const isSaving = actionInFlight || saveStatus === "saving";

  const handleTradeSubmit = async () => {
    if (!services?.cryptoTrades || isSaving) return;

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

    setActionInFlight(true);
    setTradeSaveError(null);

    const { success, error } = await commitCryptoChange(() => {
      const trade = services.cryptoTrades!.upsertFromDraft(tradeForm);
      return trade != null;
    }, { rehydrate: true });

    setActionInFlight(false);

    if (success) {
      setTradeErrors({});
      setTradeForm(emptyTradeForm());
    } else {
      setTradeSaveError(
        error ??
          "Could not save the transaction record. Check all fields and try again."
      );
    }
  };

  const saveCurrentValue = async (
    row: CryptoHoldingRow,
    currentValueSgd: string
  ): Promise<boolean> => {
    if (!services?.cryptoHoldings || isSaving) return false;

    const { success } = await commitCryptoChange(() => {
      const updated = services.cryptoHoldings!.updateValuation(row.id, {
        currentValueSgd,
        notes: row.notes ?? "",
      });
      return updated != null;
    }, { rehydrate: false });

    return success;
  };

  const handleDeleteHolding = async (row: CryptoHoldingRow) => {
    if (!services?.cryptoTrades || !services?.cryptoHoldings || isSaving) return;
    if (!window.confirm(`Delete ${row.assetName} and all related buy/sell records?`)) {
      return;
    }

    setActionInFlight(true);
    const { success, error } = await commitCryptoChange(() => {
      const trades = services.cryptoTrades!.list();
      const assetKey = row.assetName.trim().toUpperCase();
      const remaining = trades.filter(
        (trade) => trade.assetName.trim().toUpperCase() !== assetKey
      );
      services.cryptoTrades!.replaceAll(remaining);
      services.cryptoHoldings!.delete(row.id);
      return true;
    }, { rehydrate: true });
    setActionInFlight(false);

    if (!success) {
      setTradeSaveError(error ?? "Failed to delete holding.");
    }
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
        <Button onClick={() => void handleTradeSubmit()} disabled={isSaving}>
          {isSaving ? "Saving…" : "Add Transaction"}
        </Button>
        {(tradeSaveError || (saveStatus === "failed" && saveError)) && (
          <p className="text-sm text-accent-red">{tradeSaveError ?? saveError}</p>
        )}
      </section>

      <div className={dataTableWrapperClass}>
        <table className={dataTableClass}>
          <thead className={dataTableHeadClass}>
            <tr>
              <th className={`${dataTableThLeftClass} w-[20%]`}>Coin</th>
              <th className={`${dataTableThRightClass} w-[8%]`}>Qty</th>
              <th className={`${dataTableThRightClass} w-[18%]`}>Current Value</th>
              <th className={`${dataTableThRightClass} w-[14%]`}>Contribution</th>
              <th className={`${dataTableThRightClass} w-[14%]`}>P/L</th>
              <th className={`${dataTableThRightClass} w-[10%]`}>Alloc %</th>
              <th className={`${dataTableThLeftClass} w-[10%]`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-slate-500">
                  <p>No crypto holdings yet.</p>
                  <p className="mt-2 text-xs text-slate-600">
                    Record a buy transaction above, then click Current Value to set price.
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
                    <InlineCurrentValueCell
                      row={row}
                      disabled={isSaving}
                      onSave={(value) => saveCurrentValue(row, value)}
                    />
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
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void handleDeleteHolding(row)}
                      disabled={isSaving}
                    >
                      Delete
                    </Button>
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
