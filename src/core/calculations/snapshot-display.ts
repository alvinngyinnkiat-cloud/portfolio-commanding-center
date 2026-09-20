import type { DailySnapshot } from "@/core/domain/types";
import { formatSgd } from "@/shared/lib/format";

/** True when client portfolio was stored at capture (not a legacy snapshot). */
export function snapshotClientPortfolioCaptured(
  snapshot: Pick<DailySnapshot, "clientPortfolio">
): boolean {
  return (
    snapshot.clientPortfolio !== null && snapshot.clientPortfolio !== undefined
  );
}

export function formatSnapshotClientPortfolioSgd(
  snapshot: Pick<DailySnapshot, "clientPortfolio">
): string {
  if (!snapshotClientPortfolioCaptured(snapshot)) {
    return "—";
  }
  return formatSgd(snapshot.clientPortfolio as number);
}
