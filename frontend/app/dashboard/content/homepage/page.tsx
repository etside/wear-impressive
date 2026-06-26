'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Save, ChevronLeft,
  Image as ImageIcon, Layout, Grid3X3, Upload, Search, X, MessageSquareQuote,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { ImageUpload } from '@/components/ui/image-upload';
import { settingsApi } from '@/lib/api/services/vendor-settings';
import { productsApi, categoriesApi } from '@/lib/api/services/vendor-products';
import { getApiErrorMessage } from '@/lib/api/client';
import {
  type HomeSection,
  type CarouselSectionData,
  type BannerRowSectionData,
  type ProductSectionData,
  type ReviewsGallerySectionData,
  defaultSection,
  isCarousel,
  isBannerRow,
  isProductSection,
  isReviewsGallery,
  SECTION_TYPE_LABELS,
} from '@/lib/home-sections';

/* ── Page ─────────────────────────────────────────────────────────── */
export default function HomepageBuilderPage() {
  const qc = useQueryClient();
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['vendor', 'settings', 'all'],
    queryFn: () => settingsApi.get(),
  });

  // Hydrate from server once on first load.
  useEffect(() => {
    if (hydrated) return;
    const raw = settingsQuery.data?.['home.sections'];
    if (raw == null && !settingsQuery.isFetched) return;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) setSections(parsed as HomeSection[]);
    } catch {
      // ignore — empty start
    }
    setHydrated(true);
  }, [settingsQuery.data, settingsQuery.isFetched, hydrated]);

  const saveMut = useMutation({
    mutationFn: () =>
      settingsApi.update({
        settings: [{
          key: 'home.sections',
          value: sections,
          type: 'json',
          group: 'general',
        }],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor', 'settings', 'all'] });
      qc.invalidateQueries({ queryKey: ['storefront', 'store-info-full'] });
      setBanner({ kind: 'ok', text: 'Homepage saved.' });
      setTimeout(() => setBanner(null), 2500);
    },
    onError: (err) => setBanner({ kind: 'err', text: getApiErrorMessage(err, 'Failed to save.') }),
  });

  function patch(id: string, mutator: (s: HomeSection) => HomeSection) {
    setSections((prev) => prev.map((s) => (s.id === id ? mutator(s) : s)));
  }
  function move(id: string, direction: -1 | 1) {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const next = idx + direction;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }
  function remove(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }
  function add(type: HomeSection['type']) {
    setSections((prev) => [...prev, defaultSection(type)]);
  }

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
        <Link href="/dashboard" className="hover:text-gray-900 flex items-center gap-1">
          <ChevronLeft size={14} /> Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Homepage Builder</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Compose the storefront homepage from reusable sections. Reorder, hide, or remove any section.
          </p>
        </div>
        <Button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          loading={saveMut.isPending}
        >
          <Save size={14} /> Save Homepage
        </Button>
      </div>

      {banner && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm border ${
          banner.kind === 'ok'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {banner.text}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sections.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl px-5 py-12 text-center">
            <Layout size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No sections yet — start by adding one below.</p>
          </div>
        ) : (
          sections.map((section, idx) => (
            <SectionCard
              key={section.id}
              section={section}
              isFirst={idx === 0}
              isLast={idx === sections.length - 1}
              onPatch={(mutator) => patch(section.id, mutator)}
              onMove={(d) => move(section.id, d)}
              onRemove={() => remove(section.id)}
            />
          ))
        )}

        <AddSectionRow onAdd={add} />
      </div>
    </div>
  );
}

/* ── AddSectionRow ────────────────────────────────────────────────── */
function AddSectionRow({ onAdd }: { onAdd: (type: HomeSection['type']) => void }) {
  return (
    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Add a section
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <AddTile icon={<ImageIcon size={16} />}          label={SECTION_TYPE_LABELS.carousel}         onClick={() => onAdd('carousel')} />
        <AddTile icon={<Layout size={16} />}             label={SECTION_TYPE_LABELS.banner_row}       onClick={() => onAdd('banner_row')} />
        <AddTile icon={<Grid3X3 size={16} />}            label={SECTION_TYPE_LABELS.product_section}  onClick={() => onAdd('product_section')} />
        <AddTile icon={<MessageSquareQuote size={16} />} label={SECTION_TYPE_LABELS.reviews_gallery}  onClick={() => onAdd('reviews_gallery')} />
      </div>
    </div>
  );
}

function AddTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2.5 bg-white border border-gray-200 rounded-lg hover:border-gray-400 transition-colors text-left"
    >
      <span className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
        {icon}
      </span>
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <Plus size={14} className="ml-auto text-gray-400" />
    </button>
  );
}

/* ── SectionCard ─────────────────────────────────────────────────── */
function SectionCard({
  section, isFirst, isLast, onPatch, onMove, onRemove,
}: {
  section: HomeSection;
  isFirst: boolean;
  isLast: boolean;
  onPatch: (mutator: (s: HomeSection) => HomeSection) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`bg-white border rounded-xl p-4 ${section.visible ? 'border-gray-200' : 'border-gray-200 bg-gray-50/60'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wide ${section.visible ? 'text-gray-500' : 'text-gray-400'}`}>
            {SECTION_TYPE_LABELS[section.type]}
          </span>
          {!section.visible && <span className="text-[10px] text-gray-400">(hidden)</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPatch((s) => ({ ...s, visible: !s.visible }))}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500"
            title={section.visible ? 'Hide on storefront' : 'Show on storefront'}
          >
            {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            onClick={() => onMove(-1)}
            disabled={isFirst}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={isLast}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ArrowDown size={14} />
          </button>
          <button
            onClick={onRemove}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-red-500"
            title="Remove section"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isCarousel(section) && (
        <CarouselEditor section={section} onChange={(next) => onPatch(() => next)} />
      )}
      {isBannerRow(section) && (
        <BannerRowEditor section={section} onChange={(next) => onPatch(() => next)} />
      )}
      {isProductSection(section) && (
        <ProductSectionEditor section={section} onChange={(next) => onPatch(() => next)} />
      )}
      {isReviewsGallery(section) && (
        <ReviewsGalleryEditor section={section} onChange={(next) => onPatch(() => next)} />
      )}
    </div>
  );
}

/* ── CarouselEditor ──────────────────────────────────────────────── */
function CarouselEditor({
  section, onChange,
}: {
  section: CarouselSectionData;
  onChange: (next: CarouselSectionData) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        {section.slides.map((slide, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
            <div className="w-20 h-20 shrink-0">
              <ImageUpload
                value={slide.image}
                onChange={(url) => onChange({
                  ...section,
                  slides: section.slides.map((s, i) => i === idx ? { ...s, image: url } : s),
                })}
                variant="square"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Link (optional)</label>
              <input
                type="text"
                value={slide.link ?? ''}
                onChange={(e) => onChange({
                  ...section,
                  slides: section.slides.map((s, i) => i === idx ? { ...s, link: e.target.value } : s),
                })}
                placeholder="/products?category=4 or https://example.com/sale"
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
              />
              <p className="text-[10px] text-gray-400 mt-1">Storefront paths can start with / (e.g. /products) — they get prefixed with your shop base.</p>
            </div>
            <button
              onClick={() => onChange({
                ...section,
                slides: section.slides.filter((_, i) => i !== idx),
              })}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-red-500"
              title="Remove slide"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange({ ...section, slides: [...section.slides, { image: '', link: '' }] })}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 border border-dashed border-gray-300 hover:border-gray-400 rounded-lg px-3 py-2"
      >
        <Plus size={14} /> Add slide
      </button>

      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <ToggleSwitch
          checked={(section.autoplay_ms ?? 0) > 0}
          onChange={(on) => onChange({ ...section, autoplay_ms: on ? 5000 : 0 })}
        />
        <span className="text-sm text-gray-700">Auto-rotate slides every</span>
        <input
          type="number"
          min={2} max={30}
          disabled={(section.autoplay_ms ?? 0) === 0}
          value={Math.round((section.autoplay_ms ?? 5000) / 1000)}
          onChange={(e) => onChange({ ...section, autoplay_ms: Math.max(2, Math.min(30, Number(e.target.value) || 5)) * 1000 })}
          className="w-16 h-9 px-2 text-sm text-center border border-gray-200 rounded-lg outline-none disabled:bg-gray-50"
        />
        <span className="text-sm text-gray-500">seconds</span>
      </div>
    </div>
  );
}

/* ── BannerRowEditor ─────────────────────────────────────────────── */
function BannerRowEditor({
  section, onChange,
}: {
  section: BannerRowSectionData;
  onChange: (next: BannerRowSectionData) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
        <span className="text-sm text-gray-700">Cards per row on desktop:</span>
        {([2, 3, 4] as const).map((n) => (
          <button
            key={n}
            onClick={() => onChange({ ...section, columns: n })}
            className={`w-8 h-8 rounded-md text-sm font-medium ${
              section.columns === n ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {section.cards.map((card, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
            <div className="w-20 h-20 shrink-0">
              <ImageUpload
                value={card.image}
                onChange={(url) => onChange({
                  ...section,
                  cards: section.cards.map((c, i) => i === idx ? { ...c, image: url } : c),
                })}
                variant="square"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-gray-600 mb-1">Link (optional)</label>
              <input
                type="text"
                value={card.link ?? ''}
                onChange={(e) => onChange({
                  ...section,
                  cards: section.cards.map((c, i) => i === idx ? { ...c, link: e.target.value } : c),
                })}
                placeholder="/products?category=4 or external URL"
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
              />
            </div>
            <button
              onClick={() => onChange({
                ...section,
                cards: section.cards.filter((_, i) => i !== idx),
              })}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-red-500"
              title="Remove card"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange({ ...section, cards: [...section.cards, { image: '', link: '' }] })}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 border border-dashed border-gray-300 hover:border-gray-400 rounded-lg px-3 py-2"
      >
        <Plus size={14} /> Add card
      </button>
    </div>
  );
}

/* ── ProductSectionEditor ────────────────────────────────────────── */
function ProductSectionEditor({
  section, onChange,
}: {
  section: ProductSectionData;
  onChange: (next: ProductSectionData) => void;
}) {
  const categoriesQuery = useQuery({
    queryKey: ['vendor', 'categories'],
    queryFn: () => categoriesApi.list(),
  });
  const categories = categoriesQuery.data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Section name (English)</label>
          <input
            type="text"
            value={section.name_en}
            onChange={(e) => onChange({ ...section, name_en: e.target.value })}
            placeholder="New Arrivals"
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Section name (বাংলা)</label>
          <input
            type="text"
            value={section.name_bn ?? ''}
            onChange={(e) => onChange({ ...section, name_bn: e.target.value })}
            placeholder="নতুন আগমন"
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-2">Show products from</label>
        <div className="flex gap-2 mb-3">
          {(['category', 'manual'] as const).map((t) => {
            const active = section.source.type === t;
            return (
              <button
                key={t}
                onClick={() => onChange({
                  ...section,
                  source: t === 'category'
                    ? { type: 'category', category_id: section.source.type === 'category' ? section.source.category_id : 0 }
                    : { type: 'manual', product_ids: section.source.type === 'manual' ? section.source.product_ids : [] },
                })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                  active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t === 'category' ? 'A category' : 'Hand-picked products'}
              </button>
            );
          })}
        </div>

        {section.source.type === 'category' && (
          <select
            value={section.source.category_id || ''}
            onChange={(e) => onChange({
              ...section,
              source: { type: 'category', category_id: Number(e.target.value) || 0 },
            })}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white"
          >
            <option value="">Select a category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {section.source.type === 'manual' && (
          <ManualProductPicker
            ids={section.source.product_ids}
            onChange={(ids) => onChange({ ...section, source: { type: 'manual', product_ids: ids } })}
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">How many to show</label>
          <div className="flex items-center gap-2">
            <select
              value={section.limit === 'all' ? 'all' : 'limit'}
              onChange={(e) => onChange({
                ...section,
                limit: e.target.value === 'all' ? 'all' : 8,
              })}
              className="h-9 px-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white"
            >
              <option value="limit">First N products</option>
              <option value="all">Show all</option>
            </select>
            {section.limit !== 'all' && (
              <input
                type="number"
                min={1} max={48}
                value={section.limit}
                onChange={(e) => onChange({ ...section, limit: Math.max(1, Math.min(48, Number(e.target.value) || 8)) })}
                className="w-20 h-9 px-2 text-sm text-center border border-gray-200 rounded-lg outline-none focus:border-gray-400"
              />
            )}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Columns on desktop</label>
          <div className="flex items-center gap-2">
            {([2, 3, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => onChange({ ...section, columns: n })}
                className={`w-8 h-8 rounded-md text-sm font-medium ${
                  section.columns === n ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {n}
              </button>
            ))}
            <span className="text-xs text-gray-400 ml-1">Mobile auto-stacks to 2.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ReviewsGalleryEditor ────────────────────────────────────────── */
function ReviewsGalleryEditor({
  section, onChange,
}: {
  section: ReviewsGallerySectionData;
  onChange: (next: ReviewsGallerySectionData) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Heading (English)</label>
          <input
            type="text"
            value={section.name_en}
            onChange={(e) => onChange({ ...section, name_en: e.target.value })}
            placeholder="Happy Customers"
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">Heading (বাংলা)</label>
          <input
            type="text"
            value={section.name_bn ?? ''}
            onChange={(e) => onChange({ ...section, name_bn: e.target.value })}
            placeholder="সন্তুষ্ট গ্রাহক"
            className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-medium text-gray-600">
            Review images <span className="text-gray-400">({section.images.length})</span>
          </label>
          <span className="text-[11px] text-gray-400">
            Tip: customer messenger / bKash screenshots work best
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {section.images.map((url, idx) => (
            <div key={idx} className="relative group">
              <div className="aspect-square">
                <ImageUpload
                  value={url}
                  onChange={(next) => onChange({
                    ...section,
                    images: section.images.map((u, i) => i === idx ? next : u),
                  })}
                  variant="square"
                />
              </div>
              <button
                onClick={() => onChange({
                  ...section,
                  images: section.images.filter((_, i) => i !== idx),
                })}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange({ ...section, images: [...section.images, ''] })}
            className="aspect-square flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-200 hover:border-gray-400 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Plus size={18} />
            <span className="text-[10px] font-medium">Add</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-medium text-gray-600 mb-1">Columns on desktop</label>
        <div className="flex items-center gap-2">
          {([3, 4, 5] as const).map((n) => (
            <button
              key={n}
              onClick={() => onChange({ ...section, columns: n })}
              className={`w-8 h-8 rounded-md text-sm font-medium ${
                section.columns === n ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {n}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-1">Mobile auto-stacks to a swipe carousel.</span>
        </div>
      </div>
    </div>
  );
}

/* ── ManualProductPicker ─────────────────────────────────────────── */
function ManualProductPicker({
  ids, onChange,
}: {
  ids: number[];
  onChange: (next: number[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const productsQuery = useQuery({
    queryKey: ['vendor', 'products', { search }],
    queryFn: () => productsApi.list({ search: search || undefined, per_page: 25 }),
    enabled: showPicker,
  });
  const products = productsQuery.data?.data ?? [];

  // Display the currently picked products in the configured order.
  const pickedQuery = useQuery({
    queryKey: ['vendor', 'products', 'picked', ids.join(',')],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const all = await productsApi.list({ per_page: 100 });
      const map = new Map(all.data.map((p) => [p.id, p]));
      return ids.map((id) => map.get(id)).filter((p) => p !== undefined);
    },
    enabled: ids.length > 0,
  });
  const picked = useMemo(
    () => (pickedQuery.data ?? []).filter((p): p is NonNullable<typeof p> => !!p),
    [pickedQuery.data],
  );

  return (
    <div>
      <div className="flex flex-col gap-1.5 mb-2">
        {picked.length === 0 && <p className="text-xs text-gray-400">No products picked yet.</p>}
        {picked.map((p, idx) => (
          <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
            <div className="w-7 h-7 bg-white rounded overflow-hidden shrink-0 border border-gray-200">
              {p.featured_image && (
                <Image src={p.featured_image} alt="" width={28} height={28} unoptimized className="w-full h-full object-cover" />
              )}
            </div>
            <span className="text-sm text-gray-900 truncate flex-1">{p.name}</span>
            <button
              onClick={() => onChange(ids.filter((i) => i !== p.id))}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-red-500"
              title="Remove"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {!showPicker ? (
        <button
          onClick={() => setShowPicker(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 border border-dashed border-gray-300 hover:border-gray-400 rounded-lg px-3 py-2"
        >
          <Plus size={14} /> Pick products
        </button>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="flex-1 h-8 px-2 text-sm bg-transparent outline-none"
            />
            <button onClick={() => setShowPicker(false)} className="text-xs text-gray-500 hover:text-gray-900">Close</button>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {productsQuery.isLoading && (
              <div className="p-4 text-center text-xs text-gray-400">Loading…</div>
            )}
            {!productsQuery.isLoading && products.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-400">No products match.</div>
            )}
            {products.map((p) => {
              const checked = ids.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => onChange(checked ? ids.filter((i) => i !== p.id) : [...ids, p.id])}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                >
                  <input type="checkbox" readOnly checked={checked} className="accent-black" />
                  <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden shrink-0">
                    {p.featured_image && (
                      <Image src={p.featured_image} alt="" width={32} height={32} unoptimized className="w-full h-full object-cover" />
                    )}
                  </div>
                  <span className="text-sm text-gray-900 truncate flex-1">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
