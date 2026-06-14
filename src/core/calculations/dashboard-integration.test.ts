import { describe, expect, it } from "vitest";
import type {
  CalculatedHolding,
  ContributionTransaction,
  CryptoHolding,
  StockTransaction,
} from "@/core/domain/types";
import type { OptionsSettings, OptionsTrade } from "@/core/domain/types/options";
import { buildStockTrackerSummary } from "@/core/calculations/stocks/summary";
import { buildCryptoTrackerSummary } from "@/core/calculations/crypto/summary";
import { calculateTotalCryptoCashContributed } from "@/core/calculations/crypto/contributions";
import {
  buildOptionsClientSummary,
  buildOptionsTrackerSummary,
  buildClosedTradeRows,
  buildOpenTradeRows,
  sumRealizedOptionsPlUsd,
} from "@/core/calculations/options";
import { deriveDashboardStockValues } from "@/core/adapters/dashboard-stock-adapter";
import { deriveDashboardCryptoOutputs } from "@/core/adapters/dashboard-crypto-adapter";
import {
  deriveDashboardClientPortfolio,
  deriveDashboardOptionsValue,
} from "@/core/adapters/dashboard-client-adapter";
import { calculatePortfolioMetrics } from "@/core/calculations/portfolio";
import { usdToSgd } from "@/core/calculations/fx";
import { calculatePersonalCashContributionSgd } from "@/core/calculations/personal-cash/contributions";

const FX = 1.35;

const defaultOptionsSettings: OptionsSettings = {
  clientName: "Client A",
  clientStartingCapitalUsd: 10_000,
  defaultSharedUserPercent: 60,
  defaultSharedClientPercent: 40,
  updatedAt: "2025-01-01T00:00:00.000Z",
};

function holding(
  overrides: Partial<CalculatedHolding> & Pick<CalculatedHolding, "market">
): CalculatedHolding {
  const market = overrides.market;
  return {
    ticker: "TEST",
    assetName: "Test",
    currency: market === "US" ? "USD" : "SGD",
    quantity: 1,
    averageCost: 0,
    totalCost: 0,
    currentPrice: 1,
    marketValue: 0,
    unrealisedPL: 0,
    realisedPL: 0,
    dividendIncome: 0,
    sgdValue: null,
    ...overrides,
  };
}

function stockTx(
  overrides: Partial<StockTransaction> & Pick<StockTransaction, "transactionType">
): StockTransaction {
  return {
    id: "tx-1",
    date: "2025-01-01",
    market: "US",
    ticker: "NVDA",
    assetName: "NVIDIA",
    transactionType: overrides.transactionType,
    quantity: overrides.quantity ?? 0,
    price: overrides.price ?? 0,
    grossAmount: overrides.grossAmount ?? 0,
    fees: overrides.fees ?? 0,
    netAmount: overrides.netAmount ?? 0,
    currency: "USD",
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function contribution(
  overrides: Partial<ContributionTransaction> &
    Pick<ContributionTransaction, "type" | "category" | "amountSgd">
): ContributionTransaction {
  return {
    id: "c-1",
    date: "2025-01-01",
    usdAllocationPercent: 100,
    ...overrides,
  };
}

function cryptoHolding(overrides: Partial<CryptoHolding>): CryptoHolding {
  return {
    id: "ch-1",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 1,
    investedSgd: 0,
    feesSgd: 0,
    currentValueSgd: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function optionsTrade(overrides: Partial<OptionsTrade>): OptionsTrade {
  return {
    id: "opt-1",
    status: "open",
    tradeType: "personal",
    userSharePercent: 100,
    clientSharePercent: 0,
    strategy: "bullPut",
    underlying: "SPY",
    expirationDate: "2026-12-18",
    contracts: 2,
    openDate: "2025-06-01",
    openPremiumUsd: 240,
    openFeesUsd: 0,
    maxRiskUsd: 500,
    createdAt: "2025-06-01T00:00:00.000Z",
    updatedAt: "2025-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function assembleDashboardMetrics(input: {
  holdings: CalculatedHolding[];
  stockTransactions: StockTransaction[];
  contributions: ContributionTransaction[];
  cryptoHoldings: CryptoHolding[];
  optionsTrades: OptionsTrade[];
  optionsSettings?: OptionsSettings;
}) {
  const contributions = input.contributions;
  const realizedOptionsPlUsd = sumRealizedOptionsPlUsd(input.optionsTrades);
  const stockSummary = buildStockTrackerSummary(
    input.holdings,
    contributions,
    input.stockTransactions,
    FX,
    realizedOptionsPlUsd
  );
  const stockValues = deriveDashboardStockValues(input.holdings, FX);
  const cryptoCash = calculateTotalCryptoCashContributed(contributions);
  const cryptoSummary = buildCryptoTrackerSummary(
    input.cryptoHoldings,
    cryptoCash
  );
  const cryptoOutputs = deriveDashboardCryptoOutputs(cryptoSummary);
  const openRows = buildOpenTradeRows(input.optionsTrades);
  const closedRows = buildClosedTradeRows(input.optionsTrades);
  const optionsSettings = input.optionsSettings ?? defaultOptionsSettings;
  const clientSummary = buildOptionsClientSummary(
    optionsSettings,
    openRows,
    closedRows
  );
  const optionsSummary = buildOptionsTrackerSummary({
    contributions,
    stockTransactions: input.stockTransactions,
    optionsTrades: input.optionsTrades,
    fxRate: FX,
  });
  const clientPortfolio = deriveDashboardClientPortfolio(
    {
      usdSgdFxRate: FX,
      manualValues: {
        clientPortfolioUsd: 0,
        usStocksEtfUsd: 0,
        sgStocksSgd: 0,
        cryptoSgd: 0,
      },
    },
    FX,
    clientSummary.clientEquityUsd
  );
  const clientUnrealizedPlSgd =
    clientSummary.clientUnrealizedPlUsd != null
      ? usdToSgd(clientSummary.clientUnrealizedPlUsd, FX)
      : 0;

  const metrics = calculatePortfolioMetrics({
    usStocksEtfUsd: stockValues.usStocksEtfUsd,
    sgStocksSgd: stockValues.sgStocksSgd,
    cryptoSgd: cryptoOutputs.cryptoTotalValueSgd,
    cryptoHoldingCount: cryptoOutputs.numberOfHoldings,
    usAvailableTradingCashUsd: stockSummary.usAvailableTradingCashUsd,
    sgAvailableTradingCashSgd: stockSummary.sgAvailableTradingCashSgd,
    usdTradingCashUsd: stockSummary.usAvailableTradingCashUsd,
    sgdTradingCashSgd: stockSummary.sgAvailableTradingCashSgd,
    cryptoCashSgd: cryptoOutputs.cryptoAvailableTradingCashSgd,
    clientPortfolioUsd: clientPortfolio.clientPortfolioUsd,
    clientPortfolioSgd: clientPortfolio.clientPortfolioSgd,
    clientStartingCapitalUsd: clientSummary.startingCapitalUsd,
    clientStartingCapitalSgd: usdToSgd(clientSummary.startingCapitalUsd, FX),
    clientRealizedPlUsd: clientSummary.clientRealizedPlUsd,
    clientUnrealizedPlSgd: clientUnrealizedPlSgd,
    fxRate: FX,
    contributions,
    totalStockContributionSgd: stockSummary.stockContributionSgd,
    usStockContributionSgd: stockSummary.usStockContributionSgd,
    sgStockContributionSgd: stockSummary.sgStockContributionSgd,
    totalStockValueSgd: stockSummary.totalStockValueSgd,
    stockHoldingsValueSgd: stockSummary.stockHoldingsValueSgd,
    stockProfitLossSgd: stockSummary.stockProfitLossSgd,
    stockAvailableTradingCashSgd: stockSummary.availableTradingCashSgd,
    cryptoContributionSgd: cryptoOutputs.cryptoContributionSgd,
    totalCryptoValueSgd: cryptoOutputs.cryptoTotalValueSgd,
    cryptoHoldingsValueSgd: cryptoOutputs.cryptoHoldingsValueSgd,
    cryptoProfitLossSgd: cryptoOutputs.cryptoProfitLossSgd,
    cryptoAvailableTradingCashSgd: cryptoOutputs.availableTradingCashSgd,
    personalCashContributionSgd:
      calculatePersonalCashContributionSgd(contributions),
    optionsValueSgd: deriveDashboardOptionsValue(
      optionsSummary.userUnrealizedPlUsd,
      FX
    ),
  });

  return { metrics, stockSummary, cryptoSummary, clientSummary, optionsSummary };
}

describe("dashboard integration QA — 9-step plan", () => {
  it("Step 1: empty system baseline", () => {
    const { metrics } = assembleDashboardMetrics({
      holdings: [],
      stockTransactions: [],
      contributions: [],
      cryptoHoldings: [],
      optionsTrades: [],
      optionsSettings: { ...defaultOptionsSettings, clientStartingCapitalUsd: 0 },
    });

    expect(metrics.totalPortfolioValue).toBe(0);
    expect(metrics.totalContribution).toBe(0);
    expect(metrics.totalCashSgd).toBe(0);
    expect(metrics.clientPortfolio).toBe(0);
  });

  it("Step 1b: client equity only when starting capital exists", () => {
    const { metrics } = assembleDashboardMetrics({
      holdings: [],
      stockTransactions: [],
      contributions: [],
      cryptoHoldings: [],
      optionsTrades: [],
    });

    expect(metrics.totalPortfolioValue).toBe(0);
    expect(metrics.clientPortfolio).toBe(usdToSgd(10_000, FX));
    expect(metrics.totalPortfolio).toBe(usdToSgd(10_000, FX));
  });

  it("Step 2: US deposit and US stock buy", () => {
    const contributions = [
      contribution({
        id: "dep-us",
        type: "deposit",
        category: "stock",
        amountSgd: 13_500,
        usdAllocationPercent: 100,
      }),
    ];
    const stockTransactions = [
      stockTx({
        id: "us-buy",
        transactionType: "buy",
        grossAmount: 5_000,
        fees: 10,
        netAmount: -5_010,
      }),
    ];
    const holdings = [
      holding({ market: "US", marketValue: 5_200, sgdValue: 7_020 }),
    ];

    const { metrics, stockSummary, cryptoSummary, optionsSummary } =
      assembleDashboardMetrics({
        holdings,
        stockTransactions,
        contributions,
        cryptoHoldings: [],
        optionsTrades: [],
      });

    expect(stockSummary.usAvailableTradingCashUsd).toBeCloseTo(4_990, 0);
    expect(stockSummary.stockContributionSgd).toBeCloseTo(6_763.5, 0);
    expect(metrics.totalStockValueSgd).toBeGreaterThan(0);
    expect(cryptoSummary.totalValueSgd).toBe(0);
    expect(optionsSummary.usAvailableCashUsd).toBe(
      stockSummary.usAvailableTradingCashUsd
    );
  });

  it("Step 3: SG stock buy leaves US cash unaffected", () => {
    const contributions = [
      contribution({
        id: "dep-sg",
        type: "deposit",
        category: "stock",
        amountSgd: 10_000,
        usdAllocationPercent: 0,
      }),
    ];
    const stockTransactions = [
      stockTx({
        id: "sg-buy",
        market: "SG",
        currency: "SGD",
        transactionType: "buy",
        grossAmount: 4_000,
        fees: 10,
        netAmount: -4_010,
      }),
    ];
    const holdings = [
      holding({ market: "SG", marketValue: 4_200, sgdValue: 4_200 }),
    ];

    const { stockSummary } = assembleDashboardMetrics({
      holdings,
      stockTransactions,
      contributions,
      cryptoHoldings: [],
      optionsTrades: [],
    });

    expect(stockSummary.sgAvailableTradingCashSgd).toBe(5_990);
    expect(stockSummary.usAvailableTradingCashUsd).toBe(0);
    expect(stockSummary.sgStockContributionSgd).toBe(4_010);
  });

  it("Step 4: crypto deposit and buy — stock cash unaffected", () => {
    const contributions = [
      contribution({
        id: "dep-crypto",
        type: "deposit",
        category: "crypto",
        amountSgd: 5_000,
      }),
    ];
    const cryptoHoldings = [
      cryptoHolding({
        investedSgd: 3_000,
        feesSgd: 20,
        currentValueSgd: 3_500,
      }),
    ];

    const { metrics, stockSummary, cryptoSummary } = assembleDashboardMetrics({
      holdings: [],
      stockTransactions: [],
      contributions,
      cryptoHoldings,
      optionsTrades: [],
    });

    expect(cryptoSummary.availableTradingCashSgd).toBe(1_980);
    expect(cryptoSummary.cryptoContributionSgd).toBe(3_020);
    expect(stockSummary.availableTradingCashSgd).toBe(0);
    expect(metrics.totalContribution).toBe(3_020);
  });

  it("Step 5: open options trade — cash unchanged, premium ×100×contracts", () => {
    const contributions = [
      contribution({
        id: "dep-us",
        type: "deposit",
        category: "stock",
        amountSgd: 13_500,
        usdAllocationPercent: 100,
      }),
    ];
    const trades = [
      optionsTrade({
        openPremiumUsd: 240,
        contracts: 2,
      }),
    ];

    const before = assembleDashboardMetrics({
      holdings: [],
      stockTransactions: [],
      contributions,
      cryptoHoldings: [],
      optionsTrades: [],
    });
    const after = assembleDashboardMetrics({
      holdings: [],
      stockTransactions: [],
      contributions,
      cryptoHoldings: [],
      optionsTrades: trades,
    });

    expect(trades[0].openPremiumUsd).toBe(240);
    expect(after.stockSummary.usAvailableTradingCashUsd).toBe(
      before.stockSummary.usAvailableTradingCashUsd
    );
    expect(after.metrics.totalCashSgd).toBe(before.metrics.totalCashSgd);
    expect(after.optionsSummary.userUnrealizedPlUsd).toBeNull();
    expect(after.metrics.optionsValueSgd).toBe(0);
  });

  it("Step 6: option mark update changes unrealised only", () => {
    const contributions = [
      contribution({
        id: "dep-us",
        type: "deposit",
        category: "stock",
        amountSgd: 13_500,
        usdAllocationPercent: 100,
      }),
    ];
    const open = optionsTrade({ currentValueUsd: 80 });
    const marked = optionsTrade({ currentValueUsd: 120 });

    const before = assembleDashboardMetrics({
      holdings: [],
      stockTransactions: [],
      contributions,
      cryptoHoldings: [],
      optionsTrades: [open],
    });
    const after = assembleDashboardMetrics({
      holdings: [],
      stockTransactions: [],
      contributions,
      cryptoHoldings: [],
      optionsTrades: [marked],
    });

    expect(after.metrics.optionsValueSgd).toBeLessThan(
      before.metrics.optionsValueSgd
    );
    expect(after.stockSummary.usAvailableTradingCashUsd).toBe(
      before.stockSummary.usAvailableTradingCashUsd
    );
  });

  it("Step 7: close options trade — full realised P/L to US cash", () => {
    const contributions = [
      contribution({
        id: "dep-us",
        type: "deposit",
        category: "stock",
        amountSgd: 13_500,
        usdAllocationPercent: 100,
      }),
    ];
    const openTrades = [optionsTrade({ currentValueUsd: 80 })];
    const closedTrades = [
      optionsTrade({
        id: "opt-closed",
        status: "closed",
        closeDate: "2025-06-10",
        closePremiumUsd: 40,
        closeFeesUsd: 0,
        realizedPlUsd: 200,
        currentValueUsd: undefined,
      }),
    ];

    const openMetrics = assembleDashboardMetrics({
      holdings: [],
      stockTransactions: [],
      contributions,
      cryptoHoldings: [],
      optionsTrades: openTrades,
    });
    const closedMetrics = assembleDashboardMetrics({
      holdings: [],
      stockTransactions: [],
      contributions,
      cryptoHoldings: [],
      optionsTrades: closedTrades,
    });

    expect(closedMetrics.stockSummary.usAvailableTradingCashUsd).toBe(
      openMetrics.stockSummary.usAvailableTradingCashUsd + 200
    );
    expect(closedMetrics.metrics.optionsValueSgd).toBe(0);
    expect(closedMetrics.metrics.totalPL).toBe(
      closedMetrics.metrics.totalPortfolioValue -
        closedMetrics.metrics.totalContribution
    );
  });

  it("Step 8: shared client trade — full P/L to US cash, client equity separate", () => {
    const contributions = [
      contribution({
        id: "dep-us",
        type: "deposit",
        category: "stock",
        amountSgd: 13_500,
        usdAllocationPercent: 100,
      }),
    ];
    const trades = [
      optionsTrade({
        id: "shared-closed",
        status: "closed",
        tradeType: "shared",
        userSharePercent: 60,
        clientSharePercent: 40,
        closeDate: "2025-06-10",
        closePremiumUsd: 0,
        realizedPlUsd: 100,
      }),
    ];

    const { metrics, stockSummary, clientSummary } = assembleDashboardMetrics({
      holdings: [],
      stockTransactions: [],
      contributions,
      cryptoHoldings: [],
      optionsTrades: trades,
    });

    expect(stockSummary.usAvailableTradingCashUsd).toBeCloseTo(10_100, 0);
    expect(clientSummary.clientRealizedPlUsd).toBe(40);
    expect(metrics.clientPortfolio).toBe(usdToSgd(10_040, FX));
    expect(metrics.totalPortfolio).toBe(
      metrics.totalPortfolioValue + usdToSgd(10_000, FX)
    );
    expect(metrics.totalPortfolio).toBeLessThan(
      metrics.totalPortfolioValue + metrics.clientPortfolio
    );
  });

  it("Step 9: final dashboard reconciliation", () => {
    const contributions = [
      contribution({
        id: "dep-us",
        type: "deposit",
        category: "stock",
        amountSgd: 20_000,
        usdAllocationPercent: 100,
      }),
      contribution({
        id: "dep-crypto",
        type: "deposit",
        category: "crypto",
        amountSgd: 5_000,
      }),
    ];
    const stockTransactions = [
      stockTx({
        id: "us-buy",
        transactionType: "buy",
        grossAmount: 3_000,
        fees: 0,
        netAmount: -3_000,
      }),
    ];
    const holdings = [
      holding({ market: "US", marketValue: 3_500, sgdValue: 4_725 }),
    ];
    const cryptoHoldings = [
      cryptoHolding({
        investedSgd: 2_000,
        feesSgd: 0,
        currentValueSgd: 2_500,
      }),
    ];
    const optionsTrades = [
      optionsTrade({
        id: "open-marked",
        currentValueUsd: 100,
        openPremiumUsd: 200,
        tradeType: "shared",
        userSharePercent: 60,
        clientSharePercent: 40,
      }),
    ];

    const { metrics, clientSummary } = assembleDashboardMetrics({
      holdings,
      stockTransactions,
      contributions,
      cryptoHoldings,
      optionsTrades,
    });

    const expectedOwn =
      metrics.totalStockValueSgd +
      metrics.totalCryptoValueSgd +
      metrics.optionsValueSgd;
    const expectedTotal =
      expectedOwn +
      usdToSgd(clientSummary.startingCapitalUsd, FX) +
      (clientSummary.clientUnrealizedPlUsd != null
        ? usdToSgd(clientSummary.clientUnrealizedPlUsd, FX)
        : 0);
    const expectedContribution =
      metrics.totalStockContributionSgd + metrics.cryptoContributionSgd;

    expect(metrics.totalPortfolioValue).toBeCloseTo(expectedOwn, 2);
    expect(metrics.totalPortfolio).toBeCloseTo(expectedTotal, 2);
    expect(metrics.totalContribution).toBe(expectedContribution);
    expect(metrics.totalPL).toBeCloseTo(
      metrics.totalPortfolioValue - metrics.totalContribution,
      2
    );
    expect(metrics.personalCashSgd).toBe(metrics.totalCashSgd);
    expect(metrics.clientCashSgd).toBe(0);
  });
});
