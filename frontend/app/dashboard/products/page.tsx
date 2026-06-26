'use client';
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Search, Upload, Plus, MoreHorizontal, Pencil, Copy, Trash2, Loader2, AlertCircle, Package } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect, useMemo } from "react";
import { useLang } from "@/lib/i18n/context";
import { ProductImportWizard } from "@/components/dashboard/product-import-wizard";
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi, categoriesApi } from "@/lib/api/services/vendor-products";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Product, ProductCategory } from "@/lib/api/types";

export default function ProductsPage() {
  const { t } = useLang();
  const d = t.dashProducts;
  const queryClient = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'' | 'physical' | 'digital' | 'bundle'>('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const categoryId = categoryFilter ? Number(categoryFilter) : undefined;

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['vendor', 'products', { search: debouncedSearch, category_id: categoryId, page, product_type: typeFilter }],
    queryFn: () => productsApi.list({
      search: debouncedSearch || undefined,
      category_id: categoryId,
      product_type: typeFilter || undefined,
      page,
      per_page: 20,
    }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['vendor', 'categories'],
    queryFn: () => categoriesApi.list({ per_page: 200 }),
  });

  const products: Product[] = data?.data ?? [];
  const categories: ProductCategory[] = categoriesData?.data ?? [];
  const totalPages = data?.last_page ?? 1;
  const totalCount = data?.total ?? 0;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['vendor', 'products'] });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.delete(id),
    onSuccess: () => invalidate(),
    onError: (err) => alert(getApiErrorMessage(err, 'Failed to delete product')),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => productsApi.duplicate(id),
    onSuccess: () => invalidate(),
    onError: (err) => alert(getApiErrorMessage(err, 'Failed to duplicate product')),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => productsApi.bulkDelete(ids),
    onSuccess: () => { invalidate(); setSelectedIds(new Set()); },
    onError: (err) => alert(getApiErrorMessage(err, 'Failed to delete products')),
  });

  const duplicateProduct = (p: Product) => {
    duplicateMutation.mutate(p.id);
    setOpenMenu(null);
  };

  const deleteProduct = (id: number) => {
    if (confirm('Delete this product?')) {
      deleteMutation.mutate(id);
    }
    setOpenMenu(null);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map(p => p.id)));
  };

  const bulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} product${selectedIds.size > 1 ? 's' : ''}?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedIds));
    }
  };

  const handleImport = () => {
    // After import wizard, just refresh the list from server
    invalidate();
  };

  const categoryOptions = useMemo(() => [
    { value: '', label: 'Category' },
    ...categories
      .filter(c => c.parent_id === null)
      .map(c => ({ value: String(c.id), label: c.name })),
  ], [categories]);

  const getCategoryName = (catId: number) =>
    categories.find(c => c.id === catId)?.name ?? '—';

  const formatPrice = (price: string) => {
    const n = parseFloat(price);
    if (isNaN(n)) return '\u09F3' + price;
    return '\u09F3' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      {showImport && (
        <ProductImportWizard onClose={() => setShowImport(false)} onImport={handleImport} />
      )}
      <PageHeader
        title={d.title}
        subtitle={d.subtitle}
        actions={
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button variant="secondary" size="sm" onClick={bulkDelete} disabled={bulkDeleteMutation.isPending}>
                <Trash2 size={15} /> Delete ({selectedIds.size})
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}><Upload size={15} /> {d.import}</Button>
            <Link href="/dashboard/products/add">
              <Button size="sm"><Plus size={15} /> {d.addProduct}</Button>
            </Link>
          </div>
        }
      />

      {/* Filters */}
      {/* Type tabs — All / Physical / Digital / Bundle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-4 overflow-x-auto">
        {([
          { value: '', label: 'All' },
          { value: 'physical', label: 'Physical' },
          { value: 'digital', label: 'Digital' },
          { value: 'bundle', label: 'Bundle' },
        ] as const).map(t => (
          <button key={t.value || 'all'}
            onClick={() => { setTypeFilter(t.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              typeFilter === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
        <div className="relative w-full md:flex-1 md:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={d.searchPlaceholder}
            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none bg-white"
          />
        </div>
        <div className="w-full md:w-auto">
          <SearchableSelect
            options={categoryOptions}
            value={categoryFilter}
            onChange={(v) => { setCategoryFilter(v || null); setPage(1); }}
            placeholder="Category"
            searchable={false}
            size="sm"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400">
            <Loader2 size={24} className="animate-spin mb-2" />
            <p className="text-sm">Loading products…</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-xl p-8 m-4 text-center">
            <AlertCircle size={24} className="mx-auto text-red-500 mb-2" />
            <p className="text-sm text-red-700">{getApiErrorMessage(error, 'Failed to load products')}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-2">
              {debouncedSearch || categoryFilter ? 'No products found' : 'No products yet'}
            </h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">
              {debouncedSearch || categoryFilter
                ? 'Try adjusting your search or filters'
                : 'Add your first product to get started'}
            </p>
            {!debouncedSearch && !categoryFilter && (
              <Link href="/dashboard/products/add">
                <Button size="sm"><Plus size={14} /> {d.addProduct}</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-visible">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="w-8 px-4 py-3">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedIds.size === products.length && products.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{d.tableHeaders.product}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{d.tableHeaders.category}</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">{d.tableHeaders.price}</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{d.tableHeaders.variants}</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{d.tableHeaders.stock}</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{d.tableHeaders.status}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(p => {
                    const variantCount = p.variants?.length ?? 0;
                    const stockDisplay = p.has_variants && p.variants
                      ? p.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
                      : p.stock;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center text-gray-300 text-xs overflow-hidden">
                              {p.featured_image || (p.images && p.images[0]) ? (
                                <img
                                  src={p.featured_image || p.images[0]}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                'IMG'
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 flex items-center gap-1.5">
                                {p.name}
                                {p.product_type === 'bundle' && (
                                  <span className="inline-flex items-center text-[10px] font-semibold bg-[#2596be]/10 text-[#2596be] px-1.5 py-0.5 rounded">
                                    Bundle
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-gray-500">SKU: {p.sku || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {p.category?.name ?? getCategoryName(p.category_id)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {p.product_type === 'bundle'
                            ? (p.bundle_price ? `৳${parseFloat(p.bundle_price).toLocaleString()}` : '—')
                            : formatPrice(p.price)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {p.product_type === 'bundle' ? (p.bundle_components?.length ?? 0) : variantCount}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.product_type === 'bundle' ? (
                            <Badge variant="default">—</Badge>
                          ) : (
                            <Badge variant={stockDisplay === 0 ? "error" : stockDisplay < 10 ? "warning" : "success"}>
                              {stockDisplay === 0 ? "Out of stock" : `${stockDisplay} in stock`}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={p.status === "active" ? "success" : "default"}>
                            {p.status === "active" ? d.active : p.status === "archived" ? "Archived" : d.draft}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="relative" ref={openMenu === p.id ? menuRef : undefined}>
                            <Button variant="ghost" size="xs" onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}>
                              <MoreHorizontal size={15} />
                            </Button>
                            {openMenu === p.id && (
                              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                                {/* Bundle edit isn't supported in v1 — route bundles
                                    to the dedicated wizard URL (which today handles
                                    create only; future patch will add ?edit=id). */}
                                <Link
                                  href={p.product_type === 'bundle'
                                    ? `/dashboard/products/add/bundle?edit=${p.id}`
                                    : `/dashboard/products/add?edit=${p.id}`}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                >
                                  <Pencil size={13} /> Edit
                                </Link>
                                <button onClick={() => duplicateProduct(p)}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 w-full text-left">
                                  <Copy size={13} /> Duplicate
                                </button>
                                <button onClick={() => deleteProduct(p.id)}
                                  className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 w-full text-left">
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden p-3 space-y-2">
              {products.map(p => {
                const variantCount = p.variants?.length ?? 0;
                const stockDisplay = p.has_variants && p.variants
                  ? p.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
                  : p.stock;
                const categoryName = p.category?.name ?? getCategoryName(p.category_id);
                return (
                  <MobileRowCard
                    key={p.id}
                    selected={selectedIds.has(p.id)}
                    onSelect={() => toggleSelect(p.id)}
                    header={
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center text-gray-300 text-[10px] overflow-hidden">
                          {p.featured_image || (p.images && p.images[0]) ? (
                            <img
                              src={p.featured_image || p.images[0]}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            'IMG'
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                            {p.product_type === 'bundle' && (
                              <span className="inline-flex items-center text-[9px] font-semibold bg-[#2596be]/10 text-[#2596be] px-1.5 py-0.5 rounded shrink-0">
                                Bundle
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate">SKU: {p.sku || '—'}</p>
                        </div>
                      </div>
                    }
                    trailing={
                      <span className="font-semibold text-gray-900 text-sm">{formatPrice(p.price)}</span>
                    }
                    meta={
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={stockDisplay === 0 ? "error" : stockDisplay < 10 ? "warning" : "success"}>
                          {stockDisplay === 0 ? "Out of stock" : `${stockDisplay} in stock`}
                        </Badge>
                        <Badge variant={p.status === "active" ? "success" : "default"}>
                          {p.status === "active" ? d.active : p.status === "archived" ? "Archived" : d.draft}
                        </Badge>
                      </div>
                    }
                    actions={
                      <>
                        <Link
                          href={p.product_type === 'bundle'
                            ? `/dashboard/products/add/bundle?edit=${p.id}`
                            : `/dashboard/products/add?edit=${p.id}`}
                          className="flex-1"
                        >
                          <Button variant="secondary" size="xs" className="w-full justify-center">
                            <Pencil size={12} /> Edit
                          </Button>
                        </Link>
                        <button
                          onClick={() => duplicateProduct(p)}
                          aria-label="Duplicate product"
                          className="h-7 w-7 flex items-center justify-center rounded text-gray-600 hover:bg-gray-100"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                          aria-label="Delete product"
                          className="h-7 w-7 flex items-center justify-center rounded text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    }
                    details={
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Category</span>
                          <span className="text-gray-900">{categoryName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Variants</span>
                          <span className="text-gray-900">{variantCount}</span>
                        </div>
                      </>
                    }
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {isFetching && <Loader2 size={12} className="inline animate-spin mr-1" />}
                Showing {data?.from ?? 0}–{data?.to ?? 0} of {totalCount} products
              </p>
              {totalPages > 1 && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 h-8 text-xs rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    // Show first, last, current +/- 1
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (page <= 3) pageNum = i + 1;
                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = page - 2 + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 text-xs rounded-lg ${
                          pageNum === page ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 h-8 text-xs rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
