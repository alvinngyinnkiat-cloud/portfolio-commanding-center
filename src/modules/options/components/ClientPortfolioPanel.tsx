"use client";

import { useEffect, useState } from "react";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatUsd } from "@/shared/lib/format";
import { Input } from "@/shared/components/ui/Input";
import { Button } from "@/shared/components/ui/Button";
import { plTrend, formatSignedPercent } from "./options-utils";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";
import { Users, Settings2 } from "lucide-react";

function ClientSummaryCards() {
  const { optionsData } = usePortfolio();
  const summary = optionsData?.clientSummary;
  if (!summary) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-slate-400" />
        <h2 className="text-lg font-semibold text-white">Client Summary</h2>
        <span className="text-xs text-slate-500">Reporting only</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Client Name"
          value={summary.clientName || "—"}
          subValue="From Client Settings"
        />
        <SummaryCard
          label="Starting Capital"
          value={formatUsd(summary.startingCapitalUsd)}
          subValue="Client Settings"
        />
        <SummaryCard
          label="Realized P/L"
          value={formatUsd(summary.clientRealizedPlUsd)}
          subValue="Shared closed trades"
          trend={plTrend(summary.clientRealizedPlUsd)}
        />
        <SummaryCard
          label="Unrealized P/L"
          value={
            summary.clientUnrealizedPlUsd != null
              ? formatUsd(summary.clientUnrealizedPlUsd)
              : "—"
          }
          subValue="Shared open trades (marked)"
          trend={
            summary.clientUnrealizedPlUsd != null
              ? plTrend(summary.clientUnrealizedPlUsd)
              : "neutral"
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Client Equity"
          value={formatUsd(summary.clientEquityUsd)}
          subValue="Starting + realized + unrealized"
          trend={plTrend(summary.clientEquityUsd - summary.startingCapitalUsd)}
          highlight
        />
        <SummaryCard
          label="Return"
          value={
            summary.returnPercent != null
              ? formatSignedPercent(summary.returnPercent, 2)
              : "N/A"
          }
          subValue="(Equity − starting) ÷ starting"
          trend={
            summary.returnPercent != null
              ? plTrend(summary.returnPercent)
              : "neutral"
          }
        />
        <SummaryCard
          label="Open Shared Trades"
          value={String(summary.openSharedTradeCount)}
          subValue="Shared open positions"
        />
        <SummaryCard
          label="Open Shared Risk"
          value={formatUsd(summary.openSharedRiskUsd)}
          subValue="Sum of shared max risk"
        />
      </div>
    </div>
  );
}

function ClientSettingsCard() {
  const { optionsData, services, refresh } = usePortfolio();
  const settings = optionsData?.settings;
  const [form, setForm] = useState({
    clientName: "",
    clientStartingCapitalUsd: "",
    defaultSharedUserPercent: "",
    defaultSharedClientPercent: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForm({
      clientName: settings.clientName,
      clientStartingCapitalUsd: String(settings.clientStartingCapitalUsd),
      defaultSharedUserPercent: String(settings.defaultSharedUserPercent),
      defaultSharedClientPercent: String(settings.defaultSharedClientPercent),
    });
  }, [settings]);

  const handleSave = () => {
    setSaving(true);
    const result = services.optionsSettings.update({
      clientName: form.clientName,
      clientStartingCapitalUsd: parseFloat(form.clientStartingCapitalUsd),
      defaultSharedUserPercent: parseFloat(form.defaultSharedUserPercent),
      defaultSharedClientPercent: parseFloat(form.defaultSharedClientPercent),
    });
    setSaving(false);

    if (!result.ok) {
      const map: Record<string, string> = {};
      for (const err of result.errors) map[err.field] = err.message;
      setErrors(map);
      return;
    }

    setErrors({});
    refresh();
  };

  if (!settings) return null;

  return (
    <div className="rounded-2xl border border-surface-border/80 bg-surface-card/90 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Settings2 size={18} className="text-slate-400" />
        <h2 className="text-lg font-semibold text-white">Client Settings</h2>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Stored permanently. Defaults apply when opening shared trades. Updating
        starting capital immediately updates Client Equity.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Client Name"
          value={form.clientName}
          onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))}
          error={errors.clientName}
          placeholder="Sister Portfolio"
        />
        <Input
          label="Starting Capital (USD)"
          type="number"
          step="any"
          min="0"
          value={form.clientStartingCapitalUsd}
          onChange={(e) =>
            setForm((p) => ({ ...p, clientStartingCapitalUsd: e.target.value }))
          }
          error={errors.clientStartingCapitalUsd}
          placeholder="3000"
        />
        <Input
          label="Default User %"
          type="number"
          min="0"
          max="100"
          value={form.defaultSharedUserPercent}
          onChange={(e) =>
            setForm((p) => ({ ...p, defaultSharedUserPercent: e.target.value }))
          }
          error={errors.defaultSharedUserPercent}
        />
        <Input
          label="Default Client %"
          type="number"
          min="0"
          max="100"
          value={form.defaultSharedClientPercent}
          onChange={(e) =>
            setForm((p) => ({ ...p, defaultSharedClientPercent: e.target.value }))
          }
          error={errors.defaultSharedClientPercent}
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Client Settings"}
        </Button>
      </div>
    </div>
  );
}

export function ClientPortfolioPanel() {
  return (
    <div className="space-y-6">
      <ClientSummaryCards />
      <ClientSettingsCard />
    </div>
  );
}
