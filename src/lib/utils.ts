import { Filters, SalesRecord, AdsRecord } from "./types"

export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

function getDateRange(preset: string, startDate: string, endDate: string): [string, string] {
  const today = "2026-04-06"
  const d = new Date(today)
  switch (preset) {
    case "today": return [today, today]
    case "yesterday": { const y = new Date(d); y.setDate(y.getDate() - 1); return [y.toISOString().split("T")[0], y.toISOString().split("T")[0]] }
    case "last7d": { const s = new Date(d); s.setDate(s.getDate() - 6); return [s.toISOString().split("T")[0], today] }
    case "last30d": { const s = new Date(d); s.setDate(s.getDate() - 29); return [s.toISOString().split("T")[0], today] }
    case "custom": return [startDate || "2026-03-08", endDate || today]
    default: return ["2026-03-08", today]
  }
}

export function filterSales(data: SalesRecord[], filters: Filters): SalesRecord[] {
  const [start, end] = getDateRange(filters.datePreset, filters.startDate, filters.endDate)
  return data.filter((r) => {
    if (r.date < start || r.date > end) return false
    if (filters.platform && r.platform !== filters.platform) return false
    if (filters.store && r.store !== filters.store) return false
    if (filters.search) {
      const s = filters.search.toLowerCase()
      if (!r.isku.toLowerCase().includes(s) && !r.productName.toLowerCase().includes(s)) return false
    }
    return true
  })
}

export function filterAds(data: AdsRecord[], filters: Filters): AdsRecord[] {
  const [start, end] = getDateRange(filters.datePreset, filters.startDate, filters.endDate)
  return data.filter((r) => {
    if (r.date < start || r.date > end) return false
    if (filters.platform && r.platform !== filters.platform) return false
    if (filters.store && r.store !== filters.store) return false
    if (filters.search) {
      const s = filters.search.toLowerCase()
      if (!r.isku.toLowerCase().includes(s) && !r.productName.toLowerCase().includes(s) && !r.campaignName.toLowerCase().includes(s)) return false
    }
    return true
  })
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n)
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

export function formatDecimal(n: number): string {
  return n.toFixed(2)
}
