'use client';
/**
 * Bundle / Combo product wizard.
 *
 * Lives at /dashboard/products/add/bundle so it doesn't bloat the existing
 * physical/digital wizard with branching. The bundle has its own concerns
 * (no own variants, no own stock, component picker, bundle-pricing strategy)
 * that don't reuse cleanly with the regular Add Product flow.
 *
 * 4 steps:
 *   1. Basics — name, description, hero image, gallery, category, brand, tags
 *   2. Components — pick existing products + per-component quantity, drag reorder
 *   3. Pricing — sum / fixed / percent strategy, compare-at, live preview
 *   4. Review — summary, save as draft or publish
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageUpload, MultiImageUpload } from '@/components/ui/image-upload';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  ChevronLeft, Check, X, Plus, Search, Trash2, GripVertical, Package,
  AlertCircle, Loader2,
} from 'lucide-react';
import { productsApi, categoriesApi, brandsApi } from '@/lib/api/services/vendor-products';
import { getApiErrorMessage } from '@/lib/api/client';
import type { Product, ProductCategory, Brand } from '@/lib/api/types';

interface ComponentDraft {
  component_product_id: number;
  quantity: number;
  /** Local cached snapshot for preview rendering (not sent to API). */
  product: Product;
}

const STEPS = [
  { num: 1, label: 'Basics' },
  { num: 2, label: 'Items' },
  { num: 3, label: 'Pricing' },
  { num: 4, label: 'Review' },
];

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function computeEffectivePrice(p: Product): { min: number; max: number } {
  const variants = p.has_variants && p.variants?.length ? p.variants : [];
  const calcOne = (price: string | number, discount: string | number | null, type: string | null): number => {
    const base = parseFloat(String(price)) || 0;
    if (!discount || !type) return base;
    const d = parseFloat(String(discount)) || 0;
    return type === 'percent' ? base - (base * d) / 100 : Math.max(0, base - d);
  };

  if (variants.length === 0) {
    const v = calcOne(p.price, p.discount, p.discount_type);
    return { min: v, max: v };
  }
  const prices = variants.map(v => {
    const variantHasOwn = v.discount && v.discount_type;
    return variantHasOwn
      ? calcOne(v.price, v.discount, v.discount_type)
      : calcOne(v.price, p.discount, p.discount_type);
  });
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export default function BundleWizardPageWrapper() {
  // Suspense boundary keeps Next's static prerender happy — the inner
  // component reads useSearchParams (for ?edit=<id>), which forces a CSR
  // bailout and requires an explicit Suspense parent.
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-gray-400">Loading…</div>}>
      <BundleWizardPage />
    </Suspense>
  );
}

function BundleWizardPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const editId = (() => {
    const v = searchParams.get('edit');
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  })();
  const isEdit = editId !== null;
  const [step, setStep] = useState(1);

  // ── Step 1 state ──
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // ── Step 2 state ──
  const [components, setComponents] = useState<ComponentDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Step 3 state ──
  const [pricingStrategy, setPricingStrategy] = useState<'sum' | 'fixed' | 'percent'>('fixed');
  const [bundlePrice, setBundlePrice] = useState('');
  const [bundleDiscountPercent, setBundleDiscountPercent] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');

  // ── Save state ──
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-update slug from name unless manually edited.
  useEffect(() => {
    if (!slugManual) setSlug(toSlug(name));
  }, [name, slugManual]);

  const categoriesQuery = useQuery({
    queryKey: ['vendor', 'categories'],
    queryFn: () => categoriesApi.list({ per_page: 200 }),
  });
  const brandsQuery = useQuery({
    queryKey: ['vendor', 'brands'],
    queryFn: () => brandsApi.list({ per_page: 200 }),
  });

  const categories: ProductCategory[] = categoriesQuery.data?.data ?? [];
  const brands: Brand[] = brandsQuery.data?.data ?? [];

  // Edit mode: load the existing bundle once and hydrate every form field.
  // We only run the hydration once per fetch — `hydrated` guards against
  // re-clobbering whatever the user has typed if the query refetches.
  const editQuery = useQuery({
    queryKey: ['vendor', 'product', editId],
    queryFn: () => productsApi.get(editId!),
    enabled: isEdit,
  });
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!isEdit || !editQuery.data || hydratedRef.current) return;
    const p = editQuery.data;
    setName(p.name ?? '');
    setSlug(p.slug ?? '');
    setSlugManual(true);
    setShortDescription(p.short_description ?? '');
    setDescription(p.description ?? '');
    setVideoUrl(p.video_url ?? '');
    setFeaturedImage(p.featured_image ?? null);
    setGallery(Array.isArray(p.images) ? p.images.filter(Boolean) : []);
    setCategoryId(p.category_id ?? null);
    setBrandId(p.brand_id ?? null);
    setTags(Array.isArray(p.tags) ? p.tags : []);
    setPricingStrategy((p.bundle_pricing_strategy as 'sum' | 'fixed' | 'percent') ?? 'fixed');
    setBundlePrice(p.bundle_price ? String(p.bundle_price) : '');
    setBundleDiscountPercent(p.bundle_discount_percent ? String(p.bundle_discount_percent) : '');
    setCompareAtPrice(p.bundle_compare_at_price ? String(p.bundle_compare_at_price) : '');

    const drafts: ComponentDraft[] = (p.bundle_components ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(bc => bc.component ? {
        component_product_id: bc.component_product_id,
        quantity: bc.quantity ?? 1,
        product: bc.component,
      } : null)
      .filter((d): d is ComponentDraft => d !== null);
    setComponents(drafts);

    hydratedRef.current = true;
  }, [isEdit, editQuery.data]);

  // ── Pricing math (preview) ──
  const componentSums = useMemo(() => {
    let min = 0;
    let max = 0;
    components.forEach(c => {
      const { min: m, max: M } = computeEffectivePrice(c.product);
      min += m * c.quantity;
      max += M * c.quantity;
    });
    return { min, max };
  }, [components]);

  const computedBundlePrice = useMemo(() => {
    const sum = componentSums.max;
    if (pricingStrategy === 'fixed') return parseFloat(bundlePrice) || 0;
    if (pricingStrategy === 'percent') {
      const pct = parseFloat(bundleDiscountPercent) || 0;
      return Math.round(sum * (1 - pct / 100));
    }
    return sum;
  }, [pricingStrategy, bundlePrice, bundleDiscountPercent, componentSums.max]);

  const savings = Math.max(0, componentSums.max - computedBundlePrice);
  const savingsPercent = componentSums.max > 0
    ? Math.round((savings / componentSums.max) * 100)
    : 0;

  // ── Validation ──
  const step1Valid = name.trim().length > 0 && categoryId !== null;
  const step2Valid = components.length > 0;
  const step3Valid = (() => {
    if (pricingStrategy === 'fixed') return parseFloat(bundlePrice) > 0;
    if (pricingStrategy === 'percent') {
      const pct = parseFloat(bundleDiscountPercent);
      return pct >= 0 && pct <= 100;
    }
    return true;
  })();

  const canSave = step1Valid && step2Valid && step3Valid;

  // ── Mutations ──
  const buildPayload = (status: 'draft' | 'active') => ({
    name: name.trim(),
    product_type: 'bundle' as const,
    category_id: categoryId!,
    brand_id: brandId,
    short_description: shortDescription || null,
    video_url: videoUrl.trim() || null,
    description: description || null,
    price: 0,
    featured_image: featuredImage,
    images: gallery,
    tags,
    url_handle: slug || null,
    status,
    bundle_pricing_strategy: pricingStrategy,
    bundle_price: pricingStrategy === 'fixed' ? parseFloat(bundlePrice) : null,
    bundle_discount_percent: pricingStrategy === 'percent' ? parseFloat(bundleDiscountPercent) : null,
    bundle_compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
    bundle_components: components.map((c, i) => ({
      component_product_id: c.component_product_id,
      quantity: c.quantity,
      sort_order: i,
      is_required: true,
    })),
  });

  const saveMutation = useMutation({
    mutationFn: (status: 'draft' | 'active') => isEdit
      ? productsApi.update(editId!, buildPayload(status))
      : productsApi.create(buildPayload(status)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor', 'products'] });
      qc.invalidateQueries({ queryKey: ['vendor', 'product', editId] });
      router.push('/dashboard/products');
    },
    onError: (err) => setSubmitError(getApiErrorMessage(err, 'Failed to save bundle.')),
  });

  // Tag entry: comma or Enter.
  const addTagFromInput = () => {
    const fresh = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t && !tags.includes(t));
    if (fresh.length) setTags(prev => [...prev, ...fresh]);
    setTagsInput('');
  };

  const next = () => setStep(s => Math.min(4, s + 1));
  const back = () => setStep(s => Math.max(1, s - 1));

  return (
    <div className="max-w-[1100px] mx-auto pb-12">
      <Link
        href="/dashboard/products"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-3"
      >
        <ChevronLeft size={14} /> Back to product list
      </Link>

      <PageHeader
        title={isEdit ? 'Edit Bundle' : 'Add Bundle'}
        subtitle={isEdit ? (editQuery.isLoading ? 'Loading…' : 'Update this combo') : 'Combine existing products into a combo deal'}
      />

      {/* Stepper */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 md:px-6 py-4 mb-6">
        <div className="flex items-center justify-between md:justify-start gap-1.5 md:gap-2 w-full md:w-auto">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                step > s.num ? 'bg-green-500 text-white'
                  : step === s.num ? 'bg-gray-900 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s.num ? <Check size={13} /> : s.num}
              </div>
              <span className={`text-xs whitespace-nowrap ${step === s.num ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`hidden md:block w-8 h-px shrink-0 ${step > s.num ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {submitError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ── STEP 1: Basics ──────────────────────────── */}
      {step === 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <Input
            label="Bundle name *"
            placeholder="e.g. Premium Pant + Tee Combo"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">URL slug</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 shrink-0">/products/</span>
              <input
                type="text"
                value={slug}
                onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugManual(true); }}
                className="flex-1 h-9 px-3 text-sm font-mono border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
              />
            </div>
            {slugManual && (
              <button type="button" onClick={() => { setSlugManual(false); setSlug(toSlug(name)); }}
                className="text-[11px] text-blue-600 hover:underline mt-1">
                Reset to auto-generated
              </button>
            )}
          </div>

          <Input
            label="Short description"
            placeholder="One-line tagline shown in product listings"
            value={shortDescription}
            onChange={e => setShortDescription(e.target.value)}
          />

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <RichTextEditor value={description} onChange={setDescription} />
          </div>

          {/* Optional product video — drives the storefront's "Watch Video" button */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Product Video <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Paste a YouTube link. Customers see a &ldquo;Watch Video&rdquo; button on the bundle page. Leave empty to hide it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Featured image</label>
              <ImageUpload
                value={featuredImage || ''}
                onChange={setFeaturedImage}
                variant="square"
                cropWidth={1200}
                cropHeight={1200}
                cropLabel="Crop bundle hero image"
                className="w-32 h-32"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Gallery (up to 6)</label>
              <MultiImageUpload values={gallery} onChange={setGallery} maxFiles={6} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect
              label="Category *"
              options={[
                { value: '', label: 'Select category' },
                ...categories.filter(c => c.parent_id === null).map(c => ({ value: String(c.id), label: c.name })),
              ]}
              value={categoryId !== null ? String(categoryId) : ''}
              onChange={(v) => setCategoryId(v ? Number(v) : null)}
              placeholder="Select category"
            />
            <SearchableSelect
              label="Brand"
              options={[
                { value: '', label: 'No brand' },
                ...brands.map(b => ({ value: String(b.id), label: b.name })),
              ]}
              value={brandId !== null ? String(brandId) : ''}
              onChange={(v) => setBrandId(v ? Number(v) : null)}
              placeholder="No brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Tags</label>
            <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border border-gray-200 rounded-lg min-h-[2.5rem]">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
                  {t}
                  <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))} className="text-gray-400 hover:text-red-500">
                    <X size={11} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTagFromInput();
                  }
                }}
                onBlur={addTagFromInput}
                placeholder="Add tag..."
                className="flex-1 min-w-[120px] text-xs outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" disabled={!step1Valid} onClick={next}>Next →</Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Components ──────────────────────── */}
      {step === 2 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          {components.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Package size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-1">No items in this bundle yet</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto mb-5">
                Add one or more existing products that customers will pick a variant from when they buy this combo.
              </p>
              <Button size="sm" onClick={() => setPickerOpen(true)}>
                <Plus size={14} /> Add item
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Bundle items ({components.length})
                </p>
                <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                  <Plus size={13} /> Add another
                </Button>
              </div>
              <div className="space-y-2">
                {components.map((c, i) => (
                  <ComponentRow
                    key={c.component_product_id}
                    draft={c}
                    onQtyChange={(q) => setComponents(prev => prev.map((x, idx) => idx === i ? { ...x, quantity: q } : x))}
                    onRemove={() => setComponents(prev => prev.filter((_, idx) => idx !== i))}
                    onMoveUp={i > 0 ? () => setComponents(prev => {
                      const next = [...prev];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      return next;
                    }) : undefined}
                    onMoveDown={i < components.length - 1 ? () => setComponents(prev => {
                      const next = [...prev];
                      [next[i], next[i + 1]] = [next[i + 1], next[i]];
                      return next;
                    }) : undefined}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="secondary" size="sm" onClick={back}>← Back</Button>
            <Button size="sm" disabled={!step2Valid} onClick={next}>Next →</Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Pricing ─────────────────────────── */}
      {step === 3 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div>
            <p className="text-sm font-medium text-gray-800 mb-3">How is this bundle priced?</p>
            <div className="space-y-2">
              {([
                { value: 'sum', title: 'Sum of items', sub: 'Customer pays the total of whichever variants they pick. No discount.' },
                { value: 'fixed', title: 'Fixed bundle price', sub: 'You set one price; bundle stays this price regardless of variants chosen.' },
                { value: 'percent', title: 'Percentage off sum', sub: 'Calculated discount applied to the sum at checkout.' },
              ] as const).map(opt => (
                <label key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    pricingStrategy === opt.value ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <input type="radio" checked={pricingStrategy === opt.value} onChange={() => setPricingStrategy(opt.value)} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{opt.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {pricingStrategy === 'fixed' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Bundle price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">৳</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={bundlePrice}
                  onChange={e => setBundlePrice(e.target.value)}
                  placeholder="1500"
                  className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
                />
              </div>
            </div>
          )}

          {pricingStrategy === 'percent' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Discount % off sum *</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={bundleDiscountPercent}
                  onChange={e => setBundleDiscountPercent(e.target.value)}
                  placeholder="25"
                  className="w-32 h-10 px-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
          )}

          {/* Live preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Items sum (max)</span><span className="text-gray-900">৳{componentSums.max.toLocaleString()}</span></div>
            {pricingStrategy === 'percent' && (
              <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-gray-900">−৳{savings.toLocaleString()}</span></div>
            )}
            <div className="flex justify-between font-semibold pt-1.5 border-t border-gray-200">
              <span className="text-gray-900">Bundle price</span>
              <span className="text-gray-900">৳{computedBundlePrice.toLocaleString()}</span>
            </div>
            {savings > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Customer saves</span>
                <span>৳{savings.toLocaleString()} ({savingsPercent}%)</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Compare-at price <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">৳</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={compareAtPrice}
                onChange={e => setCompareAtPrice(e.target.value)}
                placeholder="2000"
                className="w-full h-10 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Shown struck-through next to the bundle price on the storefront.</p>
          </div>

          {/* Stock note */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800 flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <p>
              Stock is calculated from each item&apos;s chosen variant at runtime.
              The bundle is &ldquo;in stock&rdquo; only if every required item has stock in the variant the customer picks.
            </p>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" size="sm" onClick={back}>← Back</Button>
            <Button size="sm" disabled={!step3Valid} onClick={next}>Next →</Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Review ──────────────────────────── */}
      {step === 4 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div className="space-y-3">
            <Row label="Name" value={name} />
            <Row label="Slug" value={slug ? `/products/${slug}` : '—'} />
            <Row label="Category" value={categories.find(c => c.id === categoryId)?.name ?? '—'} />
            <Row label="Brand" value={brands.find(b => b.id === brandId)?.name ?? '—'} />
            <Row label="Tags" value={tags.length ? tags.join(', ') : '—'} />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items ({components.length})</p>
            <ul className="space-y-1.5">
              {components.map(c => (
                <li key={c.component_product_id} className="text-sm text-gray-800">
                  · {c.product.name} <span className="text-gray-400">×{c.quantity}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
            <Row label="Strategy" value={pricingStrategy === 'sum' ? 'Sum of items' : pricingStrategy === 'fixed' ? 'Fixed bundle price' : 'Percentage off sum'} />
            <Row label="Bundle price" value={`৳${computedBundlePrice.toLocaleString()}`} />
            {compareAtPrice && <Row label="Compare-at" value={`৳${parseFloat(compareAtPrice).toLocaleString()}`} />}
            {savings > 0 && <Row label="Customer saves" value={`৳${savings.toLocaleString()} (${savingsPercent}%)`} highlight />}
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" size="sm" onClick={back}>← Back</Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!canSave || saveMutation.isPending}
                onClick={() => saveMutation.mutate('draft')}
              >
                {saveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Save as draft'}
              </Button>
              <Button
                size="sm"
                disabled={!canSave || saveMutation.isPending}
                onClick={() => saveMutation.mutate('active')}
              >
                {saveMutation.isPending
                  ? <Loader2 size={13} className="animate-spin" />
                  : isEdit ? 'Save changes' : 'Publish →'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Component picker modal */}
      {pickerOpen && (
        <ComponentPickerModal
          existingIds={components.map(c => c.component_product_id)}
          onClose={() => setPickerOpen(false)}
          onPick={(picked) => {
            setComponents(prev => [
              ...prev,
              ...picked.map(p => ({
                component_product_id: p.id,
                quantity: 1,
                product: p,
              })),
            ]);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ── Component row in the components list ────────────────────────── */

function ComponentRow({
  draft, onQtyChange, onRemove, onMoveUp, onMoveDown,
}: {
  draft: ComponentDraft;
  onQtyChange: (q: number) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const p = draft.product;
  const variantCount = p.variants?.length ?? 0;
  const stock = p.has_variants && p.variants
    ? p.variants.reduce((s, v) => s + (v.stock || 0), 0)
    : p.stock;
  const { min, max } = computeEffectivePrice(p);
  const priceLabel = min === max ? `৳${min.toLocaleString()}` : `৳${min.toLocaleString()} – ৳${max.toLocaleString()}`;

  return (
    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
      <div className="flex flex-col gap-0.5">
        <button type="button" onClick={onMoveUp} disabled={!onMoveUp}
          className="text-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-300">
          <GripVertical size={12} />
        </button>
      </div>
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
        {p.featured_image || p.images?.[0] ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={p.featured_image || p.images[0]} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <Package size={16} className="text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
        <p className="text-[11px] text-gray-500 truncate">
          {variantCount > 0 ? `${variantCount} variants · ` : ''}
          {priceLabel}
          {stock > 0 ? ` · ${stock} in stock` : ' · out of stock'}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[11px] text-gray-500">Qty</span>
        <button type="button" onClick={() => onQtyChange(Math.max(1, draft.quantity - 1))}
          className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50">−</button>
        <span className="w-8 text-center text-sm font-medium">{draft.quantity}</span>
        <button type="button" onClick={() => onQtyChange(draft.quantity + 1)}
          className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50">+</button>
      </div>
      <button type="button" onClick={onRemove}
        aria-label="Remove item"
        className="w-7 h-7 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

/* ── Component picker modal ─────────────────────────────────────── */

function ComponentPickerModal({
  existingIds, onClose, onPick,
}: {
  existingIds: number[];
  onClose: () => void;
  onPick: (products: Product[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Search the existing product catalog. We exclude bundles (no nested
  // bundles in v1) and any product already in the bundle's component list.
  const productsQuery = useQuery({
    queryKey: ['vendor', 'products', 'picker', { search }],
    queryFn: () => productsApi.list({
      search: search || undefined,
      per_page: 50,
      // status: only active products are eligible as bundle components.
      status: 'active',
    }),
  });

  const eligible = (productsQuery.data?.data ?? [])
    .filter(p => p.product_type !== 'bundle' && !existingIds.includes(p.id));

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const picked = eligible.filter(p => selected.has(p.id));
    if (picked.length > 0) onPick(picked);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-3 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Choose products to add</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={15} />
          </button>
        </div>
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, SKU..."
              className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {productsQuery.isLoading ? (
            <div className="py-8 text-center text-xs text-gray-400">Loading…</div>
          ) : eligible.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              {search ? 'No matching products.' : 'No eligible products. Bundles must reference existing active products.'}
            </div>
          ) : (
            <ul>
              {eligible.map(p => {
                const variantCount = p.variants?.length ?? 0;
                const { min, max } = computeEffectivePrice(p);
                const priceLabel = min === max ? `৳${min.toLocaleString()}` : `৳${min.toLocaleString()} – ৳${max.toLocaleString()}`;
                const isSelected = selected.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected ? 'bg-[#2596be]/5' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input type="checkbox" checked={isSelected} readOnly className="rounded shrink-0" />
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {p.featured_image || p.images?.[0] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={p.featured_image || p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={14} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{p.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {variantCount > 0 ? `${variantCount} variants · ` : ''}
                          {priceLabel}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={selected.size === 0} onClick={handleAdd}>
              <Plus size={13} /> Add to bundle
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Generic review row ─────────────────────────────────────────── */

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={highlight ? 'text-green-700 font-medium' : 'text-gray-900'}>{value}</span>
    </div>
  );
}
