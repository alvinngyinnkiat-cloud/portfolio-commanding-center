import type { ScannerTrend, SoStatus } from "@/core/domain/types/scanner";



function isInSellPutZone(

  avgPrice: number | null,

  support: number | null,

  atr14: number | null

): boolean {

  if (avgPrice == null || support == null || atr14 == null) {

    return false;

  }

  return avgPrice >= support && avgPrice <= support + atr14;

}



function isInSellCallZone(

  avgPrice: number | null,

  resistance: number | null,

  atr14: number | null

): boolean {

  if (avgPrice == null || resistance == null || atr14 == null) {

    return false;

  }

  return avgPrice >= resistance - atr14 && avgPrice <= resistance;

}



function isInMidZone(

  avgPrice: number | null,

  midPrice: number | null,

  atr14: number | null

): boolean {

  if (avgPrice == null || midPrice == null || atr14 == null) {

    return false;

  }

  return Math.abs(avgPrice - midPrice) <= atr14;

}



function fmt(value: number | null, digits = 2): string {

  if (value == null || !Number.isFinite(value)) {

    return "—";

  }

  return value.toFixed(digits);

}



function fmtRange(range: { low: number; high: number } | null): string {

  if (!range) {

    return "—";

  }

  return `${range.low.toFixed(2)} - ${range.high.toFixed(2)}`;

}



function fmtSo(value: number | null): string {

  if (value == null || !Number.isFinite(value)) {

    return "SO = —";

  }

  return `SO = ${value.toFixed(1)}`;

}



function yesNo(value: boolean): string {

  return value ? "Yes" : "No";

}



export function buildSellPutChecklistReasons(input: {

  so: number | null;

  soStatus: SoStatus;

  trend: ScannerTrend;

  avgPrice: number | null;

  avgPricePrev: number | null;

  primarySupport: number | null;

  atr14: number | null;

  sellPutRange: { low: number; high: number } | null;

}): string[] {

  const insideZone = isInSellPutZone(

    input.avgPrice,

    input.primarySupport,

    input.atr14

  );

  const avgPriceRising =

    input.avgPrice != null &&

    input.avgPricePrev != null &&

    input.avgPrice > input.avgPricePrev;



  return [

    fmtSo(input.so),

    `SO Rolling Up = ${yesNo(input.soStatus === "Rolling Up")}`,

    `Trend Bullish = ${yesNo(input.trend === "Bullish")}`,

    `Avg Price inside Sell Put Zone = ${yesNo(insideZone)} (${fmtRange(input.sellPutRange)})`,

    `Avg Price > Previous Avg Price = ${yesNo(avgPriceRising)} (${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)})`,

  ];

}



export function buildSellCallChecklistReasons(input: {

  so: number | null;

  soStatus: SoStatus;

  trend: ScannerTrend;

  avgPrice: number | null;

  avgPricePrev: number | null;

  primaryResistance: number | null;

  atr14: number | null;

  sellCallRange: { low: number; high: number } | null;

}): string[] {

  const insideZone = isInSellCallZone(

    input.avgPrice,

    input.primaryResistance,

    input.atr14

  );

  const avgPriceFalling =

    input.avgPrice != null &&

    input.avgPricePrev != null &&

    input.avgPrice < input.avgPricePrev;



  return [

    fmtSo(input.so),

    `SO Rolling Down = ${yesNo(input.soStatus === "Rolling Down")}`,

    `Trend Bearish = ${yesNo(input.trend === "Bearish")}`,

    `Avg Price inside Sell Call Zone = ${yesNo(insideZone)} (${fmtRange(input.sellCallRange)})`,

    `Avg Price < Previous Avg Price = ${yesNo(avgPriceFalling)} (${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)})`,

  ];

}



export function buildIronCondorChecklistReasons(input: {

  so: number | null;

  trend: ScannerTrend;

  avgPrice: number | null;

  midPrice: number | null;

  atr14: number | null;

  icMidZone: { low: number; high: number } | null;

}): string[] {

  const soInRange =

    input.so != null && input.so >= 40 && input.so <= 60;

  const insideMid = isInMidZone(

    input.avgPrice,

    input.midPrice,

    input.atr14

  );



  return [

    fmtSo(input.so),

    `SO in range 40-60 = ${yesNo(soInRange)}`,

    `Trend Neutral = ${yesNo(input.trend === "Neutral")}`,

    `Avg Price inside Mid Zone = ${yesNo(insideMid)} (${fmtRange(input.icMidZone)})`,

  ];

}



export function buildNoTradeReasons(input: {

  so: number | null;

  trend: ScannerTrend;

  avgPrice: number | null;

  midPrice: number | null;

  atr14: number | null;

  bullPutEligible: boolean;

  bearCallEligible: boolean;

  ironCondorEligible: boolean;

}): string[] {

  const reasons: string[] = ["No eligible strategy"];



  if (!input.bullPutEligible) {

    reasons.push("Sell Put: not eligible");

  }

  if (!input.bearCallEligible) {

    reasons.push("Sell Call: not eligible");

  }

  if (!input.ironCondorEligible) {

    reasons.push("Iron Condor: not eligible");

  }



  if (input.so != null) {

    reasons.push(fmtSo(input.so));

  }

  reasons.push(`Trend = ${input.trend}`);



  if (input.avgPrice != null) {

    reasons.push(`Avg Price = ${fmt(input.avgPrice)}`);

  }



  if (!isInMidZone(input.avgPrice, input.midPrice, input.atr14)) {

    reasons.push("Avg Price outside Mid Zone");

  }



  return reasons.slice(0, 6);

}



/** @deprecated Use buildSellPutChecklistReasons for Main System display */

export function buildSellPutReasons(input: {

  avgPrice: number | null;

  sellPutRange: { low: number; high: number } | null;

  primarySupport: number | null;

  atr14: number | null;

}): string[] {

  const insideZone = isInSellPutZone(

    input.avgPrice,

    input.primarySupport,

    input.atr14

  );



  return [

    `Avg Price = ${fmt(input.avgPrice)}`,

    `Support Zone = ${fmtRange(input.sellPutRange)}`,

    `Avg Price inside zone = ${insideZone ? "Yes" : "No"}`,

  ];

}



/** @deprecated Use buildSellCallChecklistReasons for Main System display */

export function buildSellCallReasons(input: {

  avgPrice: number | null;

  sellCallRange: { low: number; high: number } | null;

  primaryResistance: number | null;

  atr14: number | null;

}): string[] {

  const insideZone = isInSellCallZone(

    input.avgPrice,

    input.primaryResistance,

    input.atr14

  );



  return [

    `Avg Price = ${fmt(input.avgPrice)}`,

    `Resistance Zone = ${fmtRange(input.sellCallRange)}`,

    `Avg Price inside zone = ${insideZone ? "Yes" : "No"}`,

  ];

}



/** @deprecated Use buildIronCondorChecklistReasons for Main System display */

export function buildIronCondorReasons(input: {

  so: number | null;

  trend: ScannerTrend;

  avgPrice: number | null;

  icMidZone: { low: number; high: number } | null;

  rangeWidth: number | null;

  atr14: number | null;

}): string[] {

  const rangeWidthAtr =

    input.rangeWidth != null &&

    input.atr14 != null &&

    input.atr14 > 0

      ? input.rangeWidth / input.atr14

      : null;



  return [

    fmtSo(input.so),

    `Trend = ${input.trend}`,

    `Avg Price = ${fmt(input.avgPrice)}`,

    `Mid Zone = ${fmtRange(input.icMidZone)}`,

    `Range Width = ${fmt(input.rangeWidth)}`,

    `Range Width = ${fmt(rangeWidthAtr)} ATR`,

  ];

}


