export * from "./types";
export * from "./snapshot-helpers";
export * from "./growth";
export * from "./monthly-performance";
export * from "./contribution-analytics";
export * from "./best-worst";
export * from "./journey";
export * from "./chart-data";
export * from "./growth-attribution";

export const GROWTH_REPORTING_MIN_SNAPSHOTS = 2;

export function hasSufficientSnapshotData(snapshotCount: number): boolean {
  return snapshotCount >= GROWTH_REPORTING_MIN_SNAPSHOTS;
}
