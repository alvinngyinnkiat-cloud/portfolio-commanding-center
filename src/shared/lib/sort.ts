/** Newest calendar dates first (YYYY-MM-DD). */
export function compareDateDesc(a: string, b: string): number {
  return b.localeCompare(a);
}

export function sortByDateDesc<T extends { date: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => compareDateDesc(a.date, b.date));
}

export function compareDateDescWithCreatedAt(
  a: { date: string; createdAt?: string },
  b: { date: string; createdAt?: string }
): number {
  const byDate = compareDateDesc(a.date, b.date);
  if (byDate !== 0) return byDate;
  return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
}
