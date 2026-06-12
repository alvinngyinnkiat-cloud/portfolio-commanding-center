"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { formatSgd, formatDate } from "@/shared/lib/format";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";

export function DailySnapshotTrigger() {
  const { data, services, refresh } = usePortfolio();

  const handleCapture = () => {
    services.snapshots.captureNow();
    refresh();
  };

  const snapshots = data?.snapshots ?? [];
  const latest = [...snapshots].sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <Card
      title="Daily Portfolio Snapshots"
      subtitle="v1.0: manual trigger. Future: auto at 11:59pm SGT"
    >
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={handleCapture}>Capture Snapshot Now</Button>
        {latest && (
          <div className="text-sm text-slate-400">
            Latest: {formatDate(latest.date)} — Own Portfolio{" "}
            <span className="font-medium text-white">
              {formatSgd(latest.ownPortfolio)}
            </span>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {snapshots.length} snapshot(s) stored in localStorage.
      </p>
    </Card>
  );
}
