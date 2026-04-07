"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { SalesRecord, AdsRecord } from "@/lib/types";
import KpiCard from "@/components/KpiCard";
import {
  DollarSign, ShoppingCart, Package, Megaphone, TrendingUp, BarChart3, XCircle, RotateCcw,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

/* ── date helper ── */
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

export default function DashboardPage() {
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [ads, setAds] = useState<AdsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  /* filters */
  const [datePreset, setDatePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [platform, setPlatform] = useState("All");
  const [store, setStore] = useState("All");

  /* batch fetch all rows */
  const fetchAll = useCallback(async (table: string) => {
    const pageSize = 1000;
    let all: Record<string, unknown>[] = [];
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase.from(table).select("*").order("date", { ascending: false }).range(from, from + pageSize - 1);
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
      const [s, a] = await Promise.all([fetchAll("sales_tracking"), fetchAll("ads_performance")]);
      setSales(s as unknown as SalesRecord[]);
      setAds(a as unknown as AdsRecord[]);
      setLoading(false);
    }
    load();
  }, [fetchAll]);

  /* derived filter options */
  const platforms = useMemo(() => ["All", ...Array.from(new Set(sales.map(s => s.platform)))], [sales]);
  const stores = useMemo(() => {
    const f = platform === "All" ? sales : sales.filter(s => s.platform === platform);
    return ["All", ...Array.from(new Set(f.map(s => s.store_name)))];
  }, [sales, platform]);

  /* date filter logic */
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

  /* filtered data by date/platform/store */
  const allFiltered = useMemo(() => {
    let r = sales;
    r = r.filter(s => dateFilter(s.date));
    if (platform !== "All") r = r.filter(s => s.platform === platform);
    if (store !== "All") r = r.filter(s => s.store_name === store);
    return r;
  }, [sales, dateFilter, platform, store]);

  /* split by status */
  const completedSales = useMemo(() => allFiltered.filter(r => VALID_STATUS.includes(r.order_status || "")), [allFiltered]);
  const cancelledSales = useMemo(() => allFiltered.filter(r => r.order_status === "Cancelled"), [allFiltered]);
  const returnedSales = useMemo(() => allFiltered.filter(r => r.order_status === "Returned"), [allFiltered]);

  const filteredAds = useMemo(() => {
    let r = ads;
    r = r.filter(a => dateFilter(a.date));
    if (platform !== "All") r = r.filter(a => a.platform === platform);
    if (store !== "All") r = r.filter(a => a.store === store);
    return r;
  }, [ads, dateFilter, platform, store]);

  /* KPIs — only Completed + Shipped */
  const kpis = useMemo(() => {
    const totalRevenue = completedSales.reduce((s, r) => s + Number(r.revenue), 0);
    const uniqueOrders = new Set(completedSales.filter(r => r.order_id != null).map(r => String(r.order_id)));
    const totalOrders = uniqueOrders.size;
    const totalUnits = completedSales.reduce((s, r) => s + Number(r.units_sold), 0);
    const totalAdsSpend = filteredAds.reduce((s, r) => s + Number(r.ads_spend), 0);
    const totalAdsSales = filteredAds.reduce((s, r) => s + Number(r.ads_sales), 0);
    const roas = totalAdsSpend > 0 ? totalAdsSales / totalAdsSpend : 0;

    /* cancelled */
    const cancelledOrders = new Set(cancelledSales.filter(r => r.order_id != null).map(r => String(r.order_id))).size;
    const cancelledUnits = cancelledSales.reduce((s, r) => s + Number(r.units_sold), 0);
    /* returned */
    const returnedOrders = new Set(returnedSales.filter(r => r.order_id != null).map(r => String(r.order_id))).size;
    const returnedUnits = returnedSales.reduce((s, r) => s + Number(r.units_sold), 0);

    return { totalRevenue, totalOrders, totalUnits, totalAdsSpend, totalAdsSales, roas, cancelledOrders, cancelledUnits, returnedOrders, returnedUnits };
  }, [completedSales, cancelledSales, returnedSales, filteredAds]);

  /* charts — only Completed + Shipped */
  const dailySales = useMemo(() => {
    const map: Record<string, { date: string; revenue: number; orders: number }> = {};
    completedSales.forEach(r => {
      const day = r.date.split(" ")[0];
      if (!map[day]) map[day] = { date: day, revenue: 0, orders: 0 };
      map[day].revenue += Number(r.revenue);
      map[day].orders += Number(r.orders);
    });
    return Object.values(map).sort((a, b) => {
      const [am, ad, ay] = a.date.split("/").map(Number);
      const [bm, bd, by] = b.date.split("/").map(Number);
      return new Date(ay, am-1, ad).getTime() - new Date(by, bm-1, bd).getTime();
    });
  }, [completedSales]);

  const platformOrders = useMemo(() => {
    const map: Record<string, number> = {};
    completedSales.forEach(r => { map[r.platform] = (map[r.platform] || 0) + Number(r.units_sold); });
    return Object.entries(map).map(([platform, units]) => ({ platform, units }));
  }, [completedSales]);

  const dailyAds = useMemo(() => {
    const map: Record<string, { date: string; spend: number; adsSales: number }> = {};
    filteredAds.forEach(r => {
      const day = r.date.split(" ")[0];
      if (!map[day]) map[day] = { date: day, spend: 0, adsSales: 0 };
      map[day].spend += Number(r.ads_spend);
      map[day].adsSales += Number(r.ads_sales);
    });
    return Object.values(map).sort((a, b) => {
      const [am, ad, ay] = a.date.split("/").map(Number);
      const [bm, bd, by] = b.date.split("/").map(Number);
      return new Date(ay, am-1, ad).getTime() - new Date(by, bm-1, bd).getTime();
    });
  }, [filteredAds]);

  /* store performance — only Completed + Shipped */
  const storePerf = useMemo(() => {
    const map: Record<string, { store: string; platform: string; revenue: number; orders: Set<string>; units: number }> = {};
    completedSales.forEach(r => {
      const key = r.store_name;
      if (!map[key]) map[key] = { store: r.store_name, platform: r.platform, revenue: 0, orders: new Set(), units: 0 };
      map[key].revenue += Number(r.revenue);
      if (r.order_id != null) map[key].orders.add(String(r.order_id));
      map[key].units += Number(r.units_sold);
    });
    return Object.values(map).map(s => ({ ...s, orderCount: s.orders.size })).sort((a, b) => b.revenue - a.revenue);
  }, [completedSales]);

  /* top iSKU — only Completed + Shipped */
  const skuPerf = useMemo(() => {
    const map: Record<string, { sku: string; name: string; revenue: number; units: number; orders: Set<string> }> = {};
    completedSales.forEach(r => {
      if (!map[r.sku]) map[r.sku] = { sku: r.sku, name: r.product_name, revenue: 0, units: 0, orders: new Set() };
      map[r.sku].revenue += Number(r.revenue);
      map[r.sku].units += Number(r.units_sold);
      if (r.order_id != null) map[r.sku].orders.add(String(r.order_id));
    });
    return Object.values(map).map(s => ({ ...s, orderCount: s.orders.size })).sort((a, b) => b.revenue - a.revenue).slice(0, 20);
  }, [completedSales]);

  const fmt = (n: number) => "RM " + n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-500 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Live data — Completed &amp; Shipped only
          {platform !== "All" && ` · ${platform}`}
          {store !== "All" && ` · ${store}`}
        </p>
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
      </div>

      {/* KPI Cards — Sales (Completed + Shipped) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Total Sales" value={fmt(kpis.totalRevenue)} icon={DollarSign} color="blue" />
        <KpiCard title="Total Orders" value={kpis.totalOrders.toLocaleString()} icon={ShoppingCart} color="green" />
        <KpiCard title="Units Sold" value={kpis.totalUnits.toLocaleString()} icon={Package} color="purple" />
        <KpiCard title="Ads Spend" value={fmt(kpis.totalAdsSpend)} icon={Megaphone} color="red" />
        <KpiCard title="Ads Sales" value={fmt(kpis.totalAdsSales)} icon={TrendingUp} color="cyan" />
        <KpiCard title="ROAS" value={kpis.roas.toFixed(2) + "x"} icon={BarChart3} color="orange" />
      </div>

      {/* KPI Cards — Cancelled & Returned */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Cancelled Orders" value={kpis.cancelledOrders.toLocaleString()} icon={XCircle} color="red" />
        <KpiCard title="Cancelled Units" value={kpis.cancelledUnits.toLocaleString()} icon={XCircle} color="red" />
        <KpiCard title="Returned Orders" value={kpis.returnedOrders.toLocaleString()} icon={RotateCcw} color="orange" />
        <KpiCard title="Returned Units" value={kpis.returnedUnits.toLocaleString()} icon={RotateCcw} color="orange" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Sales Trend (Completed &amp; Shipped)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Units Sold by Platform (Completed &amp; Shipped)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={platformOrders}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="units" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ads Spend vs Sales chart */}
      {dailyAds.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Ads Spend vs Ads Sales (Daily)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyAds}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="spend" name="Ads Spend" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="adsSales" name="Ads Sales" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Store Performance */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b"><h3 className="text-sm font-semibold text-gray-700">Store Performance (Completed &amp; Shipped)</h3></div>
        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                {["Store", "Platform", "Revenue", "Orders", "Units Sold", "Avg Unit Price"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {storePerf.map(s => (
                <tr key={s.store} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.store}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.platform}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{fmt(s.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.orderCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.units.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.units > 0 ? fmt(s.revenue / s.units) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top iSKU Performance */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b"><h3 className="text-sm font-semibold text-gray-700">Top iSKU Performance (Completed &amp; Shipped)</h3></div>
        <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                {["iSKU", "Product Name", "Revenue", "Units Sold", "Orders"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {skuPerf.map(s => (
                <tr key={s.sku} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{s.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{fmt(s.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.units.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.orderCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
