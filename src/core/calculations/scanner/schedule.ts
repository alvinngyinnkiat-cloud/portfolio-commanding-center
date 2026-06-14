import {
  getSingaporeDateString,
  isSingaporeTimeAtOrAfter,
  US_PRICE_UPDATE_HOUR,
  US_PRICE_UPDATE_MINUTE,
} from "@/core/calculations/stocks/price-schedule";

export function isScannerRefreshDue(
  lastScanDate: string | null,
  date: Date = new Date()
): boolean {
  const today = getSingaporeDateString(date);
  if (lastScanDate === today) {
    return false;
  }
  return isSingaporeTimeAtOrAfter(
    US_PRICE_UPDATE_HOUR,
    US_PRICE_UPDATE_MINUTE,
    date
  );
}
