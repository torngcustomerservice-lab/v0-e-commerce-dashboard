"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { SalesRecord, SkuMaster } from "@/lib/types";
import { Search, ArrowUpDown } from "lucide-react";

/* ── helpers ── */
function normalizeSku(sku: string): string {
  if (/^\d+$/.test(sku)) return sku.padStart(4, "0");
  return sku;
}

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

const VALID_STATUS = ["Completed", "Shipped"];

type SortKey = "orders" | "units_sold" | "revenue" | "avg_selling_price" | "master_selling_price" | "price_diff" | "cancelled_orders" | "returned_orders";
type SortDir = "asc" | "desc";
type StatusView = "completed" | "cancelled" | "returned";

interface SkuSummary {
  sku: string;
  product_name: string;
  orders: number;
  units_sold: number;
  revenue: number;
  discounts: number;
  net_sales: number;
  avg_selling_price: number;
  master_selling_price: number | null;
  price_diff: number | null;
  platforms: string[];
  stores: string[];
  cancelled_orders: number;
  cancelled_units: number;
  returned_orders: number;
  returned_units: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [skuMaster, setSkuMaster] = useState<Record<string, SkuMaster>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("All");
  const [store, setStore] = useState("All");
  const [datePreset, setDatePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusView, setStatusView] = useState<StatusView>("completed");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  /* batch fetch helper */
  const fetchAllRows = useCallback(async (table: string) => {
    const pageSize = 1000;
    let all: Record<string, unknown>[] = [];
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase.from(table).select("*").range(from, from + pageSize - 1);
      if (error || !data) break;
      all = all.concat(data);
      hasMore = data.length === pageSize;
      from += pageSize;
    }
    return all;
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [salesData, skuData] = await Promise.all([
        fetchAllRows("sales_tracking"),
        fetchAllRows("sku_master"),
      ]);
      setSales(salesData as unknown as SalesRecord[]);
      /* build SKU master lookup by sku_code */
      const lookup: Record<string, SkuMaster> = {};
      (skuData as unknown as SkuMaster[]).forEach(s => { lookup[s.sku_code] = s; });
      setSkuMaster(lookup);
      setLoading(false);
    }
    load();
  }, [fetchAllRows]);

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

  /* filtered by date/platform/store/search */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = sales;
    result = result.filter(r => dateFilter(r.date));
    if (platform !== "All") result = result.filter(r => r.platform === platform);
    if (store !== "All") result = result.filter(r => r.store_name === store);
    if (q) result = result.filter(r =>
      normalizeSku(r.sku).toLowerCase().includes(q) || r.product_name.toLowerCase().includes(q)
    );
    return result;
  }, [sales, search, platform, store, dateFilter]);

  /* group by normalized SKU */
  const skuSummaries = useMemo(() => {
    const map: Record<string, {
      sku: string; product_name: string;
      orderIds: Set<string>; units_sold: number; revenue: number; discounts: number; net_sales: number;
      platforms: Set<string>; stores: Set<string>;
      cancelledIds: Set<string>; cancelledUnits: number;
      returnedIds: Set<string>; returnedUnits: number;
    }> = {};

    filtered.forEach(r => {
      const nsku = normalizeSku(r.sku);
      if (!map[nsku]) {
        map[nsku] = {
          sku: nsku, product_name: r.product_name,
          orderIds: new Set(), units_sold: 0, revenue: 0, discounts: 0, net_sales: 0,
          platforms: new Set(), stores: new Set(),
          cancelledIds: new Set(), cancelledUnits: 0,
          returnedIds: new Set(), returnedUnits: 0,
        };
      }
      const entry = map[nsku];
      const oid = r.order_id != null ? String(r.order_id) : null;
      const status = r.order_status || "";

      if (VALID_STATUS.includes(status)) {
        if (oid) entry.orderIds.add(oid);
        entry.units_sold += Number(r.units_sold);
        entry.revenue += Number(r.revenue);
        entry.discounts += Number(r.discounts);
        entry.net_sales += Number(r.net_sales);
      } else if (status === "Cancelled") {
        if (oid) entry.cancelledIds.add(oid);
        entry.cancelledUnits += Number(r.units_sold);
      } else if (status === "Returned") {
        if (oid) entry.returnedIds.add(oid);
        entry.returnedUnits += Number(r.units_sold);
      }
      entry.platforms.add(r.platform);
      entry.stores.add(r.store_name);
    });

    const arr = Object.values(map).map(e => {
      const avgSP = e.units_sold > 0 ? e.revenue / e.units_sold : 0;
      const master = skuMaster[e.sku];
      const masterSP = master && Number(master.selling_price) > 0 ? Number(master.selling_price) : null;
      return {
        sku: e.sku,
        product_name: e.product_name,
        orders: e.orderIds.size,
        units_sold: e.units_sold,
        revenue: e.revenue,
        discounts: e.discounts,
        net_sales: e.net_sales,
        avg_selling_price: avgSP,
        master_selling_price: masterSP,
        price_diff: masterSP != null && avgSP > 0 ? ((avgSP - masterSP) / masterSP) * 100 : null,
        platforms: Array.from(e.platforms),
        stores: Array.from(e.stores),
        cancelled_orders: e.cancelledIds.size,
        cancelled_units: e.cancelledUnits,
        returned_orders: e.returnedIds.size,
        returned_units: e.returnedUnits,
      } as SkuSummary;
    });

    /* sort */
    arr.sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });

    return arr;
  }, [filtered, skuMaster, sortKey, sortDir]);

  /* totals */
  const totalRevenue = skuSummaries.reduce((s, r) => s + r.revenue, 0);
  const totalUnits = skuSummaries.reduce((s, r) => s + r.units_sold, 0);
  const totalOrders = new Set(
    filtered.filter(r => r.order_id != null && VALID_STATUS.includes(r.order_status || "")).map(r => String(r.order_id))
  ).size;
  const totalCancelledOrders = new Set(
    filtered.filter(r => r.order_id != null && r.order_status === "Cancelled").map(r => String(r.order_id))
  ).size;
  const totalCancelledUnits = skuSummaries.reduce((s, r) => s + r.cancelled_units, 0);
  const totalReturnedOrders = new Set(
    filtered.filter(r => r.order_id != null && r.order_status === "Returned").map(r => String(r.order_id))
  ).size;
  const totalReturnedUnits = skuSummaries.reduce((s, r) => s + r.returned_units, 0);

  const fmt = (n: number) => "RM " + n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none whitespace-nowrap bg-gray-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={sortKey === field ? "text-blue-600" : "text-gray-300"} />
      </div>
    </th>
  );

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales by iSKU</h1>
        <p className="text-sm text-gray-500 mt-1">{skuSummaries.length.toLocaleString()} SKUs</p>
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

      {/* Order Status Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { value: "completed", label: "Completed + Shipped", count: totalOrders },
          { value: "cancelled", label: "Cancelled", count: totalCancelledOrders },
          { value: "returned", label: "Returned", count: totalReturnedOrders },
        ] as { value: StatusView; label: string; count: number }[]).map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusView(tab.value)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              statusView === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label} <span className="text-xs text-gray-400">({tab.count.toLocaleString()})</span>
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Revenue</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{fmt(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Orders</p>
          <p className="text-xl font-bold text-green-600 mt-1">{totalOrders.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Units Sold</p>
          <p className="text-xl font-bold text-purple-600 mt-1">{totalUnits.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Cancelled Orders</p>
          <p className="text-xl font-bold text-red-600 mt-1">{totalCancelledOrders.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Cancelled Units</p>
          <p className="text-xl font-bold text-red-500 mt-1">{totalCancelledUnits.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Returned Orders</p>
          <p className="text-xl font-bold text-orange-600 mt-1">{totalReturnedOrders.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Returned Units</p>
          <p className="text-xl font-bold text-orange-500 mt-1">{totalReturnedUnits.toLocaleString()}</p>
        </div>
      </div>

      {/* Table — grouped by SKU */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">iSKU</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Product Name</th>
                {statusView === "completed" ? (
                  <>
                    <SortHeader label="Orders" field="orders" />
                    <SortHeader label="Units Sold" field="units_sold" />
                    <SortHeader label="Revenue" field="revenue" />
                    <SortHeader label="Avg Price" field="avg_selling_price" />
                    <SortHeader label="Master Price" field="master_selling_price" />
                    <SortHeader label="Diff %" field="price_diff" />
                    <SortHeader label="Cancelled" field="cancelled_orders" />
                    <SortHeader label="Returned" field="returned_orders" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Platforms</th>
                  </>
                ) : statusView === "cancelled" ? (
                  <>
                    <SortHeader label="Cancelled Orders" field="cancelled_orders" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Cancelled Units</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Platforms</th>
                  </>
                ) : (
                  <>
                    <SortHeader label="Returned Orders" field="returned_orders" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Returned Units</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Platforms</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {skuSummaries
                .filter(r => {
                  if (statusView === "cancelled") return r.cancelled_orders > 0;
                  if (statusView === "returned") return r.returned_orders > 0;
                  return true;
                })
                .map((r, i) => (
                <tr key={r.sku} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2.5 text-sm font-mono font-medium text-gray-900">{r.sku}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600 max-w-[220px] truncate">{r.product_name}</td>
                  {statusView === "completed" ? (
                    <>
                      <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{r.orders.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{r.units_sold.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-900 text-right">{fmt(r.revenue)}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{r.avg_selling_price > 0 ? fmt(r.avg_selling_price) : "—"}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{r.master_selling_price != null ? fmt(r.master_selling_price) : "—"}</td>
                      <td className="px-4 py-2.5 text-sm text-right">
                        {r.price_diff != null ? (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            r.price_diff > 5 ? "bg-green-50 text-green-700" :
                            r.price_diff < -5 ? "bg-red-50 text-red-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {r.price_diff > 0 ? "+" : ""}{r.price_diff.toFixed(1)}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-right">
                        {r.cancelled_orders > 0 ? (
                          <span className="text-red-600">{r.cancelled_orders} / {r.cancelled_units}u</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-right">
                        {r.returned_orders > 0 ? (
                          <span className="text-orange-600">{r.returned_orders} / {r.returned_units}u</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </>
                  ) : statusView === "cancelled" ? (
                    <>
                      <td className="px-4 py-2.5 text-sm text-red-600 text-right font-medium">{r.cancelled_orders.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-sm text-red-500 text-right">{r.cancelled_units.toLocaleString()}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 text-sm text-orange-600 text-right font-medium">{r.returned_orders.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-sm text-orange-500 text-right">{r.returned_units.toLocaleString()}</td>
                    </>
                  )}
                  <td className="px-4 py-2.5 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {r.platforms.map(p => (
                        <span key={p} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          p === "Shopee" ? "bg-orange-50 text-orange-700" :
                          p === "Shopee SG" ? "bg-orange-50 text-orange-600" :
                          p === "TikTok Shop" ? "bg-gray-900 text-white" :
                          "bg-blue-50 text-blue-700"
                        }`}>{p}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center px-4 py-3 border-t bg-gray-50">
          <p className="text-sm text-gray-500">Showing all {skuSummaries.length.toLocaleString()} SKUs</p>
        </div>
      </div>
    </div>
  );
}
