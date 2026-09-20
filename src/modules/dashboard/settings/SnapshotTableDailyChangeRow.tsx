import type { SnapshotDailyChangeColumns } from "@/core/calculations/snapshot-comparison";
import { SnapshotDailyChangeCell } from "./SnapshotDailyChangeCell";

interface SnapshotTableDailyChangeRowProps {
  changes: SnapshotDailyChangeColumns | null;
}

export function SnapshotTableDailyChangeRow({
  changes,
}: SnapshotTableDailyChangeRowProps) {
  return (
    <tr className="border-b border-surface-border/30 bg-surface/25 text-xs">
      <td className="px-4 py-1.5" colSpan={2} />
      <td className="px-4 py-1.5 font-semibold uppercase tracking-wide text-slate-500">
        Δ Daily
      </td>
      <td className="px-4 py-1.5">
        <SnapshotDailyChangeCell delta={changes?.ownPortfolio} />
      </td>
      <td className="px-4 py-1.5">
        <SnapshotDailyChangeCell delta={changes?.clientPortfolio} />
      </td>
      <td className="px-4 py-1.5">
        <SnapshotDailyChangeCell delta={changes?.usStocksEtfSgd} />
      </td>
      <td className="px-4 py-1.5">
        <SnapshotDailyChangeCell delta={changes?.sgStocksSgd} />
      </td>
      <td className="px-4 py-1.5">
        <SnapshotDailyChangeCell delta={changes?.cryptoSgd} />
      </td>
      <td className="px-4 py-1.5">
        <SnapshotDailyChangeCell delta={changes?.personalCashSgd} />
      </td>
      <td className="px-4 py-1.5" />
    </tr>
  );
}
