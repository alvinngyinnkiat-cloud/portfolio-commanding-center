import { BarChart3 } from "lucide-react";

export function GrowthEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border bg-surface/40 px-6 py-16 text-center">
      <BarChart3 className="mb-4 text-slate-500" size={40} />
      <h2 className="text-lg font-semibold text-white">
        Portfolio Growth Reporting requires at least 2 snapshots
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        Continue creating daily snapshots at 11:59 PM Singapore Time. Charts
        and growth analytics will appear once sufficient history is available.
      </p>
    </div>
  );
}
