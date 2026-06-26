'use client';
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ArrowLeftRight, Menu } from "lucide-react";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { navigationMenusApi } from "@/lib/api/services/vendor-content";
import { getApiErrorMessage } from "@/lib/api/client";

export default function MenusPage() {
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3500);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['vendor', 'navigation-menus'],
    queryFn: () => navigationMenusApi.list({ per_page: 100 }),
  });
  const menus = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => navigationMenusApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vendor', 'navigation-menus'] }); showBanner('success', 'Menu deleted'); },
    onError: (err) => showBanner('error', getApiErrorMessage(err, 'Failed to delete')),
  });

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Menus</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your storefront navigation menus</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/content/redirects">
            <Button variant="secondary" size="sm">
              <ArrowLeftRight size={14} /> URL Redirects
            </Button>
          </Link>
          <Link href="/dashboard/content/menus/new">
            <Button size="sm">
              <Plus size={14} /> Create Menu
            </Button>
          </Link>
        </div>
      </div>

      {banner && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm border ${
          banner.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {banner.message}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">Loading...</div>
        ) : menus.length === 0 ? (
          <div className="py-16 text-center">
            <Menu size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500 mb-1">No menus yet</p>
            <p className="text-xs text-gray-400 mb-4">Create a navigation menu for your storefront</p>
            <Link href="/dashboard/content/menus/new">
              <Button size="sm"><Plus size={14} /> Create Menu</Button>
            </Link>
          </div>
        ) : (
          <>
          {/* Desktop table */}
          <table className="hidden md:table w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Menu</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Menu items</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {menus.map(menu => (
                <tr key={menu.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/content/menus/${menu.id}`}
                      className="font-medium text-gray-900 hover:underline">
                      {menu.name}
                    </Link>
                    <p className="text-[11px] text-gray-400 mt-0.5">/{menu.handle}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {(menu.items ?? []).map(i => i.label).join(', ') || <span className="text-gray-300">No items</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/dashboard/content/menus/${menu.id}`}>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                          <Pencil size={13} />
                        </button>
                      </Link>
                      <button onClick={() => { if (confirm('Delete this menu?')) deleteMutation.mutate(menu.id); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden p-3 space-y-2">
            {menus.map(menu => {
              const items = menu.items ?? [];
              const itemLabels = items.map(i => i.label).join(', ');
              return (
                <MobileRowCard
                  key={menu.id}
                  header={
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/content/menus/${menu.id}`}
                        className="font-medium text-gray-900 hover:underline text-sm"
                      >
                        {menu.name}
                      </Link>
                      <p className="font-mono text-[11px] text-gray-400">/{menu.handle}</p>
                    </div>
                  }
                  trailing={
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-900">{items.length}</p>
                      <p className="text-[10px] text-gray-400 -mt-0.5">items</p>
                    </div>
                  }
                  meta={
                    items.length > 0 ? (
                      <span className="text-gray-500 line-clamp-2">{itemLabels}</span>
                    ) : (
                      <span className="text-gray-400">No items yet</span>
                    )
                  }
                  actions={
                    <>
                      <Link href={`/dashboard/content/menus/${menu.id}`} className="flex-1">
                        <Button variant="secondary" size="xs" className="w-full justify-center">
                          <Pencil size={11} /> Edit
                        </Button>
                      </Link>
                      <button
                        onClick={() => { if (confirm('Delete this menu?')) deleteMutation.mutate(menu.id); }}
                        aria-label="Delete menu"
                        className="h-7 w-7 flex items-center justify-center rounded text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  }
                />
              );
            })}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
