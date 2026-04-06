"use client"
import { useState, useMemo } from "react"
import { salesData } from "@/lib/mock-data"
import { filterSales, formatCurrency, formatNumber } from "@/lib/utils"
import { Filters } from "@/lib/types"
import FilterBar from "@/components/FilterBar"
import { ArrowUpDown } from "lucide-react"

type SortKey = "date" | "store" | "platform" | "isku" | "productName" | "orders" | "unitsSold" | "revenue"

export default function SalesPage() {
  const [filters, setFilters] = useState<Filters>({ datePreset: "last30d", startDate: "", endDate: "", platform: "", store: "", search: "" })
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(0)
  const perPage = 25

  const filtered = useMemo(() => filterSales(salesData, filters), [filters])
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

  const totalRevenue = filtered.reduce((s, r) => s + r.revenue, 0)
  const totalOrders = filtered.reduce((s, r) => s + r.orders, 0)
  const totalUnits = filtered.reduce((s, r) => s + r.unitsSold, 0)

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="table-header py-3 px-2 cursor-pointer select-none" onClick={() => toggleSort(k)}>
      <div className={`flex items-center gap-1 ${typeof salesData[0]?.[k] === "number" ? "justify-end" : ""}`}>
        {label}<ArrowUpDown className="w-3 h-3 text-gray-300" />
      </div>
    </th>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <p className="text-sm text-gray-500 mt-1">Detailed sales records across all stores and platforms</p>
      </div>

      <FilterBar filters={filters} onChange={(f) => { setFilters(f); setPage(0) }} />

      <div className="grid grid-cols-3 gap-4">
        <div className="card card-body"><p className="text-xs font-medium text-gray-500">Filtered Revenue</p><p className="text-xl font-bold mt-1">{formatCurrency(totalRevenue)}</p></div>
        <div className="card card-body"><p className="text-xs font-medium text-gray-500">Filtered Orders</p><p className="text-xl font-bold mt-1">{formatNumber(totalOrders)}</p></div>
        <div className="card card-body"><p className="text-xs font-medium text-gray-500">Filtered Units</p><p className="text-xl font-bold mt-1">{formatNumber(totalUnits)}</p></div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Sales Records</h3>
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
                <SortHeader label="Product Name" k="productName" />
                <SortHeader label="Orders" k="orders" />
                <SortHeader label="Units Sold" k="unitsSold" />
                <SortHeader label="Revenue" k="revenue" />
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, i) => (
                <tr key={`${r.date}-${r.store}-${r.isku}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-2 text-xs text-gray-600">{r.date}</td>
                  <td className="py-2.5 px-2 text-xs">{r.store}</td>
                  <td className="py-2.5 px-2"><span className="badge bg-gray-100 text-gray-700">{r.platform}</span></td>
                  <td className="py-2.5 px-2 font-mono text-xs font-medium text-brand-600">{r.isku}</td>
                  <td className="py-2.5 px-2 text-xs">{r.productName}</td>
                  <td className="py-2.5 px-2 text-right">{r.orders}</td>
                  <td className="py-2.5 px-2 text-right">{r.unitsSold}</td>
                  <td className="py-2.5 px-2 text-right font-medium">{formatCurrency(r.revenue)}</td>
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
