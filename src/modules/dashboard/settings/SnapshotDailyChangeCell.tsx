import { formatSgd } from "@/shared/lib/format";

interface SnapshotDailyChangeCellProps {
  delta: number | null | undefined;
}

/** Green / red / yellow daily delta for snapshot table sub-rows. */
export function SnapshotDailyChangeCell({ delta }: SnapshotDailyChangeCellProps) {
  if (delta === null || delta === undefined) {
    return <span className="text-slate-500">—</span>;
  }

  if (delta > 0) {
    return (
      <span className="font-medium text-accent-green">
        ↑ +{formatSgd(delta)}
      </span>
    );
  }

  if (delta < 0) {
    return (
      <span className="font-medium text-accent-red">↓ {formatSgd(delta)}</span>
    );
  }

  return <span className="font-medium text-yellow-400">— S$0.00</span>;
}
