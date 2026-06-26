'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

import { useShopBase } from '@/lib/use-shop-base';
import { useLang } from '@/lib/i18n/context';
import { useTheme } from '@/lib/themes';
import { publicProductsApi } from '@/lib/api/services/storefront';
import { getAvailableSizes } from '@/lib/product-variants';
import {
  type HomeSection,
  isCarousel,
  isBannerRow,
  isProductSection,
  isReviewsGallery,
} from '@/lib/home-sections';
import type { Product } from '@/lib/api/types';

/* ── Helpers shared with the rest of the storefront ──────────────── */
function getDiscountedPrice(p: Product): number {
  const price = parseFloat(p.price) || 0;
  if (!p.discount || !p.discount_type) return price;
  const d = parseFloat(p.discount) || 0;
  return p.discount_type === 'percent' ? price - (price * d) / 100 : price - d;
}
function getOriginalPrice(p: Product): number | null {
  if (!p.discount || !p.discount_type) return null;
  return parseFloat(p.price) || 0;
}
function productBadge(p: Product): string | null {
  if (p.discount) return 'Sale';
  const publishedAt = p.published_at ? new Date(p.published_at).getTime() : 0;
  if (publishedAt > Date.now() - 30 * 24 * 60 * 60 * 1000) return 'New';
  return null;
}

function rewriteShopLink(url: string | null | undefined, sb: string): string {
  if (!url) return sb;
  if (/^https?:\/\//i.test(url)) return url;
  if (url === '/' || url === '/store') return sb;
  if (url.startsWith('/store/')) return `${sb}${url.slice('/store'.length)}`;
  if (url.startsWith('/shops/')) return url;
  if (url.startsWith('/')) return `${sb}${url}`;
  return `${sb}/${url}`;
}

/* ── CarouselSection ─────────────────────────────────────────────── */
function CarouselSection({
  slides, autoplayMs, sb,
}: {
  slides: { image: string; link?: string | null }[];
  autoplayMs: number;
  sb: string;
}) {
  const valid = slides.filter((s) => s.image);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (valid.length < 2 || autoplayMs <= 0) return;
    const handle = window.setInterval(() => {
      setIdx((i) => (i + 1) % valid.length);
    }, autoplayMs);
    return () => window.clearInterval(handle);
  }, [valid.length, autoplayMs]);

  if (valid.length === 0) return null;

  const slide = valid[idx];
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    slide.link ? (
      <Link href={rewriteShopLink(slide.link, sb)} className="block">
        {children}
      </Link>
    ) : (
      <div>{children}</div>
    );

  return (
    <div className="relative w-full aspect-[16/7] sm:aspect-[16/6] bg-gray-100 overflow-hidden">
      <Wrapper>
        {/* Plain <img> — slides may be SVG (vendor-uploaded promo art),
            and next/image blocks SVG by default for security. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading={idx === 0 ? 'eager' : 'lazy'}
        />
      </Wrapper>

      {valid.length > 1 && (
        <>
          <button
            onClick={() => setIdx((i) => (i - 1 + valid.length) % valid.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow flex items-center justify-center"
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setIdx((i) => (i + 1) % valid.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white shadow flex items-center justify-center"
            aria-label="Next slide"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {valid.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── BannerRowSection ────────────────────────────────────────────── */
function BannerRowSection({
  cards, columns, sb,
}: {
  cards: { image: string; link?: string | null }[];
  columns: 2 | 3 | 4;
  sb: string;
}) {
  const valid = cards.filter((c) => c.image);
  if (valid.length === 0) return null;

  const colClass = columns === 2
    ? 'grid-cols-2'
    : columns === 3
      ? 'grid-cols-2 md:grid-cols-3'
      : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className="container-app w-full">
      <div className={`grid w-full ${colClass} gap-3 sm:gap-4`}>
        {valid.map((c, i) => {
          // 16:9 landscape suits typical offer banner art; pre-shot lifestyle
          // photos crop to the centre via object-cover, full-width promo
          // graphics fill edge-to-edge. We use a plain <img> here (not
          // next/image) because banner art is often SVG, which next/image
          // blocks by default for security.
          const inner = (
            <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          );
          return c.link ? (
            <Link key={i} href={rewriteShopLink(c.link, sb)} className="group block w-full">
              {inner}
            </Link>
          ) : (
            <div key={i} className="w-full">{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

/* ── ProductSection ──────────────────────────────────────────────── */
function ProductSectionRenderer({
  section, sb, lang,
}: {
  section: Extract<HomeSection, { type: 'product_section' }>;
  sb: string;
  lang: 'en' | 'bn';
}) {
  const { ProductCard } = useTheme();
  const heading = (lang === 'bn'
    ? (section.name_bn?.trim() || section.name_en?.trim())
    : (section.name_en?.trim() || section.name_bn?.trim())) || '';

  const products = useProductSectionProducts(section);

  // "View all" target — category page if source is a category, /products otherwise.
  const viewAllUrl = section.source.type === 'category'
    ? `${sb}/products?category=${section.source.category_id}`
    : `${sb}/products`;

  // sm+ → grid (vendor-chosen column count). Mobile uses a horizontal
  // scroll-snap carousel rendered below — colClass only applies above sm.
  const colClass = section.columns === 2
    ? 'sm:grid-cols-2'
    : section.columns === 3
      ? 'sm:grid-cols-2 md:grid-cols-3'
      : 'sm:grid-cols-2 lg:grid-cols-4';

  // Auto-scroll the mobile carousel every 3.5s. Pauses for 6s when the user
  // touches/wheels/drags so they're never fighting the timer. Naturally
  // no-ops on desktop because the layout is grid (no horizontal overflow).
  // IMPORTANT: must be declared *before* any conditional return, otherwise
  // React's hook-call order changes between renders when the data loads.
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let pausedUntil = 0;
    const pause = () => { pausedUntil = Date.now() + 6000; };
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('wheel',      pause, { passive: true });
    el.addEventListener('pointerdown', pause);
    const id = window.setInterval(() => {
      if (Date.now() < pausedUntil) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return; // grid mode (desktop) — nothing to scroll
      const step = el.clientWidth * 0.6; // about one card-width at mobile
      if (el.scrollLeft >= max - 1) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, 3500);
    return () => {
      window.clearInterval(id);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('wheel',      pause);
      el.removeEventListener('pointerdown', pause);
    };
  }, [products.length]);

  // Safe to bail now — every hook above runs unconditionally on every render.
  if (products.length === 0) return null;

  return (
    <section className="container-app w-full">
      <h2 className="text-center text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
        {heading}
      </h2>

      {/* Mobile: horizontal scroll-snap carousel showing ~2 cards at a time
          with the third peeking on the right edge as a hint that more is
          available. sm+ : standard grid. The same children render in both
          modes — only the parent layout switches. Scrollbar is forced
          invisible across browsers (the global .no-scrollbar class isn't
          always applied early enough by Turbopack on first paint). */}
      <div
        ref={scrollerRef}
        className={`
          flex sm:grid w-full ${colClass}
          gap-4 sm:gap-5
          overflow-x-auto sm:overflow-visible
          snap-x snap-mandatory sm:snap-none
          [&::-webkit-scrollbar]:hidden
          -mx-4 sm:mx-0 px-4 sm:px-0
          pb-1 sm:pb-0
        `}
        style={{ scrollbarWidth: 'none' }}
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="snap-start shrink-0 w-[calc(50%-0.5rem)] sm:w-auto sm:shrink"
          >
            <ProductCard
              id={p.id}
              name={p.name}
              price={Math.round(getDiscountedPrice(p))}
              originalPrice={getOriginalPrice(p)}
              badge={productBadge(p)}
              rating={0}
              reviews={0}
              image={p.featured_image}
              availableSizes={getAvailableSizes(p)}
            />
          </div>
        ))}
      </div>
      <div className="mt-6 sm:mt-8 flex justify-center">
        <Link
          href={viewAllUrl}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-900 rounded-full px-5 py-2 transition-colors"
        >
          View all <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}

/* Hook that loads products for a single product section, branching by source.
 * Returns the resolved list (already trimmed by `limit`). React Query's
 * useQueries can't return a union of differently-typed results, so we run
 * two parallel hooks and pick whichever path the section uses. */
function useProductSectionProducts(
  section: Extract<HomeSection, { type: 'product_section' }>,
): Product[] {
  const isCategory = section.source.type === 'category';
  const categoryId = section.source.type === 'category' ? section.source.category_id : 0;
  const manualIds: number[] = section.source.type === 'manual' ? section.source.product_ids : [];
  const limitNum = section.limit === 'all'
    ? 24
    : Math.max(1, Math.min(48, Number(section.limit) || 8));

  // Category path
  const categoryQuery = useQuery({
    queryKey: ['storefront', 'home', 'products', section.id, categoryId, limitNum] as const,
    queryFn: () => publicProductsApi.list({ category_id: categoryId, per_page: limitNum }),
    enabled: isCategory && categoryId > 0,
  });

  // Manual path — one request per product id, preserving order.
  const manualQueries = useQueries({
    queries: !isCategory
      ? manualIds.map((id) => ({
          queryKey: ['storefront', 'home', 'product', id] as const,
          queryFn: () => publicProductsApi.get(String(id)),
        }))
      : [],
  });

  return useMemo(() => {
    if (isCategory) {
      const list = categoryQuery.data?.data ?? [];
      return section.limit === 'all' ? list : list.slice(0, limitNum);
    }
    return manualQueries
      .map((q) => q.data)
      .filter((p): p is Product => !!p);
  }, [isCategory, categoryQuery.data, manualQueries, section.limit, limitNum]);
}

/* ── ReviewsGallerySection ──────────────────────────────────────── *
 * Mobile  : horizontal swipe-snap carousel (same UX as ProductSection).
 * Desktop : grid with vendor-chosen column count (3 / 4 / 5).
 * Each tile is a square that opens a lightbox-style enlarged preview when
 * clicked — review screenshots are usually messenger / bKash captures the
 * customer wants to read the text from. */
function ReviewsGallerySection({
  section, lang,
}: {
  section: Extract<HomeSection, { type: 'reviews_gallery' }>;
  lang: 'en' | 'bn';
}) {
  const heading = (lang === 'bn'
    ? (section.name_bn?.trim() || section.name_en?.trim())
    : (section.name_en?.trim() || section.name_bn?.trim())) || '';

  const valid = section.images.filter((url) => !!url);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let pausedUntil = 0;
    const pause = () => { pausedUntil = Date.now() + 6000; };
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('wheel',      pause, { passive: true });
    el.addEventListener('pointerdown', pause);
    const id = window.setInterval(() => {
      if (Date.now() < pausedUntil) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const step = el.clientWidth * 0.6;
      if (el.scrollLeft >= max - 1) el.scrollTo({ left: 0, behavior: 'smooth' });
      else                         el.scrollBy({ left: step, behavior: 'smooth' });
    }, 4000);
    return () => {
      window.clearInterval(id);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('wheel',      pause);
      el.removeEventListener('pointerdown', pause);
    };
  }, [valid.length]);

  if (valid.length === 0) return null;

  // Always-on horizontal carousel — same UX on mobile + desktop, just with a
  // different number of tiles visible. Vendor's `columns` setting controls
  // the desktop count; mobile shows 2 with the third peeking.
  const desktopWidth = section.columns === 3
    ? 'md:w-[calc(33.333%-0.75rem)]'
    : section.columns === 4
      ? 'md:w-[calc(25%-0.75rem)]'
      : 'md:w-[calc(20%-0.8rem)]';

  return (
    <section className="container-app w-full">
      <h2 className="text-center text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
        {heading}
      </h2>
      <div
        ref={scrollerRef}
        className="flex w-full gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden -mx-4 sm:mx-0 px-4 sm:px-0"
        style={{ scrollbarWidth: 'none' }}
      >
        {valid.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightbox(url)}
            className={`snap-start shrink-0 w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.667rem)] ${desktopWidth} relative aspect-square rounded-xl overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </section>
  );
}

/* ── HomeSectionRenderer ─────────────────────────────────────────── */
export function HomeSectionRenderer({ sections }: { sections: HomeSection[] }) {
  const sb = useShopBase();
  const { lang } = useLang();

  const visible = sections.filter((s) => s.visible);
  if (visible.length === 0) return null;

  return (
    // Negative top margin cancels the storefront <main>'s top padding so the
    // first section (typically the hero carousel) starts flush with the
    // sticky header. Values match `.main-content { padding-top: ... }` in
    // globals.css — 12px on mobile, 16px on desktop.
    <div className="-mt-3 sm:-mt-4 flex flex-col gap-10 sm:gap-14 pb-12 sm:pb-16">
      {visible.map((s) => {
        if (isCarousel(s)) {
          return (
            <CarouselSection
              key={s.id}
              slides={s.slides}
              autoplayMs={s.autoplay_ms ?? 5000}
              sb={sb}
            />
          );
        }
        if (isBannerRow(s)) {
          return <BannerRowSection key={s.id} cards={s.cards} columns={s.columns} sb={sb} />;
        }
        if (isProductSection(s)) {
          return <ProductSectionRenderer key={s.id} section={s} sb={sb} lang={lang} />;
        }
        if (isReviewsGallery(s)) {
          return <ReviewsGallerySection key={s.id} section={s} lang={lang} />;
        }
        return null;
      })}
    </div>
  );
}
