"use client";

import { useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import type { CryptoAllocationSettings, CryptoHoldingRow } from "@/core/domain/types";
import {
  buildCashDeploymentBuckets,
  calculateAllocationTotal,
  isAllocationValid,
  validateCryptoHoldingDraft,
} from "@/core/calculations/crypto";
import { formatPercent, formatSgd } from "@/shared/lib/format";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { Wallet, Coins, PiggyBank, TrendingUp } from "lucide-react";

const emptyForm = {
  assetName: "",
  investedSgd: "",
  feesSgd: "",
  currentValueSgd: "",
  notes: "",
};

function plColorClass(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-accent-red";
  return "text-slate-300";
}

function CashDeploymentGuide({
  availableTradingCashSgd,
  settings,
  onSettingsChange,
}: {
  availableTradingCashSgd: number;
  settings: CryptoAllocationSettings;
  onSettingsChange: (settings: CryptoAllocationSettings) => void;
}) {
  const total = calculateAllocationTotal(settings);
  const valid = isAllocationValid(settings);
  const buckets = buildCashDeploymentBuckets(availableTradingCashSgd, settings);

  const handlePercentChange = (
    key: keyof CryptoAllocationSettings,
    value: string
  ) => {
    const parsed = parseFloat(value);
    onSettingsChange({
      ...settings,
      [key]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    });
  };

  const allocationFields: {
    key: keyof CryptoAllocationSettings;
    label: string;
  }[] = [
    { key: "topHolding", label: "Top Holding" },
    { key: "secondToFifth", label: "2nd–5th Holdings" },
    { key: "sixthToTenth", label: "6th–10th Holdings" },
    { key: "others", label: "Others" },
  ];

  return (
    <div className="mt-4 rounded-xl border border-surface-border/60 bg-surface/30 p-4">
      <h3 className="text-sm font-semibold text-white">Cash Deployment Guide</h3>
      <p className="mt-1 text-xs text-slate-500">
        Suggested allocation of available trading cash across holding tiers
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {allocationFields.map(({ key, label }) => (
          <Input
            key={key}
            label={`${label} %`}
            type="number"
            step="1"
            min="0"
            value={String(settings[key])}
            onChange={(e) => handlePercentChange(key, e.target.value)}
          />
        ))}
      </div>

      {!valid && (
        <p className="mt-3 text-xs text-amber-400">
          Allocation percentages must total 100% (currently {formatPercent(total, 0)})
        </p>
      )}

      <div className="mt-4 space-y-2 border-t border-surface-border/40 pt-4">
        {buckets.map((bucket) => (
          <div
            key={bucket.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-slate-400">
              {bucket.label}: {formatPercent(bucket.percent, 0)}
            </span>
            <span className="font-medium text-white">
              {formatSgd(bucket.amountSgd)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HoldingCells({ row }: { row: CryptoHoldingRow }) {
  return (
    <>
      <td className="px-4 py-3 text-slate-300">{row.rank}</td>
      <td className="px-4 py-3 text-slate-400">{row.category}</td>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-white">{row.assetName}</p>
          {row.notes && (
            <p className="mt-0.5 text-xs text-slate-500">{row.notes}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-slate-300">{formatSgd(row.investedSgd)}</td>
      <td className="px-4 py-3 text-slate-300">
        {formatSgd(row.feesSgd ?? 0)}
      </td>
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
      <td className="px-4 py-3 text-slate-300">
        {formatPercent(row.portfolioPercent)}
      </td>
    </>
  );
}

export function CryptoHoldingsTable() {
  const { cryptoData, services, refresh } = usePortfolio();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [allocationSettings, setAllocationSettings] = useState<CryptoAllocationSettings>(
    () => services.cryptoAllocation.get()
  );

  const summary = cryptoData?.summary;
  const rows = cryptoData?.rows ?? [];

  const handleAllocationChange = (settings: CryptoAllocationSettings) => {
    setAllocationSettings(settings);
    services.cryptoAllocation.save(settings);
    refresh();
  };

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

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Value"
          value={formatSgd(summary.totalValueSgd)}
          highlight
          icon={<Wallet size={18} />}
          subValue={`Holdings ${formatSgd(summary.cryptoHoldingsValueSgd)} + Cash ${formatSgd(summary.availableTradingCashSgd)}`}
        />
        <SummaryCard
          label="Crypto Holdings Value"
          value={formatSgd(summary.cryptoHoldingsValueSgd)}
          icon={<Coins size={18} />}
          subValue={`${summary.holdingCount} holding${summary.holdingCount === 1 ? "" : "s"}`}
        />
        <SummaryCard
          label="Crypto Contribution"
          value={formatSgd(summary.cryptoContributionSgd)}
          icon={<TrendingUp size={18} />}
          subValue="Buy amounts + fees · capital injected only"
        />
        <div className="rounded-2xl border border-surface-border/80 bg-surface-card/90 p-5 shadow-md shadow-black/15 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm sm:normal-case sm:tracking-normal sm:text-slate-400">
              Available Trading Cash
            </p>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-slate-400">
              <PiggyBank size={18} />
            </div>
          </div>
          <p
            className={`mt-3 text-2xl font-bold tracking-tight sm:text-3xl ${
              summary.availableTradingCashSgd >= 0 ? "text-white" : "text-accent-red"
            }`}
          >
            {formatSgd(summary.availableTradingCashSgd)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Contributed {formatSgd(summary.totalCryptoCashContributed)} − Contribution{" "}
            {formatSgd(summary.cryptoContributionSgd)}
          </p>
          <CashDeploymentGuide
            availableTradingCashSgd={summary.availableTradingCashSgd}
            settings={allocationSettings}
            onSettingsChange={handleAllocationChange}
          />
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-surface-border/60 bg-surface/30 p-4 sm:grid-cols-2 lg:grid-cols-5">
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
        <table className="w-full text-sm">
          <thead className="bg-surface/60">
            <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Buy SGD</th>
              <th className="px-4 py-3">Fees SGD</th>
              <th className="px-4 py-3">Contribution SGD</th>
              <th className="px-4 py-3">Current Value SGD</th>
              <th className="px-4 py-3">P/L SGD</th>
              <th className="px-4 py-3">P/L %</th>
              <th className="px-4 py-3">Portfolio %</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  <p>No crypto holdings yet.</p>
                  <p className="mt-2 text-xs text-slate-600">
                    Add your first crypto transaction.
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

      {summary.holdingCount > 0 && (
        <p className="text-xs text-slate-500">
          Crypto P/L {formatSgd(summary.cryptoProfitLossSgd)} (
          {formatPercent(summary.cryptoProfitLossPercent)}) · Portfolio % uses Crypto
          Holdings Value only (excludes available trading cash)
        </p>
      )}
    </div>
  );
}
