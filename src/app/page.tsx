"use client"
import { useMemo } from "react"
import { salesData, adsData, masterSkuList, storeList } from "@/lib/mock-data"
import { formatCurrency, formatNumber, formatDecimal } from "@/lib/utils"
import KpiCard from "@/components/KpiCard"
import { DollarSign, ShoppingCart, Package, Megaphone, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

export default function DashboardPage() {
  const totalSales = useMemo(() => salesData.reduce((s, r) => s + r.revenue, 0), [])
  const totalOrders = useMemo(() => salesData.reduce((s, r) => s + r.orders, 0), [])
  const totalUnits = useMemo(() => salesData.reduce((s, r) => s + r.unitsSold, 0), [])
  const totalAdsSpend = useMemo(() => adsData.reduce((s, r) => s + r.adsSpend, 0), [])
  const totalAdsSales = useMemo(() => adsData.reduce((s, r) => s + r.adsSales, 0), [])
  const overallRoas = totalAdsSpend > 0 ? totalAdsSales / totalAdsSpend : 0

  const dailySales = useMemo(() => {
    const map: Record<string, { date: string; revenue: number; orders: number }> = {}
    salesData.forEach((r) => {
      if (!map[r.date]) map[r.date] = { date: r.date, revenue: 0, orders: 0 }
      map[r.date].revenue += r.revenue
      map[r.date].orders += r.orders
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [])

  const ordersByPlatform = useMemo(() => {
    const map: Record<string, number> = {}
    salesData.forEach((r) => { map[r.platform] = (map[r.platform] || 0) + r.orders })
    return Object.entries(map).map(([platform, orders]) => ({ platform, orders }))
  }, [])

  const adsChart = useMemo(() => {
    const map: Record<string, { date: string; spend: number; sales: number }> = {}
    adsData.forEach((r) => {
      if (!map[r.date]) map[r.date] = { date: r.date, spend: 0, sales: 0 }
      map[r.date].spend += r.adsSpend
      map[r.date].sales += r.adsSales
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [])

  const storePerf = useMemo(() => {
    return storeList.map(({ store, platform }) => {
      const storeSales = salesData.filter((r) => r.store === store)
      const storeAds = adsData.filter((r) => r.store === store)
      const revenue = storeSales.reduce((s, r) => s + r.revenue, 0)
      const orders = storeSales.reduce((s, r) => s + r.orders, 0)
      const units = storeSales.reduce((s, r) => s + r.unitsSold, 0)
      const avgUnitPrice = units > 0 ? revenue / units : 0
      const masterAvg = masterSkuList.reduce((s, m) => s + m.sellingPrice, 0) / masterSkuList.length
      const priceDiff = masterAvg > 0 ? ((avgUnitPrice - masterAvg) / masterAvg) * 100 : 0
      const spend = storeAds.reduce((s, r) => s + r.adsSpend, 0)
      const adsSales = storeAds.reduce((s, r) => s + r.adsSales, 0)
      return { store, platform, revenue, orders, units, avgUnitPrice, priceDiff, spend, roas: spend > 0 ? adsSales / spend : 0 }
    }).sort((a, b) => b.revenue - a.revenue)
  }, [])

  const topSkus = useMemo(() => {
    const map: Record<string, { isku: string; productName: string; revenue: number; units: number; orders: number; adsSales: number; adsSpend: number }> = {}
    salesData.forEach((r) => {
      if (!map[r.isku]) map[r.isku] = { isku: r.isku, productName: r.productName, revenue: 0, units: 0, orders: 0, adsSales: 0, adsSpend: 0 }
      map[r.isku].revenue += r.revenue
      map[r.isku].units += r.unitsSold
      map[r.isku].orders += r.orders
    })
    adsData.forEach((r) => {
      if (map[r.isku]) { map[r.isku].adsSales += r.adsSales; map[r.isku].adsSpend += r.adsSpend }
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10).map((s) => ({ ...s, roas: s.adsSpend > 0 ? s.adsSales / s.adsSpend : 0 }))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your e-commerce performance (Last 30 days)</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Total Sales" value={formatCurrency(totalSales)} icon={DollarSign} color="green" />
        <KpiCard title="Total Orders" value={formatNumber(totalOrders)} icon={ShoppingCart} color="blue" />
        <KpiCard title="Units Sold" value={formatNumber(totalUnits)} icon={Package} color="purple" />
        <KpiCard title="Ads Spend" value={formatCurrency(totalAdsSpend)} icon={Megaphone} color="red" />
        <KpiCard title="Ads Sales" value={formatCurrency(totalAdsSales)} icon={TrendingUp} color="cyan" />
        <KpiCard title="ROAS" value={formatDecimal(overallRoas) + "x"} icon={BarChart3} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Daily Sales Trend</h3></div>
          <div className="card-body h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelStyle={{ fontWeight: 600 }} />
                <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Orders by Platform</h3></div>
          <div className="card-body h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersByPlatform}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="platform" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Ads Spend vs Ads Sales</h3></div>
        <div className="card-body h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={adsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Line type="monotone" dataKey="spend" stroke="#ef4444" strokeWidth={2} dot={false} name="Ads Spend" />
              <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} dot={false} name="Ads Sales" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Store Performance</h3></div>
        <div className="card-body overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header text-left py-3 px-2">Store</th>
                <th className="table-header text-left py-3 px-2">Platform</th>
                <th className="table-header text-right py-3 px-2">Sales</th>
                <th className="table-header text-right py-3 px-2">Orders</th>
                <th className="table-header text-right py-3 px-2">Units</th>
                <th className="table-header text-right py-3 px-2">Avg Price</th>
                <th className="table-header text-right py-3 px-2">% vs Master</th>
                <th className="table-header text-right py-3 px-2">Ads Spend</th>
                <th className="table-header text-right py-3 px-2">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {storePerf.map((s) => (
                <tr key={s.store} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-2 font-medium">{s.store}</td>
                  <td className="py-2.5 px-2"><span className="badge bg-gray-100 text-gray-700">{s.platform}</span></td>
                  <td className="py-2.5 px-2 text-right">{formatCurrency(s.revenue)}</td>
                  <td className="py-2.5 px-2 text-right">{formatNumber(s.orders)}</td>
                  <td className="py-2.5 px-2 text-right">{formatNumber(s.units)}</td>
                  <td className="py-2.5 px-2 text-right">${s.avgUnitPrice.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`inline-flex items-center gap-0.5 ${s.priceDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {s.priceDiff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(s.priceDiff).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right">{formatCurrency(s.spend)}</td>
                  <td className="py-2.5 px-2 text-right font-semibold">{s.roas.toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="text-sm font-semibold text-gray-700">Top iSKU Performance</h3></div>
        <div className="card-body overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header text-left py-3 px-2">iSKU</th>
                <th className="table-header text-left py-3 px-2">Product Name</th>
                <th className="table-header text-right py-3 px-2">Revenue</th>
                <th className="table-header text-right py-3 px-2">Units Sold</th>
                <th className="table-header text-right py-3 px-2">Orders</th>
                <th className="table-header text-right py-3 px-2">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {topSkus.map((s) => (
                <tr key={s.isku} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-2 font-mono text-xs font-medium text-brand-600">{s.isku}</td>
                  <td className="py-2.5 px-2">{s.productName}</td>
                  <td className="py-2.5 px-2 text-right">{formatCurrency(s.revenue)}</td>
                  <td className="py-2.5 px-2 text-right">{formatNumber(s.units)}</td>
                  <td className="py-2.5 px-2 text-right">{formatNumber(s.orders)}</td>
                  <td className="py-2.5 px-2 text-right font-semibold">{s.roas.toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
