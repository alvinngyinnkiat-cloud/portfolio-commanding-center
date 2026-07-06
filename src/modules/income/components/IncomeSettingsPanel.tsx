"use client";

import { useState } from "react";
import type { IncomeOverlaySettings } from "@/core/domain/types/income";
import {
  normalizeIncomeOverlaySettings,
  writeIncomeOverlaySettings,
} from "@/core/calculations/income";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

interface IncomeSettingsPanelProps {
  settings: IncomeOverlaySettings;
  onSettingsChange: (settings: IncomeOverlaySettings) => void;
}

export function IncomeSettingsPanel({
  settings,
  onSettingsChange,
}: IncomeSettingsPanelProps) {
  const [multiplierDraft, setMultiplierDraft] = useState(
    String(settings.foundationTriggerAtrMultiplier)
  );
  const [minDteDraft, setMinDteDraft] = useState(String(settings.minFoundationDte));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const multiplier = parseFloat(multiplierDraft);
    const minDte = parseInt(minDteDraft, 10);
    const next = writeIncomeOverlaySettings(
      normalizeIncomeOverlaySettings({
        foundationTriggerAtrMultiplier: multiplier,
        minFoundationDte: minDte,
      })
    );
    onSettingsChange(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card
      title="Module 6 Settings"
      subtitle="Read-only overlay · local preferences only · does not modify Options or Scanner data"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-sm">
          <span className="text-slate-400">Foundation Trigger ATR Multiplier</span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={multiplierDraft}
            onChange={(event) => setMultiplierDraft(event.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface/60 px-3 py-2 text-white"
          />
          <span className="block text-xs text-slate-500">
            Foundation Trigger Price = Foundation BE + (ATR14 × multiplier). Default 2.5.
          </span>
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-slate-400">Minimum Foundation DTE</span>
          <input
            type="number"
            min={0}
            step={1}
            value={minDteDraft}
            onChange={(event) => setMinDteDraft(event.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface/60 px-3 py-2 text-white"
          />
          <span className="block text-xs text-slate-500">
            Foundation positions require opening DTE ≥ this value. Default 45.
          </span>
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSave}>Save Settings</Button>
        {saved && (
          <span className="text-sm text-emerald-400">Settings saved locally.</span>
        )}
      </div>
    </Card>
  );
}
