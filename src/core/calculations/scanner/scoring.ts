import type {

  RuleCheck,

  ScannerStrategyResult,

  ScannerTrend,

  SoStatus,

} from "@/core/domain/types/scanner";

import {

  isInMidZone,

  isInSellCallZone,

  isInSellPutZone,

} from "./ema-strategy";



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



function buildResult(checklist: RuleCheck[]): ScannerStrategyResult {

  const passReasons = checklist

    .filter((item) => item.passed)

    .map((item) => `${item.label}: ${item.detail}`);

  const failReasons = checklist

    .filter((item) => !item.passed)

    .map((item) => `${item.label}: ${item.detail}`);



  return {

    eligible: checklist.every((item) => item.passed),

    checklist,

    passReasons,

    failReasons,

  };

}



export function scoreBullPut(input: {

  soStatus: SoStatus;

  trend: ScannerTrend;

  avgPrice: number | null;

  avgPricePrev: number | null;

  primarySupport: number | null;

  atr14: number | null;

  sellPutRange: { low: number; high: number } | null;

}): ScannerStrategyResult {

  const inZone = isInSellPutZone(

    input.avgPrice,

    input.primarySupport,

    input.atr14

  );

  const avgPriceRising =

    input.avgPrice != null &&

    input.avgPricePrev != null &&

    input.avgPrice > input.avgPricePrev;



  const checklist: RuleCheck[] = [

    {

      label: "SO Rolling Up",

      passed: input.soStatus === "Rolling Up",

      detail: input.soStatus,

    },

    {

      label: "Trend Bullish",

      passed: input.trend === "Bullish",

      detail: input.trend,

    },

    {

      label: "Average Price in Sell Put Zone",

      passed: inZone,

      detail: fmtRange(input.sellPutRange),

    },

    {

      label: "Average Price > Previous Average Price",

      passed: avgPriceRising,

      detail: `${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)}`,

    },

  ];



  return buildResult(checklist);

}



export function scoreBearCall(input: {

  soStatus: SoStatus;

  trend: ScannerTrend;

  avgPrice: number | null;

  avgPricePrev: number | null;

  primaryResistance: number | null;

  atr14: number | null;

  sellCallRange: { low: number; high: number } | null;

}): ScannerStrategyResult {

  const inZone = isInSellCallZone(

    input.avgPrice,

    input.primaryResistance,

    input.atr14

  );

  const avgPriceFalling =

    input.avgPrice != null &&

    input.avgPricePrev != null &&

    input.avgPrice < input.avgPricePrev;



  const checklist: RuleCheck[] = [

    {

      label: "SO Rolling Down",

      passed: input.soStatus === "Rolling Down",

      detail: input.soStatus,

    },

    {

      label: "Trend Bearish",

      passed: input.trend === "Bearish",

      detail: input.trend,

    },

    {

      label: "Average Price in Sell Call Zone",

      passed: inZone,

      detail: fmtRange(input.sellCallRange),

    },

    {

      label: "Average Price < Previous Average Price",

      passed: avgPriceFalling,

      detail: `${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)}`,

    },

  ];



  return buildResult(checklist);

}



export function scoreIronCondor(input: {

  so: number | null;

  trend: ScannerTrend;

  avgPrice: number | null;

  midPrice: number | null;

  atr14: number | null;

  icMidZone: { low: number; high: number } | null;

  rangeWidth: number | null;

}): ScannerStrategyResult {

  const soInRange =

    input.so != null && input.so >= 40 && input.so <= 60;

  const insideMid = isInMidZone(

    input.avgPrice,

    input.midPrice,

    input.atr14

  );



  const checklist: RuleCheck[] = [

    {

      label: "SO 40-60",

      passed: soInRange,

      detail:

        input.so != null ? `SO = ${input.so.toFixed(1)}` : "SO unavailable",

    },

    {

      label: "Neutral Trend",

      passed: input.trend === "Neutral",

      detail: input.trend,

    },

    {

      label: "Average Price inside Adjusted Mid Zone",

      passed: insideMid,

      detail: fmtRange(input.icMidZone),

    },

  ];



  const result = buildResult(checklist);



  if (input.rangeWidth != null && input.rangeWidth <= 0) {

    result.eligible = false;

    result.failReasons.push(

      `Range width not positive: ${input.rangeWidth.toFixed(2)}`

    );

  }



  return result;

}



export function buildKeyReason(checklist: RuleCheck[]): string {

  const passed = checklist.filter((item) => item.passed).map((item) => item.label);

  if (passed.length === 0) {

    return "No rules passed";

  }

  return passed.join(" + ");

}


