"use client";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatOrderNumber } from "@/lib/format-order-number";
import { useLang } from "@/lib/i18n/context";
import {
  ShoppingCart, Package, TrendingUp, ArrowRight,
  AlertCircle, CheckCircle2, Clock, AlertTriangle, Info
} from "lucide-react";
import Link from "next/link";
import { vendorStatsApi } from "@/lib/api/services/vendor-analytics";
import { vendorAuthApi } from "@/lib/api/services/vendor-auth";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Order, VendorStatsAlert } from "@/lib/api/types";

const statusVariants: Record<string, "default" | "warning" | "success" | "info" | "error"> = {
  pending:          "warning",
  confirmed:        "info",
  processing:       "warning",
  packed:           "info",
  shipped:          "default",
  out_for_delivery: "default",
  delivered:        "success",
  cancelled:        "error",
  refunded:         "error",
  returned:         "error",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function alertIcon(severity: VendorStatsAlert['severity']) {
  if (severity === 'error') return <AlertCircle size={14} className="text-red-600 shrink-0" />;
  if (severity === 'warning') return <AlertTriangle size={14} className="text-amber-600 shrink-0" />;
  if (severity === 'success') return <CheckCircle2 size={14} className="text-green-600 shrink-0" />;
  return <Info size={14} className="text-blue-600 shrink-0" />;
}

function alertClasses(severity: VendorStatsAlert['severity']) {
  if (severity === 'error') return 'bg-red-50 border-red-100 text-red-700';
  if (severity === 'warning') return 'bg-amber-50 border-amber-100 text-amber-700';
  if (severity === 'success') return 'bg-green-50 border-green-100 text-green-700';
  return 'bg-blue-50 border-blue-100 text-blue-700';
}

export default function DashboardHome() {
  const { t } = useLang();
  const d = t.dash.home;

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['vendor', 'stats'],
    queryFn: () => vendorStatsApi.get(),
  });

  const { data: meData } = useQuery({
    queryKey: ['vendor', 'me'],
    queryFn: () => vendorAuthApi.me(),
    staleTime: 60_000,
    retry: false,
  });
  const firstName = (meData?.vendor?.name ?? '').split(' ')[0] || 'there';
  const subtitle = d.subtitle.replace('{name}', firstName);

  const recentOrders: Order[] = stats?.recent_orders ?? [];
  const alerts: VendorStatsAlert[] = stats?.alerts ?? [];

  return (
    <div className="max-w-[1200px] mx-auto">
      <PageHeader title={d.title} subtitle={subtitle} />

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-sm border bg-red-50 border-red-200 text-red-700 flex items-center gap-2">
          <AlertCircle size={14} /> {getApiErrorMessage(error, 'Failed to load dashboard stats')}
        </div>
      )}

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`px-4 py-2.5 rounded-lg text-sm border flex items-center gap-2 ${alertClasses(a.severity)}`}>
              {alertIcon(a.severity)}
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label={d.stats.todayOrders}
              value={String(stats?.today_orders ?? 0)}
              icon={<ShoppingCart size={18} />}
              href="/dashboard/orders"
            />
            <StatCard
              label={d.stats.todayRevenue}
              value={`৳${stats?.today_revenue ?? '0'}`}
              icon={<TrendingUp size={18} />}
              href="/dashboard/analytics"
            />
            <StatCard
              label="Pending Orders"
              value={String(stats?.pending_orders ?? 0)}
              icon={<Clock size={18} />}
              href="/dashboard/orders"
            />
            <StatCard
              label={d.lowStock}
              value={String(stats?.low_stock_products ?? 0)}
              icon={<Package size={18} />}
              href="/dashboard/products/inventory"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">{d.recentOrders}</h2>
            <Link href="/dashboard/orders" className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
              {d.viewAll} <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {isLoading ? (
              <>
                <RecentOrderSkeleton />
                <RecentOrderSkeleton />
                <RecentOrderSkeleton />
              </>
            ) : recentOrders.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No recent orders</div>
            ) : (
              recentOrders.map(order => {
                const customerName = order.customer?.name || order.guest_name || 'Guest';
                const statusLabel = d.statuses[order.status as keyof typeof d.statuses] || order.status;
                return (
                  <div key={order.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">#{formatOrderNumber(order.order_number)}</span>
                        <Badge variant={statusVariants[order.status] || "default"}>
                          {statusLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{customerName} · {timeAgo(order.created_at)}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">৳{order.total}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Low Stock */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">{d.lowStock}</h2>
            </div>
            <div className="px-5 py-4 text-sm text-gray-500">
              {isLoading ? (
                <span className="text-gray-400">Loading…</span>
              ) : (stats?.low_stock_products ?? 0) === 0 ? (
                <span className="text-gray-400">No low stock alerts</span>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span>{stats?.low_stock_products} product(s) low on stock</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mb-3" />
          <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="w-10 h-10 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

function RecentOrderSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="flex-1 min-w-0">
        <div className="h-3 w-32 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-2.5 w-24 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}
