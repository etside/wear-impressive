'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown, ChevronRight, Search,
  Home, Package, FileText, BookOpen, BookMarked, Layers, Link2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cmsPagesApi, blogPostsApi, blogCategoriesApi } from '@/lib/api/services/vendor-content';
import { productsApi, categoriesApi } from '@/lib/api/services/vendor-products';

interface PickerItem {
  label: string;
  path: string;
}

interface Section {
  title: string;
  icon: LucideIcon;
  items: PickerItem[];
  loading?: boolean;
}

export function MenuLinkPicker({
  onChange,
  onClose,
}: {
  onChange: (path: string, label: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState('');

  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const productsQuery = useQuery({
    queryKey: ['vendor', 'menus', 'picker', 'products', debouncedQ],
    queryFn: () => productsApi.list({ search: debouncedQ || undefined, per_page: 30 }),
  });
  const categoriesQuery = useQuery({
    queryKey: ['vendor', 'menus', 'picker', 'categories', debouncedQ],
    queryFn: () => categoriesApi.list({ search: debouncedQ || undefined, per_page: 50 }),
  });
  const pagesQuery = useQuery({
    queryKey: ['vendor', 'menus', 'picker', 'pages', debouncedQ],
    queryFn: () => cmsPagesApi.list({ search: debouncedQ || undefined, per_page: 30 }),
  });
  const blogPostsQuery = useQuery({
    queryKey: ['vendor', 'menus', 'picker', 'blog-posts', debouncedQ],
    queryFn: () => blogPostsApi.list({ search: debouncedQ || undefined, per_page: 30 }),
  });
  const blogCategoriesQuery = useQuery({
    queryKey: ['vendor', 'menus', 'picker', 'blog-categories'],
    queryFn: () => blogCategoriesApi.list({}),
  });

  // Emit storefront-relative paths (no `/store/` prefix). The storefront
  // layout prepends the active shop base (`/shops/{handle}`) at render time,
  // so these paths are portable across stores and bypass the legacy redirect.
  const apiProducts = useMemo<PickerItem[]>(
    () => (productsQuery.data?.data ?? []).map(p => ({
      label: p.name,
      path: `/products/${p.url_handle ?? p.id}`,
    })),
    [productsQuery.data]
  );
  const apiCategories = useMemo<PickerItem[]>(
    () => (categoriesQuery.data?.data ?? []).map(c => ({
      label: c.name,
      path: `/products?category=${c.slug}`,
    })),
    [categoriesQuery.data]
  );
  const apiPages = useMemo<PickerItem[]>(
    () => (pagesQuery.data?.data ?? []).map(p => ({
      label: p.title,
      path: `/pages/${p.slug}`,
    })),
    [pagesQuery.data]
  );
  const apiBlogPosts = useMemo<PickerItem[]>(
    () => (blogPostsQuery.data?.data ?? []).map(p => ({
      label: p.title,
      path: `/blog/${p.slug}`,
    })),
    [blogPostsQuery.data]
  );
  const apiBlogCategories = useMemo<PickerItem[]>(
    () => (blogCategoriesQuery.data?.data ?? []).map(c => ({
      label: c.name,
      path: `/blog?cat=${c.slug}`,
    })),
    [blogCategoriesQuery.data]
  );

  const sections: Section[] = [
    { title: 'Pages', icon: Home, items: [
      { label: 'Home',     path: '/' },
      { label: 'Shop All', path: '/products' },
      { label: 'Blog',     path: '/blog' },
      { label: 'About',    path: '/about' },
      { label: 'Contact',  path: '/contact' },
      { label: 'Search',   path: '/search' },
      { label: 'Cart',     path: '/cart' },
    ]},
    { title: 'Products',        icon: Package,    items: apiProducts,       loading: productsQuery.isLoading },
    { title: 'Categories',      icon: Layers,     items: apiCategories,     loading: categoriesQuery.isLoading },
    { title: 'Custom Pages',    icon: FileText,   items: apiPages,          loading: pagesQuery.isLoading },
    { title: 'Blog Posts',      icon: BookMarked, items: apiBlogPosts,      loading: blogPostsQuery.isLoading },
    { title: 'Blog Categories', icon: BookOpen,   items: apiBlogCategories, loading: blogCategoriesQuery.isLoading },
  ];

  const allItems = sections.flatMap(s => s.items);
  const filtered = q.trim()
    ? allItems.filter(i => i.label.toLowerCase().includes(q.toLowerCase()))
    : null;

  const pick = (path: string, label: string) => { onChange(path, label); onClose(); };

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden"
      style={{ minWidth: 320 }}
    >
      <div className="p-2 border-b border-gray-100">
        <input
          autoFocus
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search pages, categories, products..."
          className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg outline-none focus:border-gray-400"
        />
      </div>

      <div className="max-h-80 overflow-y-auto">
        {filtered ? (
          filtered.length > 0 ? (
            <div className="py-1">
              {filtered.map(i => (
                <button
                  key={`${i.path}-${i.label}`}
                  onClick={() => pick(i.path, i.label)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                >
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{i.label}</p>
                    <p className="text-[10px] text-gray-400 truncate">{i.path}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-gray-400">No results found</div>
          )
        ) : (
          sections.map(section => {
            const Icon = section.icon;
            const isOpen = expanded === section.title;
            return (
              <div key={section.title}>
                <button
                  onClick={() => setExpanded(isOpen ? null : section.title)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50"
                >
                  <Icon size={14} className="text-gray-400 shrink-0" />
                  <span className="flex-1 text-xs font-semibold text-gray-700">{section.title}</span>
                  <span className="text-[10px] text-gray-400 mr-1">{section.items.length}</span>
                  {isOpen ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
                </button>
                {isOpen && (
                  <div className="bg-gray-50/50">
                    {section.loading && section.items.length === 0 ? (
                      <div className="pl-9 pr-3 py-2 text-xs text-gray-400">Loading...</div>
                    ) : section.items.length === 0 ? (
                      <div className="pl-9 pr-3 py-2 text-xs text-gray-400">
                        No {section.title.toLowerCase()} found.
                      </div>
                    ) : (
                      section.items.map(item => (
                        <button
                          key={`${item.path}-${item.label}`}
                          onClick={() => pick(item.path, item.label)}
                          className="w-full flex items-center gap-3 pl-9 pr-3 py-2 hover:bg-gray-100 text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 truncate">{item.label}</p>
                            <p className="text-[10px] text-gray-400 truncate">{item.path}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Custom URL */}
      <div className="p-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Link2 size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            placeholder="Or paste a custom URL..."
            className="flex-1 h-8 px-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400"
            onKeyDown={e => {
              if (e.key === 'Enter' && customUrl.trim()) pick(customUrl.trim(), customUrl.trim());
            }}
          />
          {customUrl.trim() && (
            <button
              onClick={() => pick(customUrl.trim(), customUrl.trim())}
              className="text-xs font-medium text-gray-700 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
