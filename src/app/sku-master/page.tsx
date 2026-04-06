"use client";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { SkuMaster } from "@/lib/types";
import { Search, Package, ArrowUpDown, CheckCircle, XCircle } from "lucide-react";

type SortKey = "sku_code" | "product_name" | "cost" | "selling_price" | "margin";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "active" | "non-active";

export default function SkuMasterPage() {
  const [skus, setSkus] = useState<SkuMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [sortKey, setSortKey] = useState<SortKey>("sku_code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const perPage = 50;

  useEffect(() => {
    async function fetchSkus() {
      setLoading(true);
      const { data, error } = await supabase
        .from("sku_master")
        .select("*")
        .order("sku_code", { ascending: true });
      if (!error && data) setSkus(data);
      setLoading(false);
    }
    fetchSkus();
  }, []);

  const isActive = (s: SkuMaster) => Number(s.cost) > 0 && Number(s.selling_price) > 0;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = skus;

    // Status filter
    if (statusFilter === "active") result = result.filter((s) => isActive(s));
    else if (statusFilter === "non-active") result = result.filter((s) => !isActive(s));

    // Search filter
    if (q) {
      result = result.filter(
        (s) =>
          s.sku_code.toLowerCase().includes(q) ||
          s.product_name.toLowerCase().includes(q) ||
          (s.category && s.category.toLowerCase().includes(q)) ||
          (s.brand && s.brand.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return result;
  }, [skus, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const fmt = (n: number) => n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={sortKey === field ? "text-blue-600" : "text-gray-300"} />
      </div>
    </th>
  );

  // Summary stats
  const totalAll = skus.length;
  const totalActive = skus.filter((s) => isActive(s)).length;
  const totalNonActive = totalAll - totalActive;
  const activeSkus = filtered.filter((s) => isActive(s));
  const avgMargin = activeSkus.length > 0
    ? activeSkus.reduce((sum, s) => sum + Number(s.margin), 0) / activeSkus.length
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Master SKU List</h1>
        <p className="text-sm text-gray-500 mt-1">
          Single source of truth — {skus.length.toLocaleString()} SKUs from Supabase
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Package size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total SKUs</p>
              <p className="text-xl font-bold">{totalAll.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle size={20} className="text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-xl font-bold text-green-600">{totalActive.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><XCircle size={20} className="text-red-500" /></div>
            <div>
              <p className="text-sm text-gray-500">Non-Active</p>
              <p className="text-xl font-bold text-red-500">{totalNonActive.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><Package size={20} className="text-purple-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Avg Margin</p>
              <p className="text-xl font-bold">{fmt(avgMargin)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status filter tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {([
            { value: "active", label: "Active", count: totalActive },
            { value: "non-active", label: "Non-Active", count: totalNonActive },
            { value: "all", label: "All", count: totalAll },
          ] as { value: StatusFilter; label: string; count: number }[]).map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statusFilter === tab.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label} <span className="text-xs text-gray-400">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by iSKU, product name, category, or brand..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Loading SKUs...</span>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-16">Status</th>
                  <SortHeader label="iSKU" field="sku_code" />
                  <SortHeader label="Product Name" field="product_name" />
                  <SortHeader label="Cost" field="cost" />
                  <SortHeader label="Selling Price" field="selling_price" />
                  <SortHeader label="Margin %" field="margin" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((sku, i) => {
                  const active = isActive(sku);
                  const marginVal = Number(sku.margin);
                  const marginColor =
                    marginVal >= 50
                      ? "text-green-700 bg-green-50"
                      : marginVal >= 30
                      ? "text-blue-700 bg-blue-50"
                      : marginVal > 0
                      ? "text-yellow-700 bg-yellow-50"
                      : "text-gray-400 bg-gray-50";
                  return (
                    <tr key={sku.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400">{(page - 1) * perPage + i + 1}</td>
                      <td className="px-4 py-3">
                        {active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            <CheckCircle size={10} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-500">
                            <XCircle size={10} /> N/A
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{sku.sku_code}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{sku.product_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">{Number(sku.cost) > 0 ? `RM ${fmt(Number(sku.cost))}` : "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right">{Number(sku.selling_price) > 0 ? `RM ${fmt(Number(sku.selling_price))}` : "—"}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${marginColor}`}>
                          {marginVal > 0 ? `${fmt(marginVal)}%` : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
