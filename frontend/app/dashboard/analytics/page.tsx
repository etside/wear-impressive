"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TrendingUp, ShoppingCart, Users, Package, AlertCircle } from "lucide-react";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { analyticsApi } from "@/lib/api/services/vendor-analytics";
import { getApiErrorMessage } from "@/lib/api/client";

const TIME_RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "year", label: "This year" },
];

function rangeToDates(range: string): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (range === "7d") from.setDate(from.getDate() - 7);
  else if (range === "30d") from.setDate(from.getDate() - 30);
  else if (range === "90d") from.setDate(from.getDate() - 90);
  else if (range === "year") from.setMonth(0, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

function fmtMoney(v: number | string): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (!isFinite(n)) return "৳0";
  if (n >= 100000) return `৳${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `৳${(n / 1000).toFixed(1)}k`;
  return `৳${Math.round(n).toLocaleString()}`;
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");
  const { from, to } = useMemo(() => rangeToDates(timeRange), [timeRange]);

  const revenueQuery = useQuery({
    queryKey: ['vendor', 'analytics', 'revenue', { from, to }],
    queryFn: () => analyticsApi.revenue({ from, to }),
  });

  const topProductsQuery = useQuery({
    queryKey: ['vendor', 'analytics', 'top-products'],
    queryFn: () => analyticsApi.topProducts(),
  });

  const customersQuery = useQuery({
    queryKey: ['vendor', 'analytics', 'customers'],
    queryFn: () => analyticsApi.customers(),
  });

  const revenue = revenueQuery.data;
  const series = revenue?.series ?? [];
  const maxRevenue = useMemo(() => {
    if (series.length === 0) return 1;
    return Math.max(
      1,
      ...series.map(p => (typeof p.revenue === 'string' ? parseFloat(p.revenue) : p.revenue))
    );
  }, [series]);

  const topProducts = topProductsQuery.data?.products ?? [];
  const customers = customersQuery.data;

  const loadError = revenueQuery.error || topProductsQuery.error || customersQuery.error;

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader
        title="Analytics"
        subtitle="Store performance overview"
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/dashboard/analytics/payments"
              className="h-9 px-3 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 inline-flex items-center"
            >
              Payments Received →
            </a>
            <a
              href="/dashboard/analytics/profit"
              className="h-9 px-3 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 inline-flex items-center"
            >
              Profit Report →
            </a>
            <SearchableSelect
              options={TIME_RANGE_OPTIONS}
              value={timeRange}
              onChange={(v) => setTimeRange(v)}
              searchable={false}
              size="sm"
            />
          </div>
        }
      />

      {loadError && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-sm border bg-red-50 border-red-200 text-red-700 flex items-center gap-2">
          <AlertCircle size={14} />
          {getApiErrorMessage(loadError, 'Failed to load analytics data')}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Revenue"
          value={revenueQuery.isLoading ? '—' : fmtMoney(revenue?.total_revenue ?? 0)}
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Total Orders"
          value={revenueQuery.isLoading ? '—' : String(revenue?.total_orders ?? 0)}
          icon={<ShoppingCart size={18} />}
        />
        <StatCard
          label="New Customers"
          value={customersQuery.isLoading ? '—' : String(customers?.new_customers ?? 0)}
          icon={<Users size={18} />}
        />
        <StatCard
          label="Avg Order Value"
          value={revenueQuery.isLoading ? '—' : fmtMoney(revenue?.avg_order_value ?? 0)}
          icon={<Package size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Revenue Over Time</h2>
          {revenueQuery.isLoading ? (
            <div className="h-40 flex items-center justify-center text-xs text-gray-400">Loading…</div>
          ) : series.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-gray-400">No data in this range</div>
          ) : (
            <div className="flex items-stretch gap-2 h-48">
              {series.map((point, i) => {
                const val = typeof point.revenue === 'string' ? parseFloat(point.revenue) : point.revenue;
                const isLast = i === series.length - 1;
                const pct = maxRevenue > 0 ? Math.max(2, (val / maxRevenue) * 100) : 2;
                return (
                  <div key={`${point.date}-${i}`} className="flex-1 min-w-0 h-full flex flex-col">
                    <span className="text-[9px] text-gray-500 truncate text-center mb-1">{fmtMoney(val)}</span>
                    <div className="flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t-md transition-all ${isLast ? "bg-black" : "bg-gray-200"}`}
                        style={{ height: `${pct}%`, minHeight: '4px' }}
                        title={`${point.date}: ${fmtMoney(val)} (${point.orders} orders)`}
                      />
                    </div>
                    <span className="text-[9px] text-gray-500 truncate text-center mt-1">
                      {point.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Products</h2>
          {topProductsQuery.isLoading ? (
            <div className="py-6 text-center text-xs text-gray-400">Loading…</div>
          ) : topProducts.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400">No products sold yet</div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 text-xs font-medium text-gray-500">Product</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500">Sold</th>
                    <th className="text-right py-2 text-xs font-medium text-gray-500">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topProducts.map(p => (
                    <tr key={p.id}>
                      <td className="py-2 text-sm text-gray-900">{p.name}</td>
                      <td className="py-2 text-right text-sm text-gray-600">{p.qty_sold}</td>
                      <td className="py-2 text-right text-sm font-medium text-gray-900">{fmtMoney(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {topProducts.map(p => (
                  <MobileRowCard
                    key={p.id}
                    header={<span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>}
                    trailing={<span className="text-sm font-semibold text-gray-900">{fmtMoney(p.revenue)}</span>}
                    meta={<span className="text-gray-600">{p.qty_sold} sold</span>}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Customers card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Customers</h2>
          {customersQuery.isLoading ? (
            <div className="py-6 text-center text-xs text-gray-400">Loading…</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-3">
                  <p className="text-xs text-gray-500 mb-1">New</p>
                  <p className="text-lg font-semibold text-gray-900">{customers?.new_customers ?? 0}</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-3">
                  <p className="text-xs text-gray-500 mb-1">Returning</p>
                  <p className="text-lg font-semibold text-gray-900">{customers?.returning_customers ?? 0}</p>
                </div>
              </div>
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Top Customers</h3>
              {(customers?.top_customers?.length ?? 0) === 0 ? (
                <p className="text-xs text-gray-400">No customer data yet</p>
              ) : (
                <div className="space-y-2">
                  {customers!.top_customers.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-gray-900">{c.name}</p>
                        <p className="text-[11px] text-gray-500">{c.orders_count} orders</p>
                      </div>
                      <span className="font-medium text-gray-900">{fmtMoney(c.total_spent)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Order Stats */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Order Stats</h2>
          {revenueQuery.isLoading ? (
            <div className="py-6 text-center text-xs text-gray-400">Loading…</div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Orders</span>
                <span className="font-medium text-gray-900">{revenue?.total_orders ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-medium text-gray-900">{fmtMoney(revenue?.total_revenue ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Avg Order Value</span>
                <span className="font-medium text-gray-900">{fmtMoney(revenue?.avg_order_value ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Range</span>
                <span className="font-medium text-gray-900">{from} → {to}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
