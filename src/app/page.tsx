"use client";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { SalesRecord, AdsRecord } from "@/lib/types";
import KpiCard from "@/components/KpiCard";
import {
  DollarSign, ShoppingCart, Package, Megaphone, TrendingUp, BarChart3,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

export default function DashboardPage() {
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [ads, setAds] = useState<AdsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [salesRes, adsRes] = await Promise.all([
        supabase.from("sales_tracking").select("*"),
        supabase.from("ads_performance").select("*"),
      ]);
      if (salesRes.data) setSales(salesRes.data);
      if (adsRes.data) setAds(adsRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const kpis = useMemo(() => {
    const totalRevenue = sales.reduce((s, r) => s + Number(r.revenue), 0);
    const totalOrders = sales.reduce((s, r) => s + Number(r.orders), 0);
    const totalUnits = sales.reduce((s, r) => s + Number(r.units_sold), 0);
    const totalAdsSpend = ads.reduce((s, r) => s + Number(r.ads_spend), 0);
    const totalAdsSales = ads.reduce((s, r) => s + Number(r.ads_sales), 0);
    const roas = totalAdsSpend > 0 ? totalAdsSales / totalAdsSpend : 0;
    return { totalRevenue, totalOrders, totalUnits, totalAdsSpend, totalAdsSales, roas };
  }, [sales, ads]);

  // Daily sales trend
  const dailySales = useMemo(() => {
    const map: Record<string, { date: string; revenue: number; orders: number }> = {};
    sales.forEach((r) => {
      const day = r.date.split(" ")[0];
      if (!map[day]) map[day] = { date: day, revenue: 0, orders: 0 };
      map[day].revenue += Number(r.revenue);
      map[day].orders += Number(r.orders);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [sales]);

  // Orders by platform
  const platformOrders = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((r) => {
      map[r.platform] = (map[r.platform] || 0) + Number(r.units_sold);
    });
    return Object.entries(map).map(([platform, units]) => ({ platform, units }));
  }, [sales]);

  // Ads Spend vs Sales (daily)
  const dailyAds = useMemo(() => {
    const map: Record<string, { date: string; spend: number; adsSales: number }> = {};
    ads.forEach((r) => {
      const day = r.date.split(" ")[0];
      if (!map[day]) map[day] = { date: day, spend: 0, adsSales: 0 };
      map[day].spend += Number(r.ads_spend);
      map[day].adsSales += Number(r.ads_sales);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [ads]);

  // Store performance
  const storePerf = useMemo(() => {
    const map: Record<string, { store: string; platform: string; revenue: number; orders: number; units: number }> = {};
    sales.forEach((r) => {
      const key = r.store_name;
      if (!map[key]) map[key] = { store: r.store_name, platform: r.platform, revenue: 0, orders: 0, units: 0 };
      map[key].revenue += Number(r.revenue);
      map[key].orders += Number(r.orders);
      map[key].units += Number(r.units_sold);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  // Top iSKU performance
  const skuPerf = useMemo(() => {
    const map: Record<string, { sku: string; name: string; revenue: number; units: number; orders: number }> = {};
    sales.forEach((r) => {
      if (!map[r.sku]) map[r.sku] = { sku: r.sku, name: r.product_name, revenue: 0, units: 0, orders: 0 };
      map[r.sku].revenue += Number(r.revenue);
      map[r.sku].units += Number(r.units_sold);
      map[r.sku].orders += Number(r.orders);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 20);
  }, [sales]);

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        <p className="text-sm text-gray-500 mt-1">Live data from Supabase — {sales.length.toLocaleString()} sales records</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Total Sales" value={fmt(kpis.totalRevenue)} icon={<DollarSign size={20} />} color="blue" />
        <KpiCard title="Total Orders" value={kpis.totalOrders.toLocaleString()} icon={<ShoppingCart size={20} />} color="green" />
        <KpiCard title="Units Sold" value={kpis.totalUnits.toLocaleString()} icon={<Package size={20} />} color="purple" />
        <KpiCard title="Ads Spend" value={fmt(kpis.totalAdsSpend)} icon={<Megaphone size={20} />} color="red" />
        <KpiCard title="Ads Sales" value={fmt(kpis.totalAdsSales)} icon={<TrendingUp size={20} />} color="yellow" />
        <KpiCard title="ROAS" value={kpis.roas.toFixed(2) + "x"} icon={<BarChart3 size={20} />} color="indigo" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Trend */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Sales Trend</h3>
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

        {/* Orders by Platform */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Units Sold by Platform</h3>
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
        <div className="p-4 border-b"><h3 className="text-sm font-semibold text-gray-700">Store Performance</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Store", "Platform", "Revenue", "Orders", "Units Sold", "Avg Unit Price"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {storePerf.map((s) => (
                <tr key={s.store} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.store}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.platform}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{fmt(s.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.orders.toLocaleString()}</td>
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
        <div className="p-4 border-b"><h3 className="text-sm font-semibold text-gray-700">Top iSKU Performance</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["iSKU", "Product Name", "Revenue", "Units Sold", "Orders"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {skuPerf.map((s) => (
                <tr key={s.sku} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{s.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{fmt(s.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.units.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.orders.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
