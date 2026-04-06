export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

export function formatCurrency(n: number): string {
  return "RM " + n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-MY").format(n)
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

export function formatDecimal(n: number): string {
  return n.toFixed(2)
}
