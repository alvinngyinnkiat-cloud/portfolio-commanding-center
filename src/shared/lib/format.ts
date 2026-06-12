export function formatSgd(value: number, decimals = 2): string {
  return `S$${value.toLocaleString("en-SG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatUsd(value: number, decimals = 2): string {
  return `US$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toLocaleString("en-SG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
