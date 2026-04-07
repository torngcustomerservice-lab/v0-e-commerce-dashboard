"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { SalesRecord } from "@/lib/types";
import { Search } from "lucide-react";

/* ── date helpers ── */
function parseDate(raw: string): Date | null {
  try {
    const [datePart] = raw.split(" ");
    const [m, d, y] = datePart.split("/").map(Number);
    return new Date(y, m - 1, d);
  } catch { return null; }
}
function todayStart() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function yesterdayRange(): [Date, Date] {
  const s = todayStart(); s.setDate(s.getDate() - 1);
  const e = todayStart(); e.setMilliseconds(-1);
  return [s, e];
}

export default function SalesPage() {
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("All");
  const [store, setStore] = useState("All");
  const [datePreset, setDatePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    async function fetchAllSales() {
      setLoading(true);
      const pageSize = 1000;
      let allData: SalesRecord[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("sales_tracking").select("*").order("date", { ascending: false }).range(from, from + pageSize - 1);
        if (error || !data) break;
        allData = allData.concat(data);
        hasMore = data.length === pageSize;
        from += pageSize;
      }
      setSales(allData);
      setLoading(false);
    }
    fetchAllSales();
  }, []);

  const platforms = useMemo(() => ["All", ...Array.from(new Set(sales.map(s => s.platform)))], [sales]);
  const stores = useMemo(() => {
    const f = platform === "All" ? sales : sales.filter(s => s.platform === platform);
    return ["All", ...Array.from(new Set(f.map(s => s.store_name)))];
  }, [sales, platform]);

  const dateFilter = useCallback((dateStr: string) => {
    if (datePreset === "all") return true;
    const d = parseDate(dateStr);
    if (!d) return true;
    if (datePreset === "today") return d >= todayStart();
    if (datePreset === "yesterday") { const [s, e] = yesterdayRange(); return d >= s && d <= e; }
    if (datePreset === "7d") { const c = new Date(); c.setDate(c.getDate() - 7); c.setHours(0,0,0,0); return d >= c; }
    if (datePreset === "30d") { const c = new Date(); c.setDate(c.getDate() - 30); c.setHours(0,0,0,0); return d >= c; }
    if (datePreset === "custom" && customFrom && customTo) {
      const from = new Date(customFrom + "T00:00:00");
      const to = new Date(customTo + "T23:59:59");
      return d >= from && d <= to;
    }
    return true;
  }, [datePreset, customFrom, customTo]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = sales;
    result = result.filter(r => dateFilter(r.date));
    if (platform !== "All") result = result.filter(r => r.platform === platform);
    if (store !== "All") result = result.filter(r => r.store_name === store);
    if (q) result = result.filter(r =>
      r.sku.toLowerCase().includes(q) || r.product_name.toLowerCase().includes(q)
    );
    return result;
  }, [sales, search, platform, store, dateFilter]);

  const totalRevenue = filtered.reduce((s, r) => s + Number(r.revenue), 0);
  const totalUnits = filtered.reduce((s, r) => s + Number(r.units_sold), 0);
  const uniqueOrders = new Set(filtered.filter(r => r.order_id != null).map(r => String(r.order_id)));
  const totalOrders = uniqueOrders.size;

  const fmt = (n: number) => "RM " + n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-500 text-lg">Loading sales data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length.toLocaleString()} records — Revenue: {fmt(totalRevenue)} · Units: {totalUnits.toLocaleString()} · Orders: {totalOrders.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={datePreset} onChange={e => setDatePreset(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="custom">Custom Range</option>
        </select>
        {datePreset === "custom" && (
          <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </>
        )}
        <select value={platform} onChange={e => { setPlatform(e.target.value); setStore("All"); }}
          className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          {platforms.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={store} onChange={e => setStore(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          {stores.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search iSKU or product..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      {/* Table — All records */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                {["#", "Date", "Store", "Platform", "iSKU", "Product Name", "Order ID", "Orders", "Units Sold", "Revenue", "Discounts", "Net Sales"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r, i) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{r.date}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-700">{r.store_name}</td>
                  <td className="px-4 py-2.5 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      r.platform === "Shopee" ? "bg-orange-50 text-orange-700" :
                      r.platform === "Shopee SG" ? "bg-orange-50 text-orange-600" :
                      r.platform === "TikTok Shop" ? "bg-gray-900 text-white" :
                      "bg-blue-50 text-blue-700"
                    }`}>{r.platform}</span>
                  </td>
                  <td className="px-4 py-2.5 text-sm font-mono font-medium text-gray-900">{r.sku}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 max-w-[200px] truncate">{r.product_name}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 font-mono">{r.order_id ?? "—"}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{Number(r.orders)}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{Number(r.units_sold)}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900 text-right">{fmt(Number(r.revenue))}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{fmt(Number(r.discounts))}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{fmt(Number(r.net_sales))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center px-4 py-3 border-t bg-gray-50">
          <p className="text-sm text-gray-500">Showing all {filtered.length.toLocaleString()} records</p>
        </div>
      </div>
    </div>
  );
}
