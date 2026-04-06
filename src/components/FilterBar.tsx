"use client"
import { Filters, DatePreset } from "@/lib/types"
import { platformList, storeList } from "@/lib/mock-data"
import { Search } from "lucide-react"

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  showSearch?: boolean
}

const datePresets: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7d", label: "Last 7 Days" },
  { value: "last30d", label: "Last 30 Days" },
  { value: "custom", label: "Custom" },
]

export default function FilterBar({ filters, onChange, showSearch = true }: Props) {
  const update = (partial: Partial<Filters>) => onChange({ ...filters, ...partial })
  const stores = filters.platform
    ? storeList.filter((s) => s.platform === filters.platform)
    : storeList

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {datePresets.map((p) => (
          <button key={p.value} onClick={() => update({ datePreset: p.value })}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filters.datePreset === p.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {filters.datePreset === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={filters.startDate} onChange={(e) => update({ startDate: e.target.value })} className="input-field text-xs" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={filters.endDate} onChange={(e) => update({ endDate: e.target.value })} className="input-field text-xs" />
        </div>
      )}

      <select value={filters.platform} onChange={(e) => update({ platform: e.target.value, store: "" })} className="input-field text-xs">
        <option value="">All Platforms</option>
        {platformList.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>

      <select value={filters.store} onChange={(e) => update({ store: e.target.value })} className="input-field text-xs">
        <option value="">All Stores</option>
        {stores.map((s) => <option key={s.store} value={s.store}>{s.store}</option>)}
      </select>

      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search iSKU or product..." value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="input-field pl-9 text-xs w-64" />
        </div>
      )}
    </div>
  )
}
