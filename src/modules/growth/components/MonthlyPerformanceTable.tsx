import type { MonthlyPerformanceRow } from "@/core/calculations/growth-reporting";
import { formatSgd, formatPercent } from "@/shared/lib/format";
import { SectionHeader } from "@/shared/components/ui/SectionHeader";
import { ReportingSourceLabel } from "./ReportingSourceLabel";

interface MonthlyPerformanceTableProps {
  rows: MonthlyPerformanceRow[];
}

export function MonthlyPerformanceTable({ rows }: MonthlyPerformanceTableProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Monthly Performance"
        description="Snapshot-based monthly portfolio movement"
      />
      <ReportingSourceLabel source="Dashboard Snapshots" />
      <div className="overflow-x-auto rounded-xl border border-surface-border/60">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-surface/60">
            <tr className="border-b border-surface-border text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">Starting Own Portfolio</th>
              <th className="px-4 py-3">Ending Own Portfolio</th>
              <th className="px-4 py-3">Monthly Contribution Added</th>
              <th className="px-4 py-3">Monthly P/L Change</th>
              <th className="px-4 py-3">Monthly Growth $</th>
              <th className="px-4 py-3">Monthly Growth %</th>
              <th className="px-4 py-3">Snapshots</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No monthly data available.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.month}
                  className="border-b border-surface-border/40 last:border-0 hover:bg-surface/30"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {row.monthLabel}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatSgd(row.startingOwnPortfolio)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatSgd(row.endingOwnPortfolio)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatSgd(row.monthlyContributionAdded)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatSgd(row.monthlyPLChange)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatSgd(row.monthlyGrowthDollars)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {row.monthlyGrowthPercent != null
                      ? formatPercent(row.monthlyGrowthPercent)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {row.snapshotCount}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
