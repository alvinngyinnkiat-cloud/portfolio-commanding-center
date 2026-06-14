import type {

  ScannerStrategy,

  ScannerTickerResult,

} from "@/core/domain/types/scanner";

import { STRATEGY_LABELS } from "@/core/domain/types/scanner";

import {

  buildIronCondorReasons,

  buildSellCallReasons,

  buildSellPutReasons,

} from "./display-reasons";



export function buildTradeReasons(

  strategy: ScannerStrategy,

  result: ScannerTickerResult

): string[] {

  const reasons: string[] = [STRATEGY_LABELS[strategy]];

  const { indicators, structure } = result;



  if (strategy === "bullPut") {

    return [

      ...reasons,

      ...buildSellPutReasons({

        avgPrice: indicators.avgPrice,

        sellPutRange: structure.sellPutRange,

        primarySupport: structure.primarySupport,

        atr14: indicators.atr14,

      }),

    ];

  }



  if (strategy === "bearCall") {

    return [

      ...reasons,

      ...buildSellCallReasons({

        avgPrice: indicators.avgPrice,

        sellCallRange: structure.sellCallRange,

        primaryResistance: structure.primaryResistance,

        atr14: indicators.atr14,

      }),

    ];

  }



  return [

    ...reasons,

    ...buildIronCondorReasons({

      so: indicators.so,

      trend: indicators.trend,

      avgPrice: indicators.avgPrice,

      icMidZone: structure.icMidZone,

      rangeWidth: structure.rangeWidth,

      atr14: indicators.atr14,

    }),

  ];

}



const SETUP_PRIORITY: ScannerStrategy[] = ["bullPut", "bearCall", "ironCondor"];



export function pickBestSetup(

  strategies: Record<ScannerStrategy, { eligible: boolean }>

): ScannerStrategy | null {

  for (const key of SETUP_PRIORITY) {

    if (strategies[key].eligible) {

      return key;

    }

  }

  return null;

}


