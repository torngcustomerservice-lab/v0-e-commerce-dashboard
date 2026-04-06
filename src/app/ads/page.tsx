"use client"
import { useState, useMemo } from "react"
import { adsData } from "@/lib/mock-data"
import { filterAds, formatCurrency, formatNumber, formatDecimal } from "@/lib/utils"
import { Filters } from "@/lib/types"
import FilterBar from "@/components/FilterBar"
import KpiCard from "@/components/KpiCard"
import { Megaphone, DollarSign, ShoppingCart, Package, MousePointerClick, BarChart3, ArrowUpDown } from "lucide-react"

type SortKey = "date" | "store" | "platform" | "isku" | "campaignName" | "adsSpend" | "adsSales" | "ordersAds" | "unitsSoldAds" | "ctr" | "cpc" | "cpm" | "roas"

export default function AdsPage() {
  const [filters, setFilters] = useState<Filters>({ datePreset: "last30d", startDate: "", endDate: "", platform: "", store: "", search: "" })
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(0)
  const perPage = 25

  const filtered = useMemo(() => filterAds(adsData, filters), [filters])
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      const cmp = typeof av === "number" ? (av as number) - (bv as number) : String(av).localeCompare(String(bv))
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / perPage)
  const pageData = sorted.slice(page * perPage, (page + 1) * perPage)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
    setPage(0)
  }

  const totalSpend = filtered.reduce((s, r) => s + r.adsSpend, 0)
  const totalAdsSales = filtered.reduce((s, r) => s + r.adsSales, 0)
  const totalAdsOrders = filtered.reduce((s, r) => s + r.ordersAds, 0)
  const totalAdsUnits = filtered.reduce((s, r) => s + r.unitsSoldAds, 0)
  const totalClicks = filtered.reduce((s, r) => s + r.clicks, 0)
  const totalImpressions = filtered.reduce((s, r) => s + r.impressions, 0)
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const overallRoas = totalSpend > 0 ? totalAdsSales / totalSpend : 0

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="table-header py-3 px-2 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(k)}>
      <div className={`flex items-center gap-1 ${typeof adsData[0]?.[k] === "number" ? "justify-end" : ""}`}>
        {label}<ArrowUpDown className="w-3 h-3 text-gray-300" />
      </div>
    </th>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ads Performance</h1>
        <p className="text-sm text-gray-500 mt-1">Track advertising spend and returns across all campaigns</p>
      </div>

      <FilterBar filters={filters} onChange={(f) => { setFilters(f); setPage(0) }} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Ads Spend" value={formatCurrency(totalSpend)} icon={Megaphone} color="red" />
        <KpiCard title="Ads Sales" value={formatCurrency(totalAdsSales)} icon={DollarSign} color="green" />
        <KpiCard title="Ads Orders" value={formatNumber(totalAdsOrders)} icon={ShoppingCart} color="blue" />
        <KpiCard title="Ads Units" value={formatNumber(totalAdsUnits)} icon={Package} color="purple" />
        <KpiCard title="Avg CTR" value={avgCtr.toFixed(2) + "%"} icon={MousePointerClick} color="cyan" />
        <KpiCard title="ROAS" value={formatDecimal(overallRoas) + "x"} icon={BarChart3} color="orange" />
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Ads Records</h3>
          <span className="text-xs text-gray-400">{formatNumber(sorted.length)} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <SortHeader label="Date" k="date" />
                <SortHeader label="Store" k="store" />
                <SortHeader label="Platform" k="platform" />
                <SortHeader label="iSKU" k="isku" />
                <SortHeader label="Campaign" k="campaignName" />
                <SortHeader label="Spend" k="adsSpend" />
                <SortHeader label="Sales" k="adsSales" />
                <SortHeader label="Orders" k="ordersAds" />
                <SortHeader label="Units" k="unitsSoldAds" />
                <SortHeader label="CTR" k="ctr" />
                <SortHeader label="CPC" k="cpc" />
                <SortHeader label="CPM" k="cpm" />
                <SortHeader label="ROAS" k="roas" />
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, i) => (
                <tr key={`${r.date}-${r.store}-${r.isku}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-2 text-xs text-gray-600">{r.date}</td>
                  <td className="py-2.5 px-2 text-xs">{r.store}</td>
                  <td className="py-2.5 px-2"><span className="badge bg-gray-100 text-gray-700">{r.platform}</span></td>
                  <td className="py-2.5 px-2 font-mono text-xs font-medium text-brand-600">{r.isku}</td>
                  <td className="py-2.5 px-2 text-xs max-w-[200px] truncate">{r.campaignName}</td>
                  <td className="py-2.5 px-2 text-right text-xs">{formatCurrency(r.adsSpend)}</td>
                  <td className="py-2.5 px-2 text-right text-xs">{formatCurrency(r.adsSales)}</td>
                  <td className="py-2.5 px-2 text-right text-xs">{r.ordersAds}</td>
                  <td className="py-2.5 px-2 text-right text-xs">{r.unitsSoldAds}</td>
                  <td className="py-2.5 px-2 text-right text-xs">{r.ctr}%</td>
                  <td className="py-2.5 px-2 text-right text-xs">${r.cpc}</td>
                  <td className="py-2.5 px-2 text-right text-xs">${r.cpm}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`font-semibold text-xs ${r.roas >= 3 ? "text-green-600" : r.roas >= 1 ? "text-yellow-600" : "text-red-600"}`}>
                      {r.roas.toFixed(2)}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="card-body border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-primary text-xs disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="btn-primary text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
