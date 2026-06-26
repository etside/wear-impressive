'use client';

import Link from 'next/link';
import { Bell, ShoppingBag, Tag, Truck } from 'lucide-react';

import { useShopBase } from '@/lib/use-shop-base';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/i18n/context';

export default function AccountNotificationsPage() {
  const __sb = useShopBase();
  const { t } = useLang();
  const n = t.accountNotifications;

  // Sample categories rebuilt per-render so they pick up the active locale.
  const categories = [
    {
      icon: <ShoppingBag size={16} className="text-gray-700" />,
      title: n.orderUpdatesTitle,
      desc: n.orderUpdatesDesc,
    },
    {
      icon: <Tag size={16} className="text-gray-700" />,
      title: n.promotionsTitle,
      desc: n.promotionsDesc,
    },
    {
      icon: <Truck size={16} className="text-gray-700" />,
      title: n.deliveryAlertsTitle,
      desc: n.deliveryAlertsDesc,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-base lg:text-lg font-semibold text-gray-900">{n.heading}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{n.subheading}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl px-5 py-12 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
          <Bell size={22} className="text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">{n.empty}</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">{n.emptyDesc}</p>
        <div className="mt-4">
          <Link href={`${__sb}/products`}>
            <Button size="sm" variant="secondary">{n.continueShopping}</Button>
          </Link>
        </div>
      </div>

      {/* What you'll receive — gives users context while the system has no data */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{n.whatYouSee}</h3>
        <ul className="flex flex-col gap-3">
          {categories.map((c) => (
            <li key={c.title} className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                {c.icon}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{c.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
