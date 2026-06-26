'use client';
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ImageUpload } from '@/components/ui/image-upload';
import { MobileRowCard } from "@/components/ui/mobile-row-card";
import { categoriesApi, type CategoryCreatePayload } from "@/lib/api/services/vendor-products";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ProductCategory } from "@/lib/api/types";
import {
  Plus, X, Check, Pencil, Trash2, Search,
  Folder, FolderOpen, Tag,
  ShoppingBag, Shirt, Watch, Laptop, Smartphone, Camera, Headphones, Tv,
  Coffee, Pizza, Dumbbell, Car, Baby, BookOpen, Briefcase, Home, Gem,
  Palette, Music, Gamepad2, Glasses, Scissors, Pill, Apple, Star,
  Heart, Gift, Package, Bike, Plane, Utensils, Zap, Globe, Layers,
  Dog, Flower2, Flame, Leaf, Sparkles, Store, Sofa, Wrench, Hammer,
  Footprints, Backpack, ClipboardList, Cpu, Diamond, Drumstick,
  Loader2, AlertCircle,
} from "lucide-react";

/* ── Curated icon list ─────────────────────────────────────────────── */
const LUCIDE_ICONS: { name: string; icon: React.ReactNode }[] = [
  { name: 'ShoppingBag',   icon: <ShoppingBag size={16} /> },
  { name: 'Shirt',         icon: <Shirt size={16} /> },
  { name: 'Watch',         icon: <Watch size={16} /> },
  { name: 'Laptop',        icon: <Laptop size={16} /> },
  { name: 'Smartphone',    icon: <Smartphone size={16} /> },
  { name: 'Camera',        icon: <Camera size={16} /> },
  { name: 'Headphones',    icon: <Headphones size={16} /> },
  { name: 'Tv',            icon: <Tv size={16} /> },
  { name: 'Coffee',        icon: <Coffee size={16} /> },
  { name: 'Pizza',         icon: <Pizza size={16} /> },
  { name: 'Dumbbell',      icon: <Dumbbell size={16} /> },
  { name: 'Car',           icon: <Car size={16} /> },
  { name: 'Baby',          icon: <Baby size={16} /> },
  { name: 'BookOpen',      icon: <BookOpen size={16} /> },
  { name: 'Briefcase',     icon: <Briefcase size={16} /> },
  { name: 'Home',          icon: <Home size={16} /> },
  { name: 'Gem',           icon: <Gem size={16} /> },
  { name: 'Palette',       icon: <Palette size={16} /> },
  { name: 'Music',         icon: <Music size={16} /> },
  { name: 'Gamepad2',      icon: <Gamepad2 size={16} /> },
  { name: 'Glasses',       icon: <Glasses size={16} /> },
  { name: 'Scissors',      icon: <Scissors size={16} /> },
  { name: 'Pill',          icon: <Pill size={16} /> },
  { name: 'Apple',         icon: <Apple size={16} /> },
  { name: 'Star',          icon: <Star size={16} /> },
  { name: 'Heart',         icon: <Heart size={16} /> },
  { name: 'Gift',          icon: <Gift size={16} /> },
  { name: 'Package',       icon: <Package size={16} /> },
  { name: 'Bike',          icon: <Bike size={16} /> },
  { name: 'Plane',         icon: <Plane size={16} /> },
  { name: 'Utensils',      icon: <Utensils size={16} /> },
  { name: 'Zap',           icon: <Zap size={16} /> },
  { name: 'Globe',         icon: <Globe size={16} /> },
  { name: 'Layers',        icon: <Layers size={16} /> },
  { name: 'Dog',           icon: <Dog size={16} /> },
  { name: 'Flower2',       icon: <Flower2 size={16} /> },
  { name: 'Flame',         icon: <Flame size={16} /> },
  { name: 'Leaf',          icon: <Leaf size={16} /> },
  { name: 'Sparkles',      icon: <Sparkles size={16} /> },
  { name: 'Store',         icon: <Store size={16} /> },
  { name: 'Sofa',          icon: <Sofa size={16} /> },
  { name: 'Wrench',        icon: <Wrench size={16} /> },
  { name: 'Hammer',        icon: <Hammer size={16} /> },
  { name: 'Backpack',      icon: <Backpack size={16} /> },
  { name: 'Cpu',           icon: <Cpu size={16} /> },
  { name: 'Diamond',       icon: <Diamond size={16} /> },
  { name: 'Tag',           icon: <Tag size={16} /> },
];

/* ── Icon preview helper ───────────────────────────────────────────── */
function getIconNode(iconName: string | null): React.ReactNode {
  if (!iconName) return <Folder size={16} />;
  return LUCIDE_ICONS.find(i => i.name === iconName)?.icon ?? <Folder size={16} />;
}

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* ── Icon Picker ───────────────────────────────────────────────────── */
function IconPicker({
  iconType, iconName, iconUrl,
  onChange,
}: {
  iconType: 'lucide' | 'upload' | null;
  iconName: string | null;
  iconUrl:  string | null;
  onChange: (type: 'lucide' | 'upload' | null, name: string | null, url: string | null) => void;
}) {
  const [tab,    setTab]    = useState<'lucide' | 'upload'>(iconType === 'upload' ? 'upload' : 'lucide');
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? LUCIDE_ICONS.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : LUCIDE_ICONS;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50">
        {(['lucide', 'upload'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 border-b-2 border-black -mb-px' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'lucide' ? 'Lucide icons' : 'Custom upload'}
          </button>
        ))}
      </div>

      {tab === 'lucide' ? (
        <div className="p-3">
          {/* Search */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 rounded-lg mb-3">
            <Search size={12} className="text-gray-400 shrink-0" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search icons…"
              className="flex-1 text-xs outline-none bg-transparent" />
          </div>
          {/* Grid */}
          <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
            {/* None option */}
            <button type="button" title="None"
              onClick={() => onChange(null, null, null)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors text-xs text-gray-400 ${
                !iconName && iconType !== 'upload' ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-gray-400'
              }`}>
              —
            </button>
            {filtered.map(ic => (
              <button key={ic.name} type="button" title={ic.name}
                onClick={() => onChange('lucide', ic.name, null)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                  iconType === 'lucide' && iconName === ic.name
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
            value={iconUrl || ''}
            onChange={(url) => onChange('upload', null, url)}
            variant="square"
            cropWidth={400}
            cropHeight={400}
            cropLabel="Crop Category Icon"
            className="w-20 h-20 mx-auto"
          />
        </div>
      )}
    </div>
  );
}

/* ── Category Modal ────────────────────────────────────────────────── */
function CategoryModal({
  category,
  categories,
  onClose,
  onSave,
  saving,
  error,
}: {
  category?: ProductCategory;
  categories: ProductCategory[];
  onClose: () => void;
  onSave: (c: CategoryCreatePayload) => void;
  saving: boolean;
  error: string | null;
}) {
  const [name,        setName]        = useState(category?.name        ?? '');
  const [slugManual,  setSlugManual]  = useState(!!category);
  const [slugValue,   setSlugValue]   = useState(category?.slug        ?? '');
  const [parentId,    setParentId]    = useState<number | null>(category?.parent_id ?? null);
  const [iconType,    setIconType]    = useState<'lucide' | 'upload' | null>(category?.icon_type ?? null);
  const [iconName,    setIconName]    = useState<string | null>(category?.icon_name ?? null);
  const [iconUrl,     setIconUrl]     = useState<string | null>(category?.icon_url  ?? null);
  const [description, setDescription] = useState(category?.description ?? '');

  const autoSlug = toSlug(name);
  const slug     = slugManual ? slugValue : autoSlug;

  // Only show top-level categories as parent options (no nesting beyond 2 levels)
  const parentOptions = categories.filter(c =>
    c.parent_id === null && c.id !== category?.id
  );

  const handleIconChange = (type: 'lucide' | 'upload' | null, name: string | null, url: string | null) => {
    setIconType(type); setIconName(name); setIconUrl(url);
  };

  const canSave = name.trim().length > 0 && !saving;

  const iconPreview = iconType === 'upload' && iconUrl
    ? <img src={iconUrl} alt="" className="w-4 h-4 rounded object-cover" />
    : getIconNode(iconName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {category ? 'Edit category' : 'Add category'}
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
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g., Men's Clothing"
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none" />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 shrink-0">/categories/</span>
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

          {/* Parent */}
          <div>
            <SearchableSelect
              label="Parent category"
              options={[
                { value: '', label: 'None (top-level category)' },
                ...parentOptions.map(p => ({ value: String(p.id), label: p.name })),
              ]}
              value={parentId !== null ? String(parentId) : ''}
              onChange={(v) => setParentId(v ? Number(v) : null)}
              placeholder="None (top-level category)"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Icon
              {(iconType) && (
                <span className="ml-2 inline-flex items-center gap-1 text-gray-500 font-normal">
                  <span className="text-gray-700">{iconPreview}</span>
                  {iconType === 'lucide' && iconName && <span>{iconName}</span>}
                </span>
              )}
            </label>
            <IconPicker
              iconType={iconType} iconName={iconName} iconUrl={iconUrl}
              onChange={handleIconChange}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={description ?? ''} onChange={e => setDescription(e.target.value)}
              placeholder="Optional short description…"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-gray-400 outline-none resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" disabled={!canSave}
            onClick={() => onSave({
              name: name.trim(),
              slug: slug || toSlug(name),
              parent_id: parentId,
              icon_type: iconType,
              icon_name: iconName,
              icon_url: iconUrl,
              description: description || null,
            })}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {category ? 'Save changes' : 'Add category'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────── */
export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [showModal,   setShowModal]   = useState(false);
  const [editCat,     setEditCat]     = useState<ProductCategory | undefined>();
  const [search,      setSearch]      = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendor', 'categories'],
    queryFn: () => categoriesApi.list({ per_page: 200 }),
  });

  const categories: ProductCategory[] = data?.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['vendor', 'categories'] });

  const createMutation = useMutation({
    mutationFn: (payload: CategoryCreatePayload) => categoriesApi.create(payload),
    onSuccess: () => { invalidate(); setShowModal(false); setEditCat(undefined); setMutationError(null); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to create category')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CategoryCreatePayload }) =>
      categoriesApi.update(id, payload),
    onSuccess: () => { invalidate(); setShowModal(false); setEditCat(undefined); setMutationError(null); },
    onError: (err) => setMutationError(getApiErrorMessage(err, 'Failed to update category')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => categoriesApi.delete(id),
    onSuccess: () => invalidate(),
    onError: (err) => alert(getApiErrorMessage(err, 'Failed to delete category')),
  });

  const openAdd  = () => { setEditCat(undefined); setMutationError(null); setShowModal(true); };
  const openEdit = (c: ProductCategory) => { setEditCat(c); setMutationError(null); setShowModal(true); };

  const handleSave = (data: CategoryCreatePayload) => {
    if (editCat) {
      updateMutation.mutate({ id: editCat.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const deleteCat = (id: number) => {
    if (confirm('Delete this category? Any sub-categories will also be removed.')) {
      deleteMutation.mutate(id);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return categories.filter(c =>
      !q || c.name.toLowerCase().includes(q) || c.slug.includes(q)
    );
  }, [categories, search]);

  // Build display rows: parents first, then their children right after
  const rows = useMemo(() => {
    const parents = filtered.filter(c => c.parent_id === null);
    const result: ProductCategory[] = [];
    parents.forEach(p => {
      result.push(p);
      filtered.filter(c => c.parent_id === p.id).forEach(child => result.push(child));
    });
    // append any orphaned children (parent filtered out)
    filtered.filter(c => c.parent_id !== null && !parents.find(p => p.id === c.parent_id))
      .forEach(c => result.push(c));
    return result;
  }, [filtered]);

  const parentName = (parentId: number | null) =>
    parentId ? categories.find(c => c.id === parentId)?.name ?? '—' : null;

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Organise your products into a category tree</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus size={14} /> Add category</Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 mb-4 w-full max-w-xs">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search categories…"
          className="flex-1 text-sm outline-none bg-transparent" />
        {search && <button onClick={() => setSearch('')}><X size={13} className="text-gray-400" /></button>}
      </div>

      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 flex flex-col items-center justify-center text-gray-400">
          <Loader2 size={24} className="animate-spin mb-2" />
          <p className="text-sm">Loading categories…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-xl p-8 text-center">
          <AlertCircle size={24} className="mx-auto text-red-500 mb-2" />
          <p className="text-sm text-red-700">{getApiErrorMessage(error, 'Failed to load categories')}</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FolderOpen size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-2">No categories yet</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">
            Create categories to organise your products and make them easier to browse.
          </p>
          <Button size="sm" onClick={openAdd}><Plus size={14} /> Add category</Button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl">
          {/* Desktop table */}
          <table className="hidden md:table w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Parent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Slug</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Icon</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Products</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(cat => {
                const isChild = cat.parent_id !== null;
                const iconNode = cat.icon_type === 'upload' && cat.icon_url
                  ? <img src={cat.icon_url} alt="" className="w-5 h-5 rounded object-cover" />
                  : <span className="text-gray-600">{getIconNode(cat.icon_name)}</span>;

                return (
                  <tr key={cat.id} className={`hover:bg-gray-50 transition-colors ${isChild ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isChild && <span className="w-4 h-4 border-l-2 border-b-2 border-gray-200 rounded-bl ml-2 shrink-0" />}
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          {iconNode}
                        </div>
                        <span className={`font-medium text-gray-900 ${isChild ? 'text-xs' : 'text-sm'}`}>{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {cat.parent_id ? (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[11px] font-medium">
                          <Folder size={10} /> {parentName(cat.parent_id)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{cat.slug}</td>
                    <td className="px-4 py-3 text-center">
                      {cat.icon_type ? (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                          {iconNode}
                          {cat.icon_type === 'lucide' && <span className="text-[11px]">{cat.icon_name}</span>}
                          {cat.icon_type === 'upload' && <span className="text-[11px]">Custom</span>}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">{(cat.products_count ?? cat.product_count ?? 0)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(cat)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteCat(cat.id)}
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
            {rows.map(cat => {
              const isChild = cat.parent_id !== null;
              const iconNode = cat.icon_type === 'upload' && cat.icon_url
                ? <img src={cat.icon_url} alt="" className="w-5 h-5 rounded object-cover" />
                : <span className="text-gray-600">{getIconNode(cat.icon_name)}</span>;
              const productCount = cat.products_count ?? cat.product_count ?? 0;

              return (
                <MobileRowCard
                  key={cat.id}
                  className={isChild ? 'ml-4' : undefined}
                  header={
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        {iconNode}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">{cat.name}</p>
                        <p className="font-mono text-[11px] text-gray-500 truncate">{cat.slug}</p>
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
                    cat.parent_id ? (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[11px] font-medium w-fit">
                        <Folder size={10} /> {parentName(cat.parent_id)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[11px]">Top-level</span>
                    )
                  }
                  actions={
                    <>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => openEdit(cat)}
                      >
                        <Pencil size={11} /> Edit
                      </Button>
                      <button
                        onClick={() => deleteCat(cat.id)}
                        disabled={deleteMutation.isPending}
                        aria-label="Delete category"
                        className="h-7 w-7 flex items-center justify-center rounded text-red-500 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <CategoryModal
          category={editCat}
          categories={categories}
          onClose={() => { setShowModal(false); setEditCat(undefined); setMutationError(null); }}
          onSave={handleSave}
          saving={saving}
          error={mutationError}
        />
      )}
    </div>
  );
}
