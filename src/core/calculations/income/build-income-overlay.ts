import type { OptionsClosedTradeRow, OptionsOpenTradeRow } from "@/core/domain/types/options";
import type { ScannerScanRun, ScannerTickerResult } from "@/core/domain/types/scanner";
import type {
  FoundationChecklistItem,
  FoundationPositionView,
  IncomeOverlayData,
  IncomeOverlaySettings,
  IncomeOverlaySummary,
} from "@/core/domain/types/income";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { scaleMaxRiskForRemaining } from "@/core/calculations/options/contract-tracking";
import { isFoundationStrategy, isSellCallIncomeStrategy } from "./strategies";
import {
  buildIncomeCyclesForTicker,
  calculateRecoveryPct,
  deriveRecoveryPhase,
  deriveSellCallRecommendation,
  sumLifetimePremiumUsd,
  sumMonthlyPremiumUsd,
} from "./income-cycles";
import {
  calculateFoundationTriggerPrice,
  deriveDistanceToTriggerUsd,
  deriveIncomeDecisionStatus,
  deriveTriggerStatusLabel,
  evaluateSellCallTimingRules,
  incomeDecisionLabel,
} from "./sell-call-window";

export interface BuildIncomeOverlayInput {
  openRows: OptionsOpenTradeRow[];
  closedRows: OptionsClosedTradeRow[];
  scannerRun: ScannerScanRun | null;
  settings: IncomeOverlaySettings;
  asOf?: Date;
}

function indexScannerResults(
  scannerRun: ScannerScanRun | null
): Map<string, ScannerTickerResult> {
  const map = new Map<string, ScannerTickerResult>();
  for (const result of scannerRun?.results ?? []) {
    map.set(normalizeTicker(result.ticker), result);
  }
  return map;
}

function selectFoundationRow(
  openRows: OptionsOpenTradeRow[],
  ticker: string,
  minFoundationDte: number
): OptionsOpenTradeRow | null {
  const normalized = normalizeTicker(ticker);
  const candidates = openRows.filter(
    (row) =>
      normalizeTicker(row.trade.underlying) === normalized &&
      isFoundationStrategy(row.trade.strategy) &&
      row.trade.status === "open" &&
      row.daysToExpiration >= minFoundationDte
  );

  if (candidates.length === 0) return null;

  return [...candidates].sort((a, b) => b.daysToExpiration - a.daysToExpiration)[0];
}

function findActiveSellCallRow(
  openRows: OptionsOpenTradeRow[],
  ticker: string
): OptionsOpenTradeRow | null {
  const normalized = normalizeTicker(ticker);
  return (
    openRows.find(
      (row) =>
        normalizeTicker(row.trade.underlying) === normalized &&
        isSellCallIncomeStrategy(row.trade.strategy)
    ) ?? null
  );
}

function buildFoundationChecklist(
  foundationRow: OptionsOpenTradeRow | null,
  activeSellCallRow: OptionsOpenTradeRow | null,
  minFoundationDte: number
): FoundationChecklistItem[] {
  return [
    {
      id: "exists",
      label: "Foundation Position Exists",
      pass: foundationRow != null,
    },
    {
      id: "open",
      label: "Foundation Position OPEN",
      pass: foundationRow?.trade.status === "open",
    },
    {
      id: "dte",
      label: `Remaining DTE > ${minFoundationDte} Days`,
      pass: foundationRow != null && foundationRow.daysToExpiration > minFoundationDte,
    },
    {
      id: "no_active_call",
      label: "No ACTIVE SELL CALL linked to this Foundation Position",
      pass: activeSellCallRow == null,
    },
  ];
}

function buildFoundationView(
  ticker: string,
  foundationRow: OptionsOpenTradeRow,
  openRows: OptionsOpenTradeRow[],
  closedRows: OptionsClosedTradeRow[],
  scannerResult: ScannerTickerResult | null,
  settings: IncomeOverlaySettings,
  asOf: Date
): FoundationPositionView {
  const activeSellCallRow = findActiveSellCallRow(openRows, ticker);
  const foundationChecklist = buildFoundationChecklist(
    foundationRow,
    activeSellCallRow,
    settings.minFoundationDte
  );
  const foundationChecklistPass = foundationChecklist.every((item) => item.pass);

  const currentPriceUsd =
    foundationRow.dashboard.currentPriceUsd ??
    foundationRow.underlyingPrice.priceUsd;
  const foundationBreakevenUsd = foundationRow.dashboard.breakevenPriceUsd;
  const callBreakevenUsd = activeSellCallRow?.dashboard.breakevenPriceUsd ?? null;

  const avgPriceUsd =
    foundationRow.scannerIndicators?.avgPrice ??
    scannerResult?.indicators.avgPrice ??
    null;
  const avgPricePrevUsd =
    foundationRow.scannerIndicators?.avgPricePrev ??
    scannerResult?.indicators.avgPricePrev ??
    null;
  const atr14 =
    foundationRow.scannerIndicators?.atr14 ?? scannerResult?.indicators.atr14 ?? null;

  const windowInput = {
    foundationChecklistPass,
    currentPriceUsd,
    foundationBreakevenUsd,
    atr14,
    atrMultiplier: settings.foundationTriggerAtrMultiplier,
    avgPriceUsd,
    avgPricePrevUsd,
  };

  const timingRules = evaluateSellCallTimingRules(windowInput);
  const decisionStatus = deriveIncomeDecisionStatus(windowInput);
  const foundationTriggerPriceUsd = calculateFoundationTriggerPrice(
    foundationBreakevenUsd,
    atr14,
    settings.foundationTriggerAtrMultiplier
  );

  const incomeCycles = buildIncomeCyclesForTicker(ticker, openRows, closedRows);
  const lifetimePremiumUsd = sumLifetimePremiumUsd(incomeCycles);
  const monthlyPremiumUsd = sumMonthlyPremiumUsd(incomeCycles, asOf);
  const foundationMaxRiskUsd = scaleMaxRiskForRemaining(foundationRow.trade);
  const recoveryPct = calculateRecoveryPct(lifetimePremiumUsd, foundationMaxRiskUsd);
  const recoveryPhase = deriveRecoveryPhase(recoveryPct);

  return {
    ticker,
    foundationRow,
    activeSellCallRow,
    scannerCandles: scannerResult?.recentCandles ?? [],
    currentPriceUsd,
    avgPriceUsd,
    avgPricePrevUsd,
    atr14,
    foundationBreakevenUsd,
    callBreakevenUsd,
    foundationMaxRiskUsd,
    foundationDte: foundationRow.daysToExpiration,
    foundationChecklist,
    foundationChecklistPass,
    timingRules,
    foundationTriggerPriceUsd,
    distanceToTriggerUsd: deriveDistanceToTriggerUsd(
      currentPriceUsd,
      foundationTriggerPriceUsd
    ),
    triggerStatusLabel: deriveTriggerStatusLabel(
      currentPriceUsd,
      foundationTriggerPriceUsd
    ),
    decisionStatus,
    decisionLabel: incomeDecisionLabel(decisionStatus),
    recoveryPct,
    recoveryPhase,
    lifetimePremiumUsd,
    monthlyPremiumUsd,
    incomeCycles,
    activeRecommendation: activeSellCallRow
      ? deriveSellCallRecommendation(activeSellCallRow.dashboard.tradeHealth)
      : null,
  };
}

export function buildIncomeOverlayData(
  input: BuildIncomeOverlayInput
): IncomeOverlayData {
  const asOf = input.asOf ?? new Date();
  const scannerByTicker = indexScannerResults(input.scannerRun);

  const foundationTickers = new Set<string>();
  for (const row of input.openRows) {
    if (
      isFoundationStrategy(row.trade.strategy) &&
      row.trade.status === "open" &&
      row.daysToExpiration >= input.settings.minFoundationDte
    ) {
      foundationTickers.add(normalizeTicker(row.trade.underlying));
    }
  }

  const foundations = [...foundationTickers]
    .sort((a, b) => a.localeCompare(b))
    .map((ticker) => {
      const foundationRow = selectFoundationRow(
        input.openRows,
        ticker,
        input.settings.minFoundationDte
      );
      if (!foundationRow) return null;
      return buildFoundationView(
        ticker,
        foundationRow,
        input.openRows,
        input.closedRows,
        scannerByTicker.get(ticker) ?? null,
        input.settings,
        asOf
      );
    })
    .filter((view): view is FoundationPositionView => view != null);

  const summary = buildIncomeOverlaySummary(foundations, asOf);

  return {
    settings: input.settings,
    summary,
    foundations,
  };
}

function buildIncomeOverlaySummary(
  foundations: FoundationPositionView[],
  asOf: Date
): IncomeOverlaySummary {
  const lifetimePremiumUsd = foundations.reduce(
    (sum, foundation) => sum + foundation.lifetimePremiumUsd,
    0
  );
  const monthlyPremiumUsd = foundations.reduce(
    (sum, foundation) => sum + foundation.monthlyPremiumUsd,
    0
  );
  const totalFoundationRiskUsd = foundations.reduce(
    (sum, foundation) => sum + foundation.foundationMaxRiskUsd,
    0
  );
  const aggregateRecoveryPct = calculateRecoveryPct(
    lifetimePremiumUsd,
    totalFoundationRiskUsd
  );

  return {
    foundationCount: foundations.length,
    sellCallWindowsOpenCount: foundations.filter(
      (foundation) => foundation.decisionStatus === "sell_call_window_open"
    ).length,
    coveredPositionCount: foundations.filter(
      (foundation) => foundation.activeSellCallRow != null
    ).length,
    activeIncomeCycleCount: foundations.filter(
      (foundation) => foundation.activeSellCallRow != null
    ).length,
    monthlyPremiumUsd,
    lifetimePremiumUsd,
    aggregateRecoveryPct,
    aggregateRecoveryPhase: deriveRecoveryPhase(aggregateRecoveryPct),
  };
}
