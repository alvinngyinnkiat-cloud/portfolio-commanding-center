"use client";

import { useMemo, useRef, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type {
  StockInstrumentType,
  StockTransaction,
  StockTransactionType,
} from "@/core/domain/types";
import {
  stockTransactionToDraft,
  type StockTransactionDraft,
} from "@/core/calculations/stocks/validation";
import { toLocalDateString } from "@/shared/lib/date";
import { formatDate, formatUsd, formatSgd } from "@/shared/lib/format";
import { Input } from "@/shared/components/ui/Input";
import { Select } from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/Button";

const TYPE_OPTIONS: { value: StockTransactionType; label: string }[] = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "dividend", label: "Dividend" },
  { value: "fee", label: "Fee" },
];

const INSTRUMENT_TYPE_OPTIONS: { value: StockInstrumentType; label: string }[] =
  [
    { value: "stock", label: "Stock" },
    { value: "etf", label: "ETF" },
  ];

function emptyForm(): StockTransactionDraft {
  return {
    date: toLocalDateString(),
    market: "US",
    ticker: "",
    instrumentType: "stock",
    transactionType: "buy",
    quantity: "",
    price: "",
    fees: "0",
    amount: "",
    notes: "",
  };
}

function formatNativeAmount(transaction: StockTransaction): string {
  const value = Math.abs(transaction.netAmount);
  return transaction.currency === "USD"
    ? formatUsd(value)
    : formatSgd(value);
}

const TRANSACTION_TYPE_LABELS: Record<StockTransactionType, string> = {
  buy: "Buy",
  sell: "Sell",
  dividend: "Dividend",
  fee: "Fee",
};

function formatTransactionTypeLabel(type: StockTransactionType): string {
  return TRANSACTION_TYPE_LABELS[type];
}

function formatInstrumentTypeLabel(
  instrumentType: StockTransaction["instrumentType"]
): string {
  return instrumentType === "etf" ? "ETF" : "Stock";
}

export function StockTransactionsTable() {
  const { stockData, services, refresh } = usePortfolio();
  const formRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<StockTransactionDraft>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const transactions = stockData?.transactions ?? [];
  const isEditing = editingId != null;

  const isTrade =
    form.transactionType === "buy" || form.transactionType === "sell";
  const isCashOnly =
    form.transactionType === "dividend" || form.transactionType === "fee";

  const preview = useMemo(() => {
    if (!isTrade) return null;
    const qty = parseFloat(form.quantity);
    const price = parseFloat(form.price);
    const fees = parseFloat(form.fees || "0") || 0;
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) {
      return null;
    }
    const gross = qty * price;
    const net =
      form.transactionType === "buy" ? -(gross + fees) : gross - fees;
    return { gross, net, fees };
  }, [form, isTrade]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormErrors({});
    setSubmitError(null);
  };

  const handleSubmit = () => {
    setSubmitError(null);
    setFormErrors({});

    const result = services.stockTransactions.upsert({
      ...form,
      id: editingId ?? undefined,
    });

    if (!result.ok) {
      setFormErrors(result.errors);
      setSubmitError(result.errors.ledger ?? null);
      return;
    }

    resetForm();
    refresh();
  };

  const handleEdit = (transaction: StockTransaction) => {
    setEditingId(transaction.id);
    setForm(stockTransactionToDraft(transaction));
    setFormErrors({});
    setSubmitError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = (id: string) => {
    services.stockTransactions.delete(id);
    if (editingId === id) {
      resetForm();
    }
    refresh();
  };

  return (
    <div className="space-y-6">
      <div
        ref={formRef}
        className={`space-y-4 rounded-xl border p-4 ${
          isEditing
            ? "border-accent/50 bg-accent/5"
            : "border-surface-border/60 bg-surface/40"
        }`}
      >
        {isEditing && (
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Editing Transaction
          </p>
        )}
        <h3 className="text-sm font-semibold text-slate-200">
          {isEditing ? "Update Transaction" : "Add Transaction"}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            error={formErrors.date}
          />
          <Select
            label="Market"
            value={form.market}
            onChange={(e) => setForm((f) => ({ ...f, market: e.target.value }))}
            options={[
              { value: "US", label: "US (USD)" },
              { value: "SG", label: "SG (SGD)" },
            ]}
          />
          {formErrors.market && (
            <p className="text-xs text-accent-red lg:col-span-3">
              {formErrors.market}
            </p>
          )}
          <Select
            label="Type"
            value={form.transactionType}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                transactionType: e.target.value as StockTransactionType,
              }))
            }
            options={TYPE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
          <Input
            label="Ticker"
            value={form.ticker}
            onChange={(e) =>
              setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))
            }
            placeholder="AAPL"
            error={formErrors.ticker}
          />
          <Select
            label="Instrument Type"
            value={form.instrumentType}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                instrumentType: e.target.value as StockInstrumentType,
              }))
            }
            options={INSTRUMENT_TYPE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />
          {formErrors.instrumentType && (
            <p className="text-xs text-accent-red lg:col-span-3">
              {formErrors.instrumentType}
            </p>
          )}
          {isTrade && (
            <>
              <Input
                label="Quantity"
                type="number"
                step="any"
                min="0"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: e.target.value }))
                }
                error={formErrors.quantity}
              />
              <Input
                label={`Price (${form.market === "US" ? "USD" : "SGD"})`}
                type="number"
                step="any"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                error={formErrors.price}
              />
            </>
          )}
          {isCashOnly && (
            <Input
              label={`${form.transactionType === "dividend" ? "Dividend" : "Fee"} Amount (${form.market === "US" ? "USD" : "SGD"})`}
              type="number"
              step="any"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              error={formErrors.amount}
            />
          )}
          <Input
            label="Fees"
            type="number"
            step="any"
            min="0"
            value={form.fees}
            onChange={(e) => setForm((f) => ({ ...f, fees: e.target.value }))}
            error={formErrors.fees}
            hint={
              isCashOnly ? "Optional withholding / extra charges" : undefined
            }
          />
          <Input
            label="Notes"
            value={form.notes ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="sm:col-span-2 lg:col-span-3"
          />
        </div>

        {preview && (
          <div className="rounded-lg border border-surface-border/50 bg-surface/60 px-3 py-2 text-xs text-slate-400">
            Preview · Gross {preview.gross.toFixed(2)} · Fees{" "}
            {preview.fees.toFixed(2)} · Net {preview.net.toFixed(2)}{" "}
            {form.market === "US" ? "USD" : "SGD"}
          </div>
        )}

        {submitError && (
          <p className="text-sm text-accent-red" role="alert">
            {submitError}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSubmit}>
            {isEditing ? "Save Changes" : "Add Transaction"}
          </Button>
          {isEditing && (
            <Button variant="secondary" onClick={resetForm}>
              Cancel Edit
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-border/60">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-surface/60">
            <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="whitespace-nowrap px-4 py-3">Date</th>
              <th className="whitespace-nowrap px-4 py-3">Market</th>
              <th className="whitespace-nowrap px-4 py-3">Ticker</th>
              <th className="whitespace-nowrap px-4 py-3">Transaction Type</th>
              <th className="whitespace-nowrap px-4 py-3">Instrument Type</th>
              <th className="whitespace-nowrap px-4 py-3">Quantity</th>
              <th className="whitespace-nowrap px-4 py-3">Price</th>
              <th className="whitespace-nowrap px-4 py-3">Net Amount</th>
              <th className="whitespace-nowrap px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No stock transactions yet.
                  <span className="mt-2 block text-xs text-slate-600">
                    Add your first stock transaction.
                  </span>
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className={`border-b border-surface-border/40 last:border-0 hover:bg-surface/30 ${
                    editingId === transaction.id ? "bg-accent/10" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    {transaction.market}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-white">
                    {transaction.ticker}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    {formatTransactionTypeLabel(transaction.transactionType)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    {formatInstrumentTypeLabel(transaction.instrumentType)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    {transaction.quantity || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    {transaction.price
                      ? transaction.currency === "USD"
                        ? formatUsd(transaction.price)
                        : formatSgd(transaction.price)
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    {formatNativeAmount(transaction)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={
                          editingId === transaction.id ? "primary" : "secondary"
                        }
                        onClick={() => handleEdit(transaction)}
                        aria-pressed={editingId === transaction.id}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(transaction.id)}
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
