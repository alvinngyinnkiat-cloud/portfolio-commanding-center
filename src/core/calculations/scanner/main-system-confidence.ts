import type {
  MainSystemDisplay,
  ScannerTrend,
} from "@/core/domain/types/scanner";

export type MainSystemConfidence = "HIGH" | "MEDIUM" | "LOW / COUNTER-STRUCTURE";

export const MAIN_SYSTEM_CONFIDENCE_RANK: Record<MainSystemConfidence, number> = {
  HIGH: 0,
  MEDIUM: 1,
  "LOW / COUNTER-STRUCTURE": 2,
};

export function deriveSellPutConfidence(
  marketStructure: ScannerTrend
): MainSystemConfidence {
  if (marketStructure === "Bullish") return "HIGH";
  if (marketStructure === "Neutral") return "MEDIUM";
  return "LOW / COUNTER-STRUCTURE";
}

export function deriveSellCallConfidence(
  marketStructure: ScannerTrend
): MainSystemConfidence {
  if (marketStructure === "Bearish") return "HIGH";
  if (marketStructure === "Neutral") return "MEDIUM";
  return "LOW / COUNTER-STRUCTURE";
}

export function deriveMainSystemConfidence(
  output: MainSystemDisplay["output"],
  marketStructure: ScannerTrend
): MainSystemConfidence | null {
  if (output === "SELL PUT") {
    return deriveSellPutConfidence(marketStructure);
  }
  if (output === "SELL CALL") {
    return deriveSellCallConfidence(marketStructure);
  }
  return null;
}

export function buildCounterStructureWarning(
  output: MainSystemDisplay["output"],
  marketStructure: ScannerTrend
): string | null {
  if (output === "SELL PUT" && marketStructure === "Bearish") {
    return "Directional setup conflicts with Bearish Structure.";
  }
  if (output === "SELL CALL" && marketStructure === "Bullish") {
    return "Directional setup conflicts with Bullish Structure.";
  }
  return null;
}
