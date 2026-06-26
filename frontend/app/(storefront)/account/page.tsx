'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Package, MapPin, Star, ChevronRight } from 'lucide-react';

import { useShopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';
import { Badge } from '@/components/ui/badge';
import { useLang } from '@/lib/i18n/context';
import { customerAuthApi } from '@/lib/api/services/customer-auth';
import { customerOrdersApi, addressesApi, loyaltyApi } from '@/lib/api/services/customer';
import { formatOrderNumber } from '@/lib/format-order-number';
import type { Order } from '@/lib/api/types';

const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const toBnDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

const statusColors: Record<string, 'warning' | 'success' | 'info' | 'error'> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'warning',
  packed: 'info',
  shipped: 'info',
  out_for_delivery: 'info',
  delivered: 'success',
  cancelled: 'error',
  refunded: 'error',
  returned: 'error',
};

export default function AccountOverviewPage() {
  const __sb = useShopBase();
  const { t, lang } = useLang();
  const d = t.accountDashboard;
  const fmtNum = (n: number) => {
    const s = n.toLocaleString();
    return lang === 'bn' ? toBnDigits(s) : s;
  };

  const meQuery = useQuery({
    queryKey: ['customer', 'me'],
    queryFn: () => customerAuthApi.me(),
  });

  const ordersQuery = useQuery({
    queryKey: ['customer', 'orders', { per_page: 3 }],
    queryFn: () => customerOrdersApi.list({ per_page: 3 }),
  });

  const addressesQuery = useQuery({
    queryKey: ['customer', 'addresses'],
    queryFn: () => addressesApi.list(),
  });

  const loyaltyQuery = useQuery({
    queryKey: ['customer', 'loyalty'],
    queryFn: () => loyaltyApi.show(),
  });

  const customer = meQuery.data?.customer;
  const orders: Order[] = ordersQuery.data?.data ?? [];
  const addressCount = addressesQuery.data?.length ?? 0;
  const points = loyaltyQuery.data?.account.balance ?? customer?.loyalty_points ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatTile
          icon={<Package size={18} className="text-gray-700" />}
          label={d.totalOrders}
          value={fmtNum(customer?.total_orders ?? 0)}
          href={`${__sb}/account/orders`}
        />
        <StatTile
          icon={<Star size={18} className="text-gray-700" />}
          label={d.loyaltyPoints}
          value={fmtNum(points)}
          href={`${__sb}/account/loyalty`}
        />
        <StatTile
          icon={<MapPin size={18} className="text-gray-700" />}
          label={d.savedAddresses}
          value={fmtNum(addressCount)}
          href={`${__sb}/account/addresses`}
        />
      </div>

      {/* Recent orders */}
      <section className="bg-white border border-gray-200 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{d.recentOrders}</h2>
          <Link
            href={`${__sb}/account/orders`}
            className="text-xs font-medium text-gray-700 hover:underline flex items-center gap-1"
          >
            {d.viewAll} <ChevronRight size={12} />
          </Link>
        </div>
        {ordersQuery.isLoading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">{d.loadingOrders}</div>
        ) : orders.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {orders.map((order) => {
              const items = order.items?.length ?? 0;
              const total = Math.round(parseFloat(order.total) || 0);
              const localeForDate = lang === 'bn' ? 'bn-BD' : 'en-GB';
              return (
                <Link
                  key={order.id}
                  href={`${__sb}/order-tracking?order=${order.order_number}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-xl shrink-0 flex items-center justify-center">
                    <Package size={18} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{formatOrderNumber(order.order_number)}</span>
                      <Badge variant={statusColors[order.status] ?? 'info'}>
                        {t.orderStatuses[order.status] ?? order.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString(localeForDate, {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                      {' · '}{fmtNum(items)} {d.itemsCount} · <Price value={total} />
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <Package size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">{d.noOrders}</p>
            <Link
              href={`${__sb}/products`}
              className="inline-block mt-3 text-xs font-medium text-gray-900 hover:underline"
            >
              {d.browseProducts}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({
  icon, label, value, href,
}: {
  icon: React.ReactNode; label: string; value: string; href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">{icon}</span>
        <ChevronRight size={14} className="text-gray-300" />
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </Link>
  );
}
