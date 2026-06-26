'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, Package, Eye, MapPin } from 'lucide-react';

import { useShopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/i18n/context';
import { customerOrdersApi } from '@/lib/api/services/customer';
import { formatOrderNumber } from '@/lib/format-order-number';
import type { Order } from '@/lib/api/types';

const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const toBnDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

const statusVariants: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  processing: 'warning',
  pending: 'warning',
  confirmed: 'warning',
  packed: 'info',
  shipped: 'info',
  out_for_delivery: 'info',
  delivered: 'success',
  cancelled: 'error',
  refunded: 'error',
  returned: 'error',
};

// Tab definitions are functions of the i18n bundle so labels switch with
// the active language without re-mounting the page.
const buildTabs = (o: { tabAll: string; tabPending: string; tabShipped: string; tabDelivered: string; tabCancelled: string }):
  { key: string; label: string; match: (o: Order) => boolean }[] => [
  { key: 'all',       label: o.tabAll,        match: () => true },
  { key: 'pending',   label: o.tabPending,    match: (or) => ['pending', 'confirmed', 'packed'].includes(or.status) },
  { key: 'shipped',   label: o.tabShipped,    match: (or) => ['shipped', 'out_for_delivery'].includes(or.status) },
  { key: 'delivered', label: o.tabDelivered,  match: (or) => or.status === 'delivered' },
  { key: 'cancelled', label: o.tabCancelled,  match: (or) => ['cancelled', 'refunded', 'returned'].includes(or.status) },
];

export default function AccountOrdersPage() {
  const __sb = useShopBase();
  const { t, lang } = useLang();
  const o = t.accountOrders;
  const fmtNum = (n: number) => (lang === 'bn' ? toBnDigits(String(n)) : String(n));
  const TABS = useMemo(() => buildTabs(o), [o]);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');

  const ordersQuery = useQuery({
    queryKey: ['customer', 'orders'],
    queryFn: () => customerOrdersApi.list({ per_page: 50 }),
  });

  const orders: Order[] = ordersQuery.data?.data ?? [];

  const filtered = useMemo(() => {
    const tab = TABS[activeTab];
    return orders.filter((o) => {
      if (!tab.match(o)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      const hay = [
        o.order_number,
        ...(o.items?.map((i) => i.product_name ?? '') ?? []),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [orders, activeTab, search]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base lg:text-lg font-semibold text-gray-900">{o.heading}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{fmtNum(filtered.length)} {o.ofCount} {fmtNum(orders.length)}</p>
        </div>
        <div className="relative sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={o.searchPlaceholder}
            className="w-full h-9 pl-9 pr-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400"
          />
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
        {TABS.map((tab, i) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              i === activeTab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {ordersQuery.isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-12 text-center text-sm text-gray-400">
          {o.loading}
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {filtered.map((order) => {
            const items = order.items?.length ?? 0;
            const total = Math.round(parseFloat(order.total) || 0);
            const localeForDate = lang === 'bn' ? 'bn-BD' : 'en-GB';
            const date = new Date(order.created_at).toLocaleDateString(localeForDate, {
              day: 'numeric', month: 'short', year: 'numeric',
            });
            return (
              <div key={order.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4 sm:px-5">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl shrink-0 flex items-center justify-center">
                    <Package size={18} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{formatOrderNumber(order.order_number)}</span>
                      <Badge variant={statusVariants[order.status] ?? 'info'}>
                        {t.orderStatuses[order.status] ?? order.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {date} · {fmtNum(items)} {o.itemsCount} · <Price value={total} />
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 sm:shrink-0 self-stretch sm:self-auto">
                  {['shipped', 'out_for_delivery'].includes(order.status) && (
                    <Link href={`${__sb}/order-tracking?order=${order.order_number}`} className="flex-1 sm:flex-none">
                      <Button variant="secondary" size="xs" className="w-full">
                        <MapPin size={12} /> {o.track}
                      </Button>
                    </Link>
                  )}
                  <Link href={`${__sb}/order-tracking?order=${order.order_number}`} className="flex-1 sm:flex-none">
                    <Button variant="ghost" size="xs" className="w-full">
                      <Eye size={12} /> {o.view}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-12 text-center">
          <Package size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">{o.noMatch}</p>
          <Link href={`${__sb}/products`} className="inline-block mt-3 text-xs font-medium text-gray-900 hover:underline">
            {o.browseProducts}
          </Link>
        </div>
      )}
    </div>
  );
}
