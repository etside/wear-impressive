'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Store, Palette, Bell, Shield, ShoppingCart,
  UserCog, GitBranch, CreditCard, Truck, ChevronLeft, Menu, Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SETTINGS_NAV = [
  { slug: 'general',       label: 'General',              icon: Store },
  { slug: 'branding',      label: 'Branding',             icon: Palette },
  { slug: 'notifications', label: 'Notifications',        icon: Bell },
  { slug: 'security',      label: 'Security',             icon: Shield },
  { slug: 'checkout',      label: 'Checkout',             icon: ShoppingCart },
  { slug: 'users',         label: 'Users',                icon: UserCog },
  { slug: 'locations',     label: 'Locations',            icon: GitBranch },
  { slug: 'payments',      label: 'Payments',             icon: CreditCard },
  { slug: 'shipping',      label: 'Shipping & Delivery',  icon: Truck },
  { slug: 'marketing',     label: 'Meta Pixel',           icon: CreditCard },
  { slug: 'gtm',           label: 'Google Tag Manager',   icon: Tag },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentSlug = pathname.split('/dashboard/settings/')[1]?.split('/')[0] || 'general';
  const currentItem = SETTINGS_NAV.find(i => i.slug === currentSlug);

  // Mobile drawer state — auto-closes on navigation so picking a setting
  // both opens that page and dismisses the panel.
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (mobileOpen) setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="flex min-h-[calc(100vh-56px)] relative">
      {/* Mobile-only header bar with hamburger + current section name */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-12 px-4 flex items-center gap-3 border-b border-gray-200 bg-white z-10">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open settings menu"
          className="w-9 h-9 -ml-2 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-700"
        >
          <Menu size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-900 truncate">
          {currentItem?.label ?? 'Settings'}
        </span>
      </div>

      {/* Backdrop (mobile only, when drawer open) */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar — sticky on md+, slide-in drawer below md */}
      <aside
        className={cn(
          'fixed md:sticky inset-y-0 left-0 md:top-0 z-40 md:z-auto',
          'w-64 shrink-0 border-r border-gray-200 bg-white py-4 px-3 overflow-y-auto h-screen md:h-auto',
          'transition-transform duration-200 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-4 px-2">
          <ChevronLeft size={14} /> Back to dashboard
        </Link>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Settings</h2>
        <nav className="space-y-0.5">
          {SETTINGS_NAV.map(item => {
            const isActive = currentSlug === item.slug;
            const Icon = item.icon;
            return (
              <Link
                key={item.slug}
                href={`/dashboard/settings/${item.slug}`}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[#2596be]/10 text-[#2596be] font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-[#2596be]' : 'text-gray-400'} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content — pushed down on mobile by the 12px header bar */}
      <main className="flex-1 p-6 pt-16 md:pt-6 overflow-y-auto min-w-0">
        <div className="max-w-3xl">
          {children}
        </div>
      </main>
    </div>
  );
}
