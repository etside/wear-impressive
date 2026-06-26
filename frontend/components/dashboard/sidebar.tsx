"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n/context";
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart2,
  Tag, FileText, Settings, ChevronDown, LogOut, User as UserIcon, Eye
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useEffect, useMemo, useRef, useState } from "react";
import { vendorStatsApi } from "@/lib/api/services/vendor-analytics";
import { vendorAuthApi } from "@/lib/api/services/vendor-auth";

type NavKey =
  | 'dashboard' | 'orders' | 'products' | 'customers' | 'analytics'
  | 'discounts' | 'content' | 'settings';

type ChildKey =
  | 'allOrders' | 'abandoned' | 'returns'
  | 'allProducts' | 'addProduct' | 'inventory' | 'categories' | 'brands'
  | 'homepage' | 'files' | 'menus' | 'pages';

interface NavItem {
  key: NavKey;
  href?: string;
  icon: React.ReactNode;
  badge?: number;
  children?: { key: ChildKey; href: string }[];
}

const navItems: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
  {
    key: 'orders', icon: <ShoppingCart size={18} />,
    children: [
      { key: 'allOrders', href: '/dashboard/orders' },
      { key: 'abandoned', href: '/dashboard/orders/abandoned' },
      { key: 'returns',   href: '/dashboard/orders/returns' },
    ],
  },
  {
    key: 'products', icon: <Package size={18} />,
    children: [
      { key: 'allProducts', href: '/dashboard/products' },
      { key: 'addProduct',  href: '/dashboard/products/add' },
      { key: 'inventory',   href: '/dashboard/products/inventory' },
      { key: 'categories',  href: '/dashboard/products/categories' },
      { key: 'brands',      href: '/dashboard/products/brands' },
    ],
  },
  { key: 'customers',  href: '/dashboard/customers',  icon: <Users size={18} /> },
  { key: 'analytics',  href: '/dashboard/analytics',  icon: <BarChart2 size={18} /> },
  { key: 'discounts',  href: '/dashboard/discounts',  icon: <Tag size={18} /> },
  {
    key: 'content', icon: <FileText size={18} />,
    children: [
      { key: 'homepage', href: '/dashboard/content/homepage' },
      { key: 'pages', href: '/dashboard/content/pages' },
      { key: 'files', href: '/dashboard/content/files' },
      { key: 'menus', href: '/dashboard/content/menus' },
    ],
  },
  { key: 'settings',   href: '/dashboard/settings',   icon: <Settings size={18} /> },
];

function NavItemRow({ item, isOpen, onToggle }: { item: NavItem; isOpen: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { t } = useLang();
  const nav = t.dash.nav;
  const open = isOpen;
  const isActive = item.href ? pathname === item.href : false;

  if (item.children) {
    return (
      <div>
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
            "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          <span className="text-gray-400">{item.icon}</span>
          <span className="flex-1 text-left font-medium">{nav[item.key]}</span>
          {item.badge && (
            <span className="bg-black text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
          <ChevronDown size={14} className={cn("transition-transform text-gray-400", open && "rotate-180")} />
        </button>
        {open && (
          <div className="ml-7 mt-0.5 flex flex-col gap-0.5">
            {item.children.map(child => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm transition-colors",
                  pathname === child.href
                    ? "bg-[#2596be]/10 text-[#2596be] font-semibold"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                {nav[child.key]}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
        isActive
          ? "bg-[#2596be] text-white font-medium"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <span className={isActive ? "text-white" : "text-gray-400"}>{item.icon}</span>
      <span className="flex-1 font-medium">{nav[item.key]}</span>
      {item.badge && (
        <span className={cn(
          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
          isActive ? "bg-white text-black" : "bg-black text-white"
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function useVisibleNavItems(): NavItem[] {
  const statsQuery = useQuery({
    queryKey: ['vendor', 'stats'],
    queryFn: () => vendorStatsApi.get(),
    staleTime: 60_000,
    retry: false,
  });

  const pendingOrders = statsQuery.data?.pending_orders ?? 0;

  return useMemo(() => navItems.map((item) =>
    item.key === 'orders' && pendingOrders > 0 ? { ...item, badge: pendingOrders } : item
  ), [pendingOrders]);
}

export function DashboardSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { t } = useLang();
  const items = useVisibleNavItems();
  const [expandedKey, setExpandedKey] = useState<NavKey | null>(() => {
    const active = navItems.find(item => item.children?.some(c => pathname.startsWith(c.href)));
    return active?.key ?? null;
  });

  // Auto-close the mobile drawer on route navigation.
  useEffect(() => {
    if (mobileOpen) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed lg:sticky inset-y-0 left-0 lg:top-0 z-40 lg:z-auto",
          "w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen overflow-y-auto",
          "transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="h-14 flex items-center px-4 border-b border-gray-200 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo height={22} />
          </Link>
        </div>

        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          {items.map((item, i) => (
            <NavItemRow
              key={i}
              item={item}
              isOpen={expandedKey === item.key}
              onToggle={() => setExpandedKey(prev => prev === item.key ? null : item.key)}
            />
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-gray-200 shrink-0 flex flex-col gap-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Eye size={15} className="text-gray-400" />
            {t.dash.topnav.viewStore}
          </Link>
          <UserAccountMenu />
        </div>
      </aside>
    </>
  );
}

/* ── Vendor account menu (avatar + name + logout) ─────────────────── */

function UserAccountMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const meQuery = useQuery({
    queryKey: ['vendor', 'me'],
    queryFn: () => vendorAuthApi.me(),
    staleTime: 60_000,
    retry: false,
  });
  const vendor = meQuery.data?.vendor;
  const displayName = vendor?.name ?? 'Vendor';
  const displayEmail = vendor?.email ?? '';
  const initials = displayName
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'V';

  const logoutMut = useMutation({
    mutationFn: () => vendorAuthApi.logout(),
    onSettled: () => {
      // Always land on the login page even if the logout API failed — token
      // is cleared client-side by vendorAuthApi.logout().
      router.replace('/login');
    },
  });

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-semibold">{initials}</span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold text-gray-900 truncate">{displayName}</p>
          <p className="text-[10px] text-gray-500 truncate">{displayEmail}</p>
        </div>
        <ChevronDown size={12} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <UserIcon size={13} /> Account settings
          </Link>
          <button
            type="button"
            disabled={logoutMut.isPending}
            onClick={() => {
              setOpen(false);
              logoutMut.mutate();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <LogOut size={13} /> {logoutMut.isPending ? 'Signing out...' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  );
}
