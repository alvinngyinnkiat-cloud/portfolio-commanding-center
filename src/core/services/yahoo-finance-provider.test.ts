import { describe, expect, it } from "vitest";
import { toYahooSymbol, fetchYahooQuote } from "@/core/services/yahoo-finance-provider";

describe("yahoo finance provider", () => {
  it("maps US tickers directly", () => {
    expect(toYahooSymbol("US", "aapl")).toBe("AAPL");
  });

  it("maps SG tickers to the .SI suffix", () => {
    expect(toYahooSymbol("SG", "d05")).toBe("D05.SI");
    expect(toYahooSymbol("SG", "D05.SI")).toBe("D05.SI");
  });

  it("parses a successful Yahoo Finance response", async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          chart: {
            result: [{ meta: { regularMarketPrice: 123.45 } }],
          },
        }),
        { status: 200 }
      );

    const quote = await fetchYahooQuote(
      { market: "US", ticker: "AAPL" },
      fetchImpl
    );

    expect(quote.price).toBe(123.45);
    expect(quote.error).toBeUndefined();
  });

  it("returns null price when Yahoo Finance fails", async () => {
    const fetchImpl = async () => new Response("error", { status: 500 });

    const quote = await fetchYahooQuote(
      { market: "SG", ticker: "D05" },
      fetchImpl
    );

    expect(quote.price).toBeNull();
    expect(quote.error).toContain("HTTP 500");
  });
});
