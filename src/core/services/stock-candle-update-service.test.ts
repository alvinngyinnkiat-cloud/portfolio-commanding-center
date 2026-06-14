import { describe, expect, it, vi } from "vitest";

import { DEFAULT_SCANNER_WATCHLIST } from "@/core/calculations/scanner/watchlist";

import { StockCandleUpdateService } from "./stock-candle-update-service";



describe("StockCandleUpdateService XSP mapping", () => {

  it("fetches ^XSP while storing candles under display ticker XSP", async () => {

    const fetchHistory = vi.fn(async () => [

      {

        market: "US" as const,

        ticker: "XSP",

        candles: [

          {

            date: "2026-06-12",

            open: 100,

            high: 101,

            low: 99,

            close: 100,

          },

        ],

      },

    ]);



    const service = new StockCandleUpdateService(

      { list: () => [] },

      { replaceForTicker: vi.fn() },

      { replaceForTicker: vi.fn() },

      { get: () => ({}), set: vi.fn() },

      {

        get: () =>

          DEFAULT_SCANNER_WATCHLIST.map((row) => ({

            ...row,

            active: row.ticker === "XSP",

          })),

      },

      fetchHistory

    );



    await service.updateUsCandles(new Date("2026-06-13T10:00:00+08:00"));



    expect(fetchHistory).toHaveBeenCalledWith([

      { market: "US", ticker: "^XSP", displayTicker: "XSP" },

    ]);

  });

});


