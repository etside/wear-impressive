"use client";
import { Bell, Menu, ShoppingBag, Plus } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { vendorStatsApi } from "@/lib/api/services/vendor-analytics";
import { Logo } from "@/components/ui/logo";

export function DashboardTopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  // Shares the cache with the dashboard home page's identical query, so
  // navigating between pages doesn't refetch.
  const { data: stats } = useQuery({
    queryKey: ['vendor', 'stats'],
    queryFn: () => vendorStatsApi.get(),
    staleTime: 60_000,
  });
  const pendingOrders = stats?.pending_orders ?? 0;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 sticky top-0 z-10">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
      >
        <Menu size={20} />
      </button>

      <Link href="/dashboard" className="lg:hidden flex items-center" aria-label="Wear Impressive">
        <Logo height={20} />
      </Link>

      <div className="flex items-center gap-2 ml-auto">
        <Link
          href="/dashboard/orders"
          aria-label={`Orders${pendingOrders ? ` (${pendingOrders} pending)` : ''}`}
          className="relative flex items-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3 justify-center text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ShoppingBag size={15} />
          <span className="hidden sm:inline">Orders</span>
          {pendingOrders > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-[#2596be] rounded-full">
              {pendingOrders > 99 ? '99+' : pendingOrders}
            </span>
          )}
        </Link>

        <Link
          href="/dashboard/products/add"
          aria-label="Add product"
          className="flex items-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3 justify-center text-sm font-medium rounded-lg bg-[#2596be] text-white hover:bg-[#1f7fa1] transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add product</span>
        </Link>

        <button className="relative w-9 h-9 hidden sm:flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <Bell size={18} className="text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-black rounded-full" />
        </button>
      </div>
    </header>
  );
}
