'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, MapPin, User, Star, Bell, LogOut, Menu, X } from 'lucide-react';

import { useShopBase } from '@/lib/use-shop-base';
import { useLang } from '@/lib/i18n/context';
import { customerAuthApi } from '@/lib/api/services/customer-auth';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function useNavItems(__sb: string): NavItem[] {
  const { t } = useLang();
  const labels = t.account.nav;

  // Order: Orders → Addresses → Profile → Loyalty → Notifications.
  // Indices match `t.account.nav` (also reordered to keep both arrays in sync).
  return [
    { label: labels[0], href: `${__sb}/account/orders`,        icon: <Package size={16} /> },
    { label: labels[1], href: `${__sb}/account/addresses`,     icon: <MapPin size={16} /> },
    { label: labels[2], href: `${__sb}/account/profile`,       icon: <User size={16} /> },
    { label: labels[3], href: `${__sb}/account/loyalty`,       icon: <Star size={16} /> },
    { label: labels[4], href: `${__sb}/account/notifications`, icon: <Bell size={16} /> },
  ];
}

function isActive(pathname: string, href: string, __sb: string): boolean {
  // The /account index isn't its own nav item — it should highlight Orders.
  if (href === `${__sb}/account/orders` && pathname === `${__sb}/account`) return true;
  return pathname === href || pathname.startsWith(href + '/');
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const __sb = useShopBase();
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const { t, lang } = useLang();
  const a = t.account;
  const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  const fmtNum = (n: number) => {
    const s = n.toLocaleString();
    return lang === 'bn' ? s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : s;
  };

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navItems = useNavItems(__sb);

  // Auth flow pages (login/register/forgot-password) live under /account but
  // shouldn't get the dashboard chrome — they need their own full-width layout
  // and must not be gated behind the "sign in" CTA.
  const authPaths = ['login', 'register', 'forgot-password', 'reset-password'];
  const isAuthPage = authPaths.some((seg) => pathname.startsWith(`${__sb}/account/${seg}`));

  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('etommerce_customer_token');

  // Both hooks must be called unconditionally on every render — even when
  // we're about to early-return for an auth page or signed-out customer —
  // otherwise React's hook-count check fails when navigating between an
  // authed page and the login page. Disable the queries instead of skipping
  // the hook entirely.
  const meQuery = useQuery({
    queryKey: ['customer', 'me'],
    queryFn: () => customerAuthApi.me(),
    enabled: hasToken && !isAuthPage,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => customerAuthApi.logout(),
    onSuccess: () => {
      qc.clear();
      router.push(`${__sb}/account/login`);
    },
  });

  if (isAuthPage) return <>{children}</>;

  if (!hasToken || (meQuery.error && !meQuery.data)) {
    return (
      <div className="container-app pt-12 pb-10">
        <div className="max-w-md mx-auto text-center py-16">
          <User size={40} className="text-gray-300 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{a.gateTitle}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {a.gateSubtitle}
          </p>
          <Link href={`${__sb}/account/login`}>
            <Button>{a.gateSignInBtn}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const customer = meQuery.data?.customer;
  const initials = customer?.name
    ? customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '—';

  const ProfileCard = (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center shrink-0">
        <span className="text-white font-semibold text-sm">{initials}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{customer?.name ?? '—'}</p>
        <p className="text-xs text-gray-500">{fmtNum(customer?.loyalty_points ?? 0)} {t.accountDashboard.loyaltyPoints.toLowerCase()}</p>
      </div>
    </div>
  );

  const NavList = (
    <nav className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        const active = isActive(pathname, item.href, __sb);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileNavOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className={active ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
      <button
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors mt-2 disabled:opacity-60"
      >
        <LogOut size={16} /> {a.signOut}
      </button>
    </nav>
  );

  return (
    <div className="container-app pt-8 lg:pt-12 pb-10">
      {/* Mobile header: profile pill + hamburger */}
      <div className="lg:hidden flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-900">{a.title}</h1>
        <button
          onClick={() => setMobileNavOpen(true)}
          className="flex items-center gap-2 h-9 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          aria-label="Open account navigation"
        >
          <Menu size={16} />
          {a.menu ?? 'Menu'}
        </button>
      </div>

      {/* Desktop title */}
      <h1 className="hidden lg:block text-xl font-semibold text-gray-900 mb-6">{a.title}</h1>

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-56 shrink-0 flex-col">
          <div className="mb-4">{ProfileCard}</div>
          {NavList}
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white p-5 overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-900">{a.title}</span>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mb-4 border-b border-gray-100 pb-3">{ProfileCard}</div>
            {NavList}
          </div>
        </div>
      )}
    </div>
  );
}
