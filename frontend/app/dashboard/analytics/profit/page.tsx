'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Download, Calendar, ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Price } from '@/lib/format-price';
import { MobileRowCard } from '@/components/ui/mobile-row-card';
import { analyticsApi } from '@/lib/api/services/vendor-analytics';
import { categoriesApi } from '@/lib/api/services/vendor-products';

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function ProfitReportPage() {
  // Filters — default to last 30 days, all categories.
  const today = new Date();
  const thirtyAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [dateFrom, setDateFrom] = useState(fmtDate(thirtyAgo));
  const [dateTo, setDateTo] = useState(fmtDate(today));
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subCategoryId, setSubCategoryId] = useState<number | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['vendor', 'categories'],
    queryFn: () => categoriesApi.list({ per_page: 200 }),
  });
  const allCats = categoriesQuery.data?.data ?? [];
  const parentCats = allCats.filter((c) => c.parent_id === null);
  const subCats = categoryId
    ? allCats.filter((c) => c.parent_id === categoryId)
    : [];

  const profitQuery = useQuery({
    queryKey: ['vendor', 'profit', dateFrom, dateTo, categoryId, subCategoryId],
    queryFn: () => analyticsApi.profit({
      date_from: dateFrom,
      date_to: dateTo,
      category_id: categoryId,
      sub_category_id: subCategoryId,
    }),
  });

  const data = profitQuery.data;
  const totals = data?.totals;

  const csvUrl = useMemo(() => analyticsApi.profitCsvUrl({
    date_from: dateFrom,
    date_to: dateTo,
    category_id: categoryId,
    sub_category_id: subCategoryId,
  }), [dateFrom, dateTo, categoryId, subCategoryId]);

  const handleExport = () => {
    // Direct anchor click — backend sets Content-Disposition: attachment
    // so the browser triggers a download instead of navigating.
    const a = document.createElement('a');
    a.href = csvUrl;
    a.download = `wi-profit-${dateFrom}_to_${dateTo}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      <Link
        href="/dashboard/analytics"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-3"
      >
        <ChevronLeft size={14} /> Back to Analytics
      </Link>
      <PageHeader
        title="Profit Report"
        subtitle="Per-product revenue, cost, and profit. Cost is snapshotted at order time so figures stay accurate."
        actions={
          <Button onClick={handleExport} disabled={!data || data.rows.length === 0}>
            <Download size={15} /> Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={fmtDate(new Date())}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
          <select
            value={categoryId ?? ''}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : null;
              setCategoryId(v);
              setSubCategoryId(null);
            }}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white"
          >
            <option value="">All categories</option>
            {parentCats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Sub-category</label>
          <select
            value={subCategoryId ?? ''}
            onChange={(e) => setSubCategoryId(e.target.value ? Number(e.target.value) : null)}
            disabled={!categoryId || subCats.length === 0}
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">All sub-categories</option>
            {subCats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard label="Revenue" value={totals?.revenue ?? 0} loading={profitQuery.isLoading} />
        <SummaryCard label="Cost" value={totals?.cost ?? 0} loading={profitQuery.isLoading} />
        <SummaryCard label="Profit" value={totals?.profit ?? 0} loading={profitQuery.isLoading} accent={(totals?.profit ?? 0) >= 0 ? 'green' : 'red'} />
        <SummaryCard label="Margin" value={totals?.margin ?? 0} loading={profitQuery.isLoading} suffix="%" />
      </div>

      {/* Per-product list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Desktop table */}
        <table className="hidden md:table w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Product</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Qty Sold</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Revenue</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Cost</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Profit</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profitQuery.isLoading ? (
              <tr><td colSpan={6} className="text-center py-12 text-sm text-gray-400">Loading…</td></tr>
            ) : (data?.rows.length ?? 0) === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-sm text-gray-400">No delivered orders in this range.</td></tr>
            ) : data!.rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3 text-right text-gray-700">{r.qty_sold}</td>
                <td className="px-4 py-3 text-right text-gray-700"><Price value={r.revenue} /></td>
                <td className="px-4 py-3 text-right text-gray-500"><Price value={r.cost} /></td>
                <td className={`px-4 py-3 text-right font-semibold ${r.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  <Price value={r.profit} />
                </td>
                <td className={`px-4 py-3 text-right font-medium ${r.margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {r.margin}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="md:hidden p-3">
          {profitQuery.isLoading ? (
            <div className="text-center py-12 text-sm text-gray-400">Loading…</div>
          ) : (data?.rows.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">No delivered orders in this range.</div>
          ) : (
            <div className="space-y-2">
              {data!.rows.map((r) => (
                <MobileRowCard
                  key={r.id}
                  header={<span className="text-sm font-medium text-gray-900">{r.name}</span>}
                  trailing={
                    <div className="text-right">
                      <p className={`text-sm font-bold ${r.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        <Price value={r.profit} />
                      </p>
                      <p className={`text-[10px] -mt-0.5 ${r.margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {r.margin}% margin
                      </p>
                    </div>
                  }
                  meta={
                    <span className="text-gray-600">
                      {r.qty_sold} sold · Revenue <Price value={r.revenue} /> · Cost <Price value={r.cost} />
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, loading, suffix, accent }: {
  label: string; value: number; loading: boolean; suffix?: string; accent?: 'green' | 'red';
}) {
  const color = accent === 'green' ? 'text-green-700' : accent === 'red' ? 'text-red-700' : 'text-gray-900';
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {loading ? (
        <div className="h-7 w-24 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className={`text-xl font-bold ${color}`}>
          {suffix ? `${value}${suffix}` : <Price value={value} />}
        </p>
      )}
    </div>
  );
}
