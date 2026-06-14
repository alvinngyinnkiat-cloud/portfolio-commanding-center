import type {

  EmaStrategyCheck,

  EmaStrategyResult,

  ScannerTrend,

  SoStatus,

  StrategyOutput,

} from "@/core/domain/types/scanner";



export type { StrategyOutput, SoStatus };



export function deriveSoStatus(

  so: number | null,

  soPrev: number | null

): SoStatus {

  if (so == null || soPrev == null) {

    return "Strong";

  }

  if (soPrev < 25 && so > soPrev) {

    return "Rolling Up";

  }

  if (soPrev > 75 && so < soPrev) {

    return "Rolling Down";

  }

  return "Strong";

}



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



const PUT_LABELS = [

  "SO Rolling Up",

  "Trend Bullish",

  "Average Price in Sell Put Zone",

  "Average Price > Previous Average Price",

  "EMA Difference Rule Passed",

  "EMA20 Rising",

] as const;



const CALL_LABELS = [

  "SO Rolling Down",

  "Trend Bearish",

  "Average Price in Sell Call Zone",

  "Average Price < Previous Average Price",

  "EMA Difference Rule Passed",

  "EMA20 Falling",

] as const;



export function evaluateEmaStrategy(input: {

  so: number | null;

  soPrev: number | null;

  soStatus: SoStatus;

  trend: ScannerTrend;

  avgPrice: number | null;

  avgPricePrev: number | null;

  ema20: number | null;

  ema20Prev: number | null;

  emaDiffPct: number | null;

  primarySupport: number | null;

  primaryResistance: number | null;

  atr14: number | null;

}): EmaStrategyResult {

  const emaDiffPassedPut =

    input.emaDiffPct != null && input.emaDiffPct > 0;

  const emaDiffPassedCall =

    input.emaDiffPct != null && input.emaDiffPct < 0;



  const fullChecklist: EmaStrategyCheck[] = [

    {

      label: "SO Rolling Up",

      passed: input.soStatus === "Rolling Up",

      detail: input.soStatus,

    },

    {

      label: "SO Rolling Down",

      passed: input.soStatus === "Rolling Down",

      detail: input.soStatus,

    },

    {

      label: "Trend Bullish",

      passed: input.trend === "Bullish",

      detail: input.trend,

    },

    {

      label: "Trend Bearish",

      passed: input.trend === "Bearish",

      detail: input.trend,

    },

    {

      label: "Average Price in Sell Put Zone",

      passed: isInSellPutZone(

        input.avgPrice,

        input.primarySupport,

        input.atr14

      ),

      detail: "Support to Support + 1 ATR",

    },

    {

      label: "Average Price in Sell Call Zone",

      passed: isInSellCallZone(

        input.avgPrice,

        input.primaryResistance,

        input.atr14

      ),

      detail: "Resistance − 1 ATR to Resistance",

    },

    {

      label: "Average Price > Previous Average Price",

      passed:

        input.avgPrice != null &&

        input.avgPricePrev != null &&

        input.avgPrice > input.avgPricePrev,

      detail: `${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)}`,

    },

    {

      label: "Average Price < Previous Average Price",

      passed:

        input.avgPrice != null &&

        input.avgPricePrev != null &&

        input.avgPrice < input.avgPricePrev,

      detail: `${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)}`,

    },

    {

      label: "EMA Difference Rule Passed",

      passed: emaDiffPassedPut,

      detail:

        input.emaDiffPct != null

          ? `${input.emaDiffPct >= 0 ? "+" : ""}${input.emaDiffPct.toFixed(2)}%`

          : "—",

    },

    {

      label: "EMA20 Rising",

      passed:

        input.ema20 != null &&

        input.ema20Prev != null &&

        input.ema20 > input.ema20Prev,

      detail:

        input.ema20 != null && input.ema20Prev != null

          ? `${input.ema20Prev.toFixed(2)} → ${input.ema20.toFixed(2)}`

          : "EMA20 unavailable",

    },

    {

      label: "EMA20 Falling",

      passed:

        input.ema20 != null &&

        input.ema20Prev != null &&

        input.ema20 < input.ema20Prev,

      detail:

        input.ema20 != null && input.ema20Prev != null

          ? `${input.ema20Prev.toFixed(2)} → ${input.ema20.toFixed(2)}`

          : "EMA20 unavailable",

    },

  ];



  const putChecklist = filterChecklist(fullChecklist, PUT_LABELS).map((item) =>

    item.label === "EMA Difference Rule Passed"

      ? {

          ...item,

          passed: emaDiffPassedPut,

          detail:

            input.emaDiffPct != null

              ? `${input.emaDiffPct >= 0 ? "+" : ""}${input.emaDiffPct.toFixed(2)}%`

              : "—",

        }

      : item

  );



  const callChecklist = filterChecklist(fullChecklist, [

    ...CALL_LABELS.slice(0, 4),

    "EMA Difference Rule Passed",

    "EMA20 Falling",

  ]).map((item) =>

    item.label === "EMA Difference Rule Passed"

      ? {

          ...item,

          passed: emaDiffPassedCall,

          detail:

            input.emaDiffPct != null

              ? `${input.emaDiffPct.toFixed(2)}%`

              : "—",

        }

      : item

  );



  const putEligible = putChecklist.every((item) => item.passed);

  const callEligible = callChecklist.every((item) => item.passed);



  if (putEligible) {

    return {

      output: "SELL PUT",

      reasons: putChecklist

        .filter((item) => item.passed)

        .map((item) => item.label)

        .slice(0, 5),

      checklist: putChecklist,

    };

  }



  if (callEligible) {

    return {

      output: "SELL CALL",

      reasons: callChecklist

        .filter((item) => item.passed)

        .map((item) => item.label)

        .slice(0, 5),

      checklist: callChecklist,

    };

  }



  const failReasons: string[] = [];

  if (input.trend === "Neutral") {

    failReasons.push("Trend not Bullish or Bearish");

  } else if (!putChecklist[1].passed && !callChecklist[1].passed) {

    failReasons.push(`Trend is ${input.trend}`);

  }

  if (!putChecklist[2].passed && !callChecklist[2].passed) {

    failReasons.push("Average Price outside Sell Put and Sell Call zones");

  }

  if (!putChecklist[0].passed && !callChecklist[0].passed) {

    failReasons.push(`SO Status: ${input.soStatus}`);

  }

  if (failReasons.length === 0) {

    failReasons.push("EMA setup conditions not met");

  }



  return {

    output: "NO TRADE",

    reasons: failReasons.slice(0, 5),

    checklist: fullChecklist.filter(

      (item) =>

        PUT_LABELS.includes(item.label as (typeof PUT_LABELS)[number]) ||

        CALL_LABELS.includes(item.label as (typeof CALL_LABELS)[number])

    ),

  };

}



function filterChecklist(

  checklist: EmaStrategyCheck[],

  labels: readonly string[]

): EmaStrategyCheck[] {

  return labels.map((label) => {

    const item = checklist.find((entry) => entry.label === label);

    if (!item) {

      return { label, passed: false, detail: "—" };

    }

    return item;

  });

}



export { isInMidZone, isInSellPutZone, isInSellCallZone };


