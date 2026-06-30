"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { usePortfolio } from "@/context/PortfolioContext";
import { useCryptoSave } from "@/modules/crypto/lib/crypto-save-context";
import type { CryptoAllocationSettings } from "@/core/domain/types";
import {
  buildCashDeploymentBuckets,
  calculateAllocationTotal,
  isAllocationValid,
} from "@/core/calculations/crypto";
import { formatPercent, formatSgd } from "@/shared/lib/format";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";

const COIN_COLORS = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
];

const ALLOCATION_SAVE_DEBOUNCE_MS = 400;

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
    <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-4">
      <h4 className="text-sm font-semibold text-white">Cash Deployment Guide</h4>
      <p className="mt-1 text-xs text-slate-500">
        Suggested allocation of Crypto Cash across holding tiers
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {allocationFields.map(({ key, label }) => (
          <Input
            key={key}
            label={`${label} %`}
            type="number"
            step="1"
            min="0"
            value={String(coerceNumber(settings[key]))}
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

export function CryptoAllocationSection() {
  const { cryptoData, services } = usePortfolio();
  const { commitCryptoChange } = useCryptoSave();
  const [allocationSettings, setAllocationSettings] =
    useState<CryptoAllocationSettings>(() => services.cryptoAllocation.get());
  const pendingSaveRef = useRef<CryptoAllocationSettings | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cryptoData?.allocationSettings) {
      setAllocationSettings(cryptoData.allocationSettings);
    }
  }, [cryptoData?.allocationSettings]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const rows = cryptoData?.rows ?? [];
  const summary = cryptoData?.summary;

  const chartData = useMemo(
    () =>
      rows
        .filter((row) => coerceNumber(row.currentValueSgd) > 0)
        .map((row, index) => ({
          name: row.assetName,
          value: row.currentValueSgd,
          color: COIN_COLORS[index % COIN_COLORS.length],
        })),
    [rows]
  );

  const flushAllocationSave = (settings: CryptoAllocationSettings) => {
    pendingSaveRef.current = settings;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      const next = pendingSaveRef.current;
      if (!next) return;
      pendingSaveRef.current = null;
      void commitCryptoChange(() => {
        services.cryptoAllocation.save(next);
        return true;
      });
    }, ALLOCATION_SAVE_DEBOUNCE_MS);
  };

  const handleAllocationChange = (settings: CryptoAllocationSettings) => {
    setAllocationSettings(settings);
    flushAllocationSave(settings);
  };

  if (!summary) return null;

  return (
    <div className="min-w-0 space-y-4">
      <Card
        title="Crypto Asset Allocation"
        subtitle="By current holding value (SGD)"
      >
        {chartData.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface/40">
            <p className="px-4 text-center text-sm text-slate-500">
              Add holdings to see allocation by coin.
            </p>
          </div>
        ) : (
          <div className="h-56 w-full min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatSgd(value)}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  formatter={(value) => (
                    <span className="text-xs text-slate-400 sm:text-sm">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="rounded-xl border border-surface-border/60 bg-surface/40 p-4">
        <h4 className="text-sm font-semibold text-white">Top Holdings Breakdown</h4>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No holdings yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-2 text-left">Rank</th>
                  <th className="px-2 py-2 text-left">Asset</th>
                  <th className="px-2 py-2 text-left">Value</th>
                  <th className="px-2 py-2 text-left">Portfolio %</th>
                  <th className="px-2 py-2 text-left">Category</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-surface-border/40 text-slate-300"
                  >
                    <td className="px-2 py-2">{row.rank}</td>
                    <td className="px-2 py-2 font-medium text-white">
                      {row.assetName}
                    </td>
                    <td className="px-2 py-2">{formatSgd(row.currentValueSgd)}</td>
                    <td className="px-2 py-2">
                      {formatPercent(row.portfolioPercent)}
                    </td>
                    <td className="px-2 py-2 text-slate-400">{row.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CashDeploymentGuide
        availableTradingCashSgd={summary.availableTradingCashSgd}
        settings={allocationSettings}
        onSettingsChange={handleAllocationChange}
      />
    </div>
  );
}
