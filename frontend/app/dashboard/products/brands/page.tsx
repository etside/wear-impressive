'use client';
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ImageUpload } from '@/components/ui/image-upload';
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { brandsApi, categoriesApi, type BrandCreatePayload } from "@/lib/api/services/vendor-products";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Brand, ProductCategory } from "@/lib/api/types";
import {
  Plus, X, Check, Pencil, Trash2, Search,
  Building2, Globe, FileText, Star,
  ShoppingBag, Shirt, Watch, Laptop, Smartphone, Camera, Headphones, Tv,
  Coffee, Pizza, Dumbbell, Car, Baby, BookOpen, Briefcase, Home, Gem,
  Palette, Music, Gamepad2, Glasses, Scissors, Pill, Apple,
  Heart, Gift, Package, Bike, Plane, Utensils, Zap, Layers,
  Dog, Flower2, Flame, Leaf, Sparkles, Store, Sofa, Wrench, Hammer,
  Backpack, Cpu, Diamond, Tag, Folder,
  Loader2, AlertCircle,
} from "lucide-react";

/* ── Reuse the same curated icon set ──────────────────────────────── */
const LUCIDE_ICONS: { name: string; icon: React.ReactNode }[] = [
  { name: 'ShoppingBag', icon: <ShoppingBag size={16} /> },
  { name: 'Shirt',       icon: <Shirt size={16} /> },
  { name: 'Watch',       icon: <Watch size={16} /> },
  { name: 'Laptop',      icon: <Laptop size={16} /> },
  { name: 'Smartphone',  icon: <Smartphone size={16} /> },
  { name: 'Camera',      icon: <Camera size={16} /> },
  { name: 'Headphones',  icon: <Headphones size={16} /> },
  { name: 'Tv',          icon: <Tv size={16} /> },
  { name: 'Coffee',      icon: <Coffee size={16} /> },
  { name: 'Pizza',       icon: <Pizza size={16} /> },
  { name: 'Dumbbell',    icon: <Dumbbell size={16} /> },
  { name: 'Car',         icon: <Car size={16} /> },
  { name: 'Baby',        icon: <Baby size={16} /> },
  { name: 'BookOpen',    icon: <BookOpen size={16} /> },
  { name: 'Briefcase',   icon: <Briefcase size={16} /> },
  { name: 'Home',        icon: <Home size={16} /> },
  { name: 'Gem',         icon: <Gem size={16} /> },
  { name: 'Palette',     icon: <Palette size={16} /> },
  { name: 'Music',       icon: <Music size={16} /> },
  { name: 'Gamepad2',    icon: <Gamepad2 size={16} /> },
  { name: 'Glasses',     icon: <Glasses size={16} /> },
  { name: 'Scissors',    icon: <Scissors size={16} /> },
  { name: 'Pill',        icon: <Pill size={16} /> },
  { name: 'Apple',       icon: <Apple size={16} /> },
  { name: 'Star',        icon: <Star size={16} /> },
  { name: 'Heart',       icon: <Heart size={16} /> },
  { name: 'Gift',        icon: <Gift size={16} /> },
  { name: 'Package',     icon: <Package size={16} /> },
  { name: 'Bike',        icon: <Bike size={16} /> },
  { name: 'Plane',       icon: <Plane size={16} /> },
  { name: 'Utensils',    icon: <Utensils size={16} /> },
  { name: 'Zap',         icon: <Zap size={16} /> },
  { name: 'Globe',       icon: <Globe size={16} /> },
  { name: 'Layers',      icon: <Layers size={16} /> },
  { name: 'Dog',         icon: <Dog size={16} /> },
  { name: 'Flower2',     icon: <Flower2 size={16} /> },
  { name: 'Flame',       icon: <Flame size={16} /> },
  { name: 'Leaf',        icon: <Leaf size={16} /> },
  { name: 'Sparkles',    icon: <Sparkles size={16} /> },
  { name: 'Store',       icon: <Store size={16} /> },
  { name: 'Sofa',        icon: <Sofa size={16} /> },
  { name: 'Wrench',      icon: <Wrench size={16} /> },
  { name: 'Hammer',      icon: <Hammer size={16} /> },
  { name: 'Backpack',    icon: <Backpack size={16} /> },
  { name: 'Cpu',         icon: <Cpu size={16} /> },
  { name: 'Diamond',     icon: <Diamond size={16} /> },
  { name: 'Tag',         icon: <Tag size={16} /> },
  { name: 'Building2',   icon: <Building2 size={16} /> },
];

function getIconNode(name: string | null): React.ReactNode {
  if (!name) return <Building2 size={16} />;
  return LUCIDE_ICONS.find(i => i.name === name)?.icon ?? <Building2 size={16} />;
}

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* ── Logo Picker (same pattern as icon picker in categories) ─────── */
function LogoPicker({
  logoType, logoName, logoUrl, onChange,
}: {
  logoType: 'lucide' | 'upload' | null;
  logoName: string | null;
  logoUrl:  string | null;
  onChange: (t: 'lucide' | 'upload' | null, n: string | null, u: string | null) => void;
}) {
  const [tab,    setTab]    = useState<'lucide' | 'upload'>(logoType === 'upload' ? 'upload' : 'lucide');
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? LUCIDE_ICONS.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : LUCIDE_ICONS;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex border-b border-gray-100 bg-gray-50">
        {(['lucide', 'upload'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 border-b-2 border-black -mb-px' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'lucide' ? 'Lucide icons' : 'Upload logo'}
          </button>
        ))}
      </div>

      {tab === 'lucide' ? (
        <div className="p-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 rounded-lg mb-3">
            <Search size={12} className="text-gray-400 shrink-0" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search icons…"
              className="flex-1 text-xs outline-none bg-transparent" />
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
            <button type="button" title="None"
              onClick={() => onChange(null, null, null)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors text-xs text-gray-400 ${
                !logoName && logoType !== 'upload' ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-gray-400'
              }`}>—</button>
            {filtered.map(ic => (
              <button key={ic.name} type="button" title={ic.name}
                onClick={() => onChange('lucide', ic.name, null)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                  logoType === 'lucide' && logoName === ic.name
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 hover:border-gray-400 text-gray-600'
                }`}>
                {ic.icon}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4">
          <ImageUpload
            value={logoUrl || ''}
            onChange={(url) => onChange('upload', null, url)}
            variant="square"
            cropWidth={400}
            cropHeight={400}
            cropLabel="Crop Brand Logo"
            className="w-20 h-20 mx-auto"
          />
        </div>
      )}
    </div>
  );
}

/* ── Brand Modal ───────────────────────────────────────────────────── */
function BrandModal({
  brand,
  categories,
  onClose,
  onSave,
  saving,
  error,
}: {
  brand?: Brand;
  categories: ProductCategory[];
  onClose: () => void;
  onSave: (b: BrandCreatePayload) => void;
  saving: boolean;
  error: string | null;
}) {
  const [name,          setName]          = useState(brand?.name        ?? '');
  const [slugManual,    setSlugManual]    = useState(!!brand);
  const [slugValue,     setSlugValue]     = useState(brand?.slug        ?? '');
  const [logoType,      setLogoType]      = useState<'lucide' | 'upload' | null>(brand?.logo_type ?? null);
  const [logoName,      setLogoName]      = useState<string | null>(brand?.logo_name ?? null);
  const [logoUrl,       setLogoUrl]       = useState<string | null>(brand?.logo_url  ?? null);
  const [categoryId,    setCategoryId]    = useState<number | null>(brand?.category_id    ?? null);
  const [subCategoryId, setSubCategoryId] = useState<number | null>(brand?.sub_category_id ?? null);
  const [website,       setWebsite]       = useState(brand?.website     ?? '');
  const [description,   setDescription]   = useState(brand?.description ?? '');
  const [featured,      setFeatured]      = useState(brand?.featured    ?? false);

  const autoSlug = toSlug(name);
  const slug     = slugManual ? slugValue : autoSlug;

  const topCategories = categories.filter(c => c.parent_id === null);
  const subCategories = categoryId
    ? categories.filter(c => c.parent_id === categoryId)
    : [];

  const handleCategory = (val: string) => {
    setCategoryId(val ? Number(val) : null);
    setSubCategoryId(null);
  };

  const logoPreview = logoType === 'upload' && logoUrl
    ? <img src={logoUrl} alt="" className="w-5 h-5 rounded object-cover" />
    : <span className="text-gray-600">{getIconNode(logoName)}</span>;

  const canSave = name.trim().length > 0 && !saving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[580px] max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {brand ? 'Edit brand' : 'Add brand'}
          </h2>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
              <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
          {/* Name + slug */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Brand name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g., Samsung, Aarong, Apex"
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 shrink-0">/brands/</span>
              <input type="text"
                value={slugManual ? slugValue : autoSlug}
                onChange={e => { setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugManual(true); }}
                className="flex-1 h-9 px-3 text-sm font-mono border border-gray-200 rounded-lg focus:border-gray-400 outline-none" />
            </div>
            {slugManual && (
              <button type="button" onClick={() => setSlugManual(false)}
                className="text-[11px] text-blue-600 hover:underline mt-1">
                Reset to auto-generated
              </button>
            )}
          </div>

          {/* Logo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Logo / Icon
              {logoType && (
                <span className="ml-2 inline-flex items-center gap-1 text-gray-500 font-normal">
                  {logoPreview}
                  {logoType === 'lucide' && logoName && <span>{logoName}</span>}
                </span>
              )}
            </label>
            <LogoPicker
              logoType={logoType} logoName={logoName} logoUrl={logoUrl}
              onChange={(t, n, u) => { setLogoType(t); setLogoName(n); setLogoUrl(u); }}
            />
          </div>

          {/* Category + subcategory */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Category</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <SearchableSelect
                  label="Category"
                  options={[
                    { value: '', label: 'Select category' },
                    ...topCategories.map(c => ({ value: String(c.id), label: c.name })),
                  ]}
                  value={categoryId !== null ? String(categoryId) : ''}
                  onChange={(v) => handleCategory(v)}
                  placeholder="Select category"
                />
              </div>

              <div>
                <SearchableSelect
                  label="Sub-category"
                  options={[
                    { value: '', label: !categoryId ? 'Select category first' : subCategories.length === 0 ? 'No sub-categories' : 'All sub-categories' },
                    ...subCategories.map(c => ({ value: String(c.id), label: c.name })),
                  ]}
                  value={subCategoryId !== null ? String(subCategoryId) : ''}
                  onChange={(v) => setSubCategoryId(v ? Number(v) : null)}
                  placeholder={!categoryId ? 'Select category first' : subCategories.length === 0 ? 'No sub-categories' : 'All sub-categories'}
                  disabled={!categoryId || subCategories.length === 0}
                />
              </div>
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Website <span className="text-gray-400 font-normal">optional</span>
            </label>
            <div className="relative">
              <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="url" value={website ?? ''} onChange={e => setWebsite(e.target.value)}
                placeholder="https://brand.com"
                className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Description <span className="text-gray-400 font-normal">optional</span>
            </label>
            <textarea value={description ?? ''} onChange={e => setDescription(e.target.value)}
              placeholder="Short brand description shown on store…"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none resize-none" />
          </div>

          {/* Featured */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)}
              className="accent-black" />
            <span className="text-sm text-gray-700">Feature this brand on the storefront</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" disabled={!canSave}
            onClick={() => onSave({
              name: name.trim(),
              slug: slug || toSlug(name),
              logo_type: logoType,
              logo_name: logoName,
              logo_url: logoUrl,
              category_id: categoryId,
              sub_category_id: subCategoryId,
              website: website || null,
              description: description || null,
              featured,
            })}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {brand ? 'Save changes' : 'Add brand'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────── */

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const [showModal,  setShowModal]  = useState(false);
  const [editBrand,  setEditBrand]  = useState<Brand | undefined>();
  const [search,     setSearch]     = useState('');
  const [filterCat,  setFilterCat]  = useState<number | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data: brandsData, isLoading, error } = useQuery({
    queryKey: ['vendor', 'brands', { search, category_id: filterCat }],
    queryFn: () => brandsApi.list({
      search: search || undefined,
      category_id: filterCat ?? undefined,
      per_page: 200,
    }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['vendor', 'categories'],
    queryFn: () => categoriesApi.list({ per_page: 200 }),
  });

  const brands: Brand[] = brandsData?.data ?? [];
  const categories: ProductCategory[] = categoriesData?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['vendor', 'brands'] });

  const createMutation = useMutation({
    mutationFn: (payload: BrandCreatePayload) => brandsApi.create(payload),
    onSuccess: () => { invalidate(); setShowModal(false); setEditBrand(undefined); setMutationError(null); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to create brand')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: BrandCreatePayload }) =>
      brandsApi.update(id, payload),
    onSuccess: () => { invalidate(); setShowModal(false); setEditBrand(undefined); setMutationError(null); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to update brand')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => brandsApi.delete(id),
    onSuccess: () => invalidate(),
    onError: (err) => alert(getApiErrorMessage(err, 'Failed to delete brand')),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: (id: number) => brandsApi.toggleFeatured(id),
    onSuccess: () => invalidate(),
    onError: (err) => alert(getApiErrorMessage(err, 'Failed to toggle featured')),
  });

  const openAdd  = () => { setEditBrand(undefined); setMutationError(null); setShowModal(true); };
  const openEdit = (b: Brand) => { setEditBrand(b); setMutationError(null); setShowModal(true); };

  const handleSave = (data: BrandCreatePayload) => {
    if (editBrand) {
      updateMutation.mutate({ id: editBrand.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const deleteBrand = (id: number) => {
    if (confirm('Delete this brand?')) {
      deleteMutation.mutate(id);
    }
  };

  const topCategories = categories.filter(c => c.parent_id === null);

  const categoryName = (id: number | null) =>
    id ? categories.find(c => c.id === id)?.name ?? '—' : null;

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Brands</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage brands and associate them with categories</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus size={14} /> Add brand</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search brands…"
            className="flex-1 text-sm outline-none bg-transparent" />
          {search && <button onClick={() => setSearch('')}><X size={13} className="text-gray-400" /></button>}
        </div>

        <SearchableSelect
          options={[
            { value: '', label: 'All categories' },
            ...topCategories.map(c => ({ value: String(c.id), label: c.name })),
          ]}
          value={filterCat !== null ? String(filterCat) : ''}
          onChange={(v) => setFilterCat(v ? Number(v) : null)}
          placeholder="All categories"
          size="sm"
        />
      </div>

      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 flex flex-col items-center justify-center text-gray-400">
          <Loader2 size={24} className="animate-spin mb-2" />
          <p className="text-sm">Loading brands…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-xl p-8 text-center">
          <AlertCircle size={24} className="mx-auto text-red-500 mb-2" />
          <p className="text-sm text-red-700">{getApiErrorMessage(error, 'Failed to load brands')}</p>
        </div>
      ) : brands.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Building2 size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-2">No brands yet</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">
            Add the brands you carry so customers can filter and browse by brand.
          </p>
          <Button size="sm" onClick={openAdd}><Plus size={14} /> Add brand</Button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl">
          {/* Desktop table */}
          <table className="hidden md:table w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Brand</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Sub-category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Website</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Products</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Featured</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {brands.map(brand => {
                const logoNode = brand.logo_type === 'upload' && brand.logo_url
                  ? <img src={brand.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover" />
                  : <span className="text-gray-600">{getIconNode(brand.logo_name)}</span>;

                return (
                  <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                          {logoNode}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{brand.name}</p>
                          <p className="text-[11px] font-mono text-gray-400">/brands/{brand.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {categoryName(brand.category_id) ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {categoryName(brand.sub_category_id) ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {brand.website ? (
                        <span className="flex items-center gap-1 text-xs text-blue-600">
                          <Globe size={11} />
                          <span className="truncate max-w-[120px]">
                            {brand.website.replace(/^https?:\/\//, '')}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                      {brand.products_count ?? brand.product_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleFeaturedMutation.mutate(brand.id)}
                        disabled={toggleFeaturedMutation.isPending}
                        className="disabled:opacity-50"
                        title={brand.featured ? 'Remove featured' : 'Mark as featured'}
                      >
                        {brand.featured ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full hover:bg-yellow-100 transition-colors">
                            <Star size={9} className="fill-yellow-500 stroke-yellow-500" /> Featured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 px-2 py-0.5 rounded-full hover:bg-gray-100 transition-colors">
                            <Star size={9} /> Feature
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(brand)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteBrand(brand.id)}
                          disabled={deleteMutation.isPending}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 disabled:opacity-50">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden p-3 space-y-2">
            {brands.map(brand => {
              const logoNode = brand.logo_type === 'upload' && brand.logo_url
                ? <img src={brand.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover" />
                : <span className="text-gray-600">{getIconNode(brand.logo_name)}</span>;
              const productCount = brand.products_count ?? brand.product_count ?? 0;
              const cat = categoryName(brand.category_id);
              const sub = categoryName(brand.sub_category_id);

              return (
                <MobileRowCard
                  key={brand.id}
                  header={
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        {logoNode}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{brand.name}</p>
                          {brand.featured && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded-full">
                              <Star size={9} className="fill-yellow-500 stroke-yellow-500" /> Featured
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-gray-400 truncate">/brands/{brand.slug}</p>
                      </div>
                    </div>
                  }
                  trailing={
                    <div className="text-right">
                      <p className="text-base font-bold text-gray-900">{productCount}</p>
                      <p className="text-[10px] text-gray-400 -mt-0.5">products</p>
                    </div>
                  }
                  meta={
                    cat ? (
                      <span className="text-gray-600">
                        {cat}{sub && <span className="text-gray-400"> › {sub}</span>}
                      </span>
                    ) : (
                      <span className="text-gray-400">No category</span>
                    )
                  }
                  actions={
                    <>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => openEdit(brand)}
                      >
                        <Pencil size={11} /> Edit
                      </Button>
                      <button
                        onClick={() => toggleFeaturedMutation.mutate(brand.id)}
                        disabled={toggleFeaturedMutation.isPending}
                        aria-label={brand.featured ? 'Remove featured' : 'Mark as featured'}
                        className={`h-7 w-7 flex items-center justify-center rounded disabled:opacity-50 ${
                          brand.featured ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <Star size={13} className={brand.featured ? 'fill-yellow-500 stroke-yellow-500' : ''} />
                      </button>
                      <button
                        onClick={() => deleteBrand(brand.id)}
                        disabled={deleteMutation.isPending}
                        aria-label="Delete brand"
                        className="h-7 w-7 flex items-center justify-center rounded text-red-500 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  }
                  details={
                    brand.website ? (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Website</p>
                        <a
                          href={brand.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline break-all"
                        >
                          <Globe size={12} /> {brand.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    ) : null
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <BrandModal
          brand={editBrand}
          categories={categories}
          onClose={() => { setShowModal(false); setEditBrand(undefined); setMutationError(null); }}
          onSave={handleSave}
          saving={saving}
          error={mutationError}
        />
      )}
    </div>
  );
}
