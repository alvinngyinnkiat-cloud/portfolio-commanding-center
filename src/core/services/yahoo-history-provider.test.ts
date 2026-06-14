import { describe, expect, it } from "vitest";
import { fetchYahooHistory } from "./yahoo-history-provider";

describe("fetchYahooHistory display ticker mapping", () => {
  it("returns display ticker while fetching with Yahoo symbol", async () => {
    const mockFetch = async () =>
      ({
        ok: true,
        json: async () => ({
          chart: {
            result: [
              {
                timestamp: [1_700_000_000],
                indicators: {
                  quote: [
                    {
                      open: [100],
                      high: [101],
                      low: [99],
                      close: [100.5],
                    },
                  ],
                },
              },
            ],
          },
        }),
      }) as Response;

    const result = await fetchYahooHistory(
      { market: "US", ticker: "^XSP", displayTicker: "XSP" },
      mockFetch
    );

    expect(result.ticker).toBe("XSP");
    expect(result.candles).toHaveLength(1);
  });
});
