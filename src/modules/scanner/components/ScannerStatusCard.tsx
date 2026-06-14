"use client";

import type { ScannerScanRun } from "@/core/domain/types/scanner";
import { Card } from "@/shared/components/ui/Card";
import { SummaryCard } from "@/shared/components/ui/SummaryCard";

interface ScannerStatusCardProps {
  run: ScannerScanRun | null;
}

function formatScanTime(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(",", "");
}

export function ScannerStatusCard({ run }: ScannerStatusCardProps) {
  return (
    <Card title="Scanner Status" subtitle="Latest completed daily scan">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          compact
          label="Last Scan"
          value={formatScanTime(run?.scanTime)}
          subValue="SGT"
        />
        <SummaryCard
          compact
          label="Market Date Used"
          value={run?.marketDateUsed ?? "—"}
        />
        <SummaryCard
          compact
          label="Tickers Scanned"
          value={String(run?.tickersScanned ?? 0)}
        />
        <SummaryCard
          compact
          label="Opportunities"
          value={`Sell Put ${run?.opportunities.bullPut ?? 0} · Sell Call ${run?.opportunities.bearCall ?? 0} · Iron Condor ${run?.opportunities.ironCondor ?? 0}`}
        />
      </div>
    </Card>
  );
}
