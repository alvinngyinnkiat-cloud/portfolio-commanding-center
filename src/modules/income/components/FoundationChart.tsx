import type { ScannerCandleBar } from "@/core/domain/types/scanner";
import { FiveDayCandlestickChart } from "@/modules/scanner/components/FiveDayCandlestickChart";

interface FoundationChartProps {
  candles: ScannerCandleBar[];
  avgPrice: number | null;
  currentPriceUsd: number | null;
  foundationBreakevenUsd: number | null;
  callBreakevenUsd: number | null;
}

interface HorizontalGuide {
  price: number;
  color: string;
  label: string;
}

export function FoundationChart({
  candles,
  avgPrice,
  currentPriceUsd,
  foundationBreakevenUsd,
  callBreakevenUsd,
}: FoundationChartProps) {
  if (candles.length === 0) {
    return (
      <FiveDayCandlestickChart
        candles={[]}
        avgPrice={avgPrice}
        sellPutZone={null}
        sellCallZone={null}
        icMidZone={null}
      />
    );
  }

  const width = 320;
  const height = 180;
  const padding = { top: 14, right: 72, bottom: 8, left: 8 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const avgSeries = candles.map(
    (bar) => bar.avgPrice ?? (bar.high + bar.low) / 2
  );

  const guides: HorizontalGuide[] = [];
  if (currentPriceUsd != null) {
    guides.push({ price: currentPriceUsd, color: "#0f172a", label: "Current Price" });
  }
  if (foundationBreakevenUsd != null) {
    guides.push({
      price: foundationBreakevenUsd,
      color: "#22c55e",
      label: "Foundation BE",
    });
  }
  if (callBreakevenUsd != null) {
    guides.push({ price: callBreakevenUsd, color: "#ef4444", label: "Call BE" });
  }

  const zoneLevels = [
    avgPrice,
    ...avgSeries,
    ...guides.map((guide) => guide.price),
  ].filter((value): value is number => value != null);

  const priceMin = Math.min(...candles.map((bar) => bar.low), ...zoneLevels);
  const priceMax = Math.max(...candles.map((bar) => bar.high), ...zoneLevels);
  const range = priceMax - priceMin || 1;

  const toY = (price: number) =>
    padding.top + ((priceMax - price) / range) * chartHeight;

  return (
    <div className="relative w-full">
      <FiveDayCandlestickChart
        candles={candles}
        avgPrice={avgPrice}
        sellPutZone={null}
        sellCallZone={null}
        icMidZone={null}
      />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="pointer-events-none absolute inset-0 h-44 w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {guides.map((guide) => {
          const y = toY(guide.price);
          return (
            <g key={guide.label}>
              <line
                x1={padding.left}
                x2={width - padding.right + 56}
                y1={y}
                y2={y}
                stroke={guide.color}
                strokeWidth={guide.label === "Current Price" ? 2 : 1.5}
                strokeDasharray={guide.label === "Current Price" ? undefined : "5 4"}
              />
              <text
                x={width - padding.right + 60}
                y={y + 3}
                fill={guide.color === "#0f172a" ? "#e2e8f0" : guide.color}
                fontSize={9}
                fontWeight={600}
              >
                {guide.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
