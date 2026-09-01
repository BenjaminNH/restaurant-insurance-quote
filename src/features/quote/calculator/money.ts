export function roundCny(value: number): number {
  return Math.floor(value + 0.5);
}

export function formatCny(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(roundCny(value));
}
