'use client';

import { useShopBase } from '@/lib/use-shop-base';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/lib/themes';
import { PackageX, ArrowLeft, X, Minus, Plus, PlayCircle as PlayCircleIcon } from 'lucide-react';
import { cartApi, publicProductsApi, storeInfoApi } from '@/lib/api/services/storefront';
import { getApiErrorMessage } from '@/lib/api/client';
import { flyToCart } from '@/lib/fly-to-cart';
import type { Product } from '@/lib/api/types';
import { ProductReviews } from '@/components/store/product-reviews';
import { VideoModal } from '@/components/store/video-modal';
import { useLang } from '@/lib/i18n/context';
import { useMetaPixel } from '@/components/store/meta-pixel-provider';
import type { ThemeProductTab } from '@/lib/themes';
import { getAvailableSizes } from '@/lib/product-variants';

/* ── Helpers ─────────────────────────────────────────────────────── */
// `Pricing` is structurally compatible with both Product and ProductVariant —
// they both carry their own price/discount/discount_type fields, so the same
// helpers work for either when computing what the customer sees.
type Pricing = { price?: string | number | null; discount?: string | number | null; discount_type?: string | null };

function getDiscountedPrice(p: Pricing): number {
  const price = parseFloat(String(p.price ?? '')) || 0;
  if (!p.discount || !p.discount_type) return price;
  const d = parseFloat(String(p.discount)) || 0;
  return p.discount_type === 'percent' ? price - (price * d) / 100 : price - d;
}
function getOriginalPrice(p: Pricing): number | null {
  if (!p.discount || !p.discount_type) return null;
  return parseFloat(String(p.price ?? '')) || 0;
}
function productBadge(p: Product): string | null {
  if (p.discount) return 'Sale';
  const publishedAt = p.published_at ? new Date(p.published_at).getTime() : 0;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (publishedAt > thirtyDaysAgo) return 'New';
  return null;
}

/* API returns a product optionally with `similar_products` and review stats.
   Older builds shipped a `related_products` field — kept on the type as an
   alias so we don't break any caller that's already serializing under that
   name. */
type ProductWithRelated = Product & {
  similar_products?: Product[];
  related_products?: Product[];
  reviews?: { data?: import('@/lib/api/types').Review[] };
  reviews_summary?: {
    count: number;
    average: number;
    distribution?: Record<'1' | '2' | '3' | '4' | '5', number>;
  };
  /** Bundle-shaped block on the storefront detail response. */
  bundle?: {
    pricing_strategy: 'sum' | 'fixed' | 'percent';
    bundle_price: number;
    bundle_discount_percent: number | null;
    compare_at_price: number | null;
    component_sum_min: number;
    component_sum_max: number;
    savings_max: number;
    components: Array<{
      id: number;
      component_product_id: number;
      quantity: number;
      sort_order: number;
      is_required: boolean;
      product: {
        id: number;
        name: string;
        slug: string;
        product_type: string;
        price: string;
        discount: string | null;
        discount_type: 'flat' | 'percent' | null;
        featured_image: string | null;
        images: string[];
        has_variants: boolean;
        stock: number;
        variants: Array<{
          id: number;
          sku: string | null;
          options: Record<string, string>;
          price: string;
          discount: string | null;
          discount_type: 'flat' | 'percent' | null;
          stock: number;
          image: string | null;
          effective_price: number;
        }>;
      };
    }>;
  };
};

/* ── Page component ─────────────────────────────────────────────── */
export default function ProductDetailClient() {
  const __sb = useShopBase();


  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { ProductDetail, ProductCard } = useTheme();
  const { lang, t } = useLang();
  const { track, config: pixelConfig } = useMetaPixel();
  const slugOrId = String(params.id ?? '');
  const [cartError, setCartError] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  // Pre-select option from `?size=...` (or any other ?<label>=value pair the
  // homepage card might pass). Lets vendors land users with a chosen variant
  // without an extra click — used by the size chips on product cards.
  const initialOptions = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    const size = searchParams.get('size');
    if (size) out['Size'] = size;
    return out;
  }, [searchParams]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(initialOptions);
  // When a variant product hits Add to Cart without all options chosen,
  // we open this picker (bottom sheet on mobile / centered modal on
  // desktop) instead of throwing an inline error — same pattern as Daraz.
  const [showVariantPicker, setShowVariantPicker] = useState(false);
  const [pickerQty, setPickerQty] = useState(1);

  // Load the store info so we can wire the WhatsApp button. Cached for
   // 60s — same query the layout already uses, so this just hits cache.
  const storeInfoQuery = useQuery({
    queryKey: ['storefront', 'store-info-full'],
    queryFn: () => storeInfoApi.full(),
    staleTime: 60_000,
  });

  const productQuery = useQuery({
    queryKey: ['storefront', 'product', slugOrId],
    queryFn: () => publicProductsApi.get(slugOrId) as Promise<ProductWithRelated>,
    enabled: !!slugOrId,
  });

  const addToCartMutation = useMutation({
    mutationFn: (payload: { product_id: number; variant_id: number | null; quantity?: number }) =>
      cartApi.add({ product_id: payload.product_id, variant_id: payload.variant_id, quantity: payload.quantity ?? 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storefront', 'cart'] });
      if (product && pixelConfig?.track_add_to_cart) {
        track('AddToCart', {
          content_ids: [String(product.id)],
          content_type: 'product',
          value: parseFloat(String(product.price)) || 0,
          currency: 'BDT',
        });
      }
      const heroImg = document.querySelector<HTMLElement>('.product-detail-hero img, [data-product-hero] img, main img');
      flyToCart(heroImg);
    },
    onError: (err) => setCartError(getApiErrorMessage(err, 'Could not add to cart.')),
  });

  if (productQuery.isLoading) {
    return (
      <div className="container-app pt-12 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
          <div className="space-y-3">
            <div className="h-8 w-3/4 bg-gray-100 rounded animate-pulse" />
            <div className="h-5 w-1/4 bg-gray-100 rounded animate-pulse" />
            <div className="h-24 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const product = productQuery.data;

  // Fire ViewContent once when product data loads
  useEffect(() => {
    if (product && pixelConfig?.track_view_content) {
      track('ViewContent', {
        content_ids: [String(product.id)],
        content_type: 'product',
        value: parseFloat(String(product.price)) || 0,
        currency: 'BDT',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  /* 404 state */
  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <PackageX className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
        <p className="text-sm text-gray-500 mb-6">
          The product you are looking for does not exist or has been removed.
        </p>
        <Link
          href={`${__sb}/products`}
          className="inline-flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
      </div>
    );
  }

  /* Bundle products use a dedicated layout with N inline component
     pickers — quite different from the theme's single-product detail
     view, so we early-return here and skip the rest. */
  if (product.product_type === 'bundle' && product.bundle) {
    return (
      <BundleDetailView
        product={product}
        cartError={cartError}
        setCartError={setCartError}
      />
    );
  }

  /* Normalize variant options: API may return [{option_label,option_value}] or {label:value}. */
  function normalizeOptions(raw: unknown): Record<string, string> {
    if (!raw || typeof raw !== 'object') return {};
    if (Array.isArray(raw)) {
      const map: Record<string, string> = {};
      for (const item of raw) {
        if (item && typeof item === 'object' && 'option_label' in item)
          map[(item as {option_label: string; option_value: string}).option_label] =
            (item as {option_label: string; option_value: string}).option_value ?? '';
      }
      return map;
    }
    return raw as Record<string, string>;
  }

  /* Derive variant option groups (label -> values) from variant.options. */
  const variantOptionsMap: Record<string, Set<string>> = {};
  (product.variants ?? []).forEach(v => {
    Object.entries(normalizeOptions(v.options)).forEach(([label, value]) => {
      if (!variantOptionsMap[label]) variantOptionsMap[label] = new Set();
      variantOptionsMap[label].add(value as string);
    });
  });
  const variantOptions = Object.entries(variantOptionsMap).map(([label, vals]) => ({
    label,
    values: Array.from(vals),
  }));

  // Backend returns the field as `similar_products`. Fall back to the legacy
  // `related_products` name in case any cached payload is still using it.
  const related = product.similar_products ?? product.related_products ?? [];

  // Resolve the currently-selected option combo → PrintVariant → variant_id.
  const matchingVariant = (product.variants ?? []).find((v) => {
    const opts = normalizeOptions(v.options);
    const labels = Object.keys(variantOptionsMap);
    return labels.every((l) => opts[l] === selectedOptions[l]);
  });
  const allOptionsSelected =
    Object.keys(variantOptionsMap).every((l) => !!selectedOptions[l]);
  const needsVariantSelection = variantOptions.length > 0 && !allOptionsSelected;
  const isOutOfStock = matchingVariant
    ? (matchingVariant.stock ?? 0) <= 0
    : product.has_variants
      ? false // not yet selected; will validate on submit
      : (product.stock ?? 0) <= 0;

  // Units remaining to show on the PDP. When variants exist and none is picked
  // yet, we don't have a definitive count, so leave it null.
  const stockRemaining: number | null = product.has_variants
    ? (matchingVariant ? matchingVariant.stock ?? 0 : null)
    : (product.stock ?? 0);

  const stockBadgeText = (() => {
    if (stockRemaining == null) return null;
    if (stockRemaining <= 0) return { label: 'Out of stock', tone: 'red' as const };
    if (stockRemaining <= 5) return { label: `Only ${stockRemaining} left`, tone: 'orange' as const };
    return { label: `${stockRemaining} in stock`, tone: 'green' as const };
  })();

  // Resolve vendor-defined tabs to the current language. Bangla falls back to
  // English when blank so vendors can fill just one side and still get a
  // working tab in both locales. Tabs without a name in either language are
  // dropped silently.
  const resolvedCustomTabs: ThemeProductTab[] = (product.custom_tabs ?? [])
    .map((t) => {
      const label = lang === 'bn'
        ? (t.name_bn?.trim() || t.name_en?.trim() || '')
        : (t.name_en?.trim() || t.name_bn?.trim() || '');
      const content = lang === 'bn'
        ? (t.content_bn?.trim() || t.content_en?.trim() || '')
        : (t.content_en?.trim() || t.content_bn?.trim() || '');
      return { label, content };
    })
    .filter((t) => t.label);

  return (
    <div>
      {cartError && (
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {cartError}
          </div>
        </div>
      )}

      {/* Theme ProductDetail component — receives stockRemaining and decides
          where to surface it (typically next to the variant picker). */}
      <ProductDetail
        id={product.id}
        name={product.name}
        // If the customer has picked a variant with its own price, surface
        // that — otherwise fall back to the product-level price. Same logic
        // for the strike-through "compare at" price.
        price={Math.round(
          matchingVariant && parseFloat(String(matchingVariant.price ?? '')) > 0
            ? getDiscountedPrice(matchingVariant)
            : getDiscountedPrice(product)
        )}
        originalPrice={
          matchingVariant && parseFloat(String(matchingVariant.price ?? '')) > 0
            ? getOriginalPrice(matchingVariant)
            : getOriginalPrice(product)
        }
        description={product.description || product.short_description || ''}
        // `blob:` and `data:` URLs are session-scoped previews — if they ever
        // get persisted to the DB (legacy bug in the upload component) they
        // 404 on every other visit. Drop them at render time so the gallery
        // never shows broken thumbnails.
        images={(product.images || []).filter(
          (u) => typeof u === 'string' && !u.startsWith('blob:') && !u.startsWith('data:'),
        )}
        rating={product.reviews_summary?.average ?? 0}
        reviews={product.reviews_summary?.count ?? 0}
        variants={variantOptions}
        category={product.category?.name ?? ''}
        brand={product.brand?.name ?? ''}
        selectedOptions={selectedOptions}
        onSelectOption={(label, value) => setSelectedOptions((prev) => ({ ...prev, [label]: value }))}
        onAddToCart={() => {
          setCartError(null);
          // Variant product without full selection: open the picker instead
          // of showing an error. Far better UX — user sees what's missing
          // and can fix it without scrolling.
          if (needsVariantSelection) {
            setPickerQty(1);
            setShowVariantPicker(true);
            return;
          }
          if (isOutOfStock) {
            setCartError('This variant is currently out of stock.');
            return;
          }
          addToCartMutation.mutate({
            product_id: product.id,
            variant_id: matchingVariant?.id ?? null,
          });
        }}
        isAddingToCart={addToCartMutation.isPending}
        isOutOfStock={isOutOfStock}
        stockRemaining={stockRemaining}
        customTabs={resolvedCustomTabs}
        labels={{
          description: t.storeProductDetail.description,
          reviews: t.storeProductDetail.reviews,
          noReviews: t.storeProductDetail.noReviews,
          addToCart: t.storeProductDetail.addToCart,
          adding: t.storeProductDetail.adding,
          orderOnWhatsApp: t.storeProductDetail.orderOnWhatsApp,
          whatsappAria: t.storeProductDetail.whatsappAria,
          shareTitle: t.storeProductDetail.shareTitle,
          shareThis: t.storeProductDetail.shareThis,
          shareOnFacebook: t.storeProductDetail.shareOnFacebook,
          shareOnInstagram: t.storeProductDetail.shareOnInstagram,
          copyLink: t.storeProductDetail.copyLink,
          linkCopied: t.storeProductDetail.linkCopied,
          shareInstagramHint: t.storeProductDetail.shareInstagramHint,
          cancel: t.storeProductDetail.cancel,
          shareAria: t.storeProductDetail.shareAria,
        }}
        // Watch Video — replaces the old WhatsApp button. The button only
        // renders when the vendor saved a video_url on the product, and
        // clicking it opens the VideoModal mounted below.
        videoUrl={product.video_url}
        onWatchVideoClick={() => setVideoOpen(true)}
        watchVideoLabel={t.storeProductDetail.watchVideo}
        sizeGuideUrl={product.size_guide_url}
        onSizeGuideClick={() => setSizeGuideOpen(true)}
        productUrl={typeof window !== 'undefined' ? window.location.href : ''}
        productImage={product.featured_image ?? product.images?.[0] ?? null}
        // Reviews UI is rendered inside the theme's Reviews tab (rather than
        // as a separate stacked section) so customers see it only after
        // clicking "Reviews" — keeps the Description tab focused on copy.
        reviewsContent={
          <ProductReviews
            productId={product.id}
            reviews={product.reviews?.data ?? []}
            summary={{
              count: product.reviews_summary?.count ?? 0,
              average: product.reviews_summary?.average ?? 0,
              distribution: product.reviews_summary?.distribution,
            }}
          />
        }
      />

      {/* Related Products — desktop: 4-up grid; mobile: snap-carousel of
          ~2 cards at a time, matching the homepage product-section pattern. */}
      {related.length > 0 && (
        <RelatedProducts items={related} title={t.storeProductDetail.relatedProducts} />
      )}

      {/* Video modal — opens when the customer clicks "Watch Video". The
          theme's button only shows when product.video_url is set, but mount
          the modal unconditionally so it can also be triggered from other
          spots later (e.g., a video thumbnail in the gallery). */}
      <VideoModal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        videoUrl={product.video_url}
        title={product.name}
      />
      <VideoModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        videoUrl={product.size_guide_url}
        title="Size Guide"
      />

      {/* Variant picker — opened when a customer hits Add to Cart on a
          variant product without making a full selection. Bottom sheet on
          mobile, centered modal on desktop. */}
      {showVariantPicker && (
        <VariantPickerSheet
          product={product}
          variantOptions={variantOptions}
          selectedOptions={selectedOptions}
          onSelectOption={(label, value) => setSelectedOptions((prev) => ({ ...prev, [label]: value }))}
          matchingVariant={matchingVariant}
          allOptionsSelected={allOptionsSelected}
          stockRemaining={stockRemaining}
          qty={pickerQty}
          setQty={setPickerQty}
          isAddingToCart={addToCartMutation.isPending}
          onClose={() => setShowVariantPicker(false)}
          onConfirm={() => {
            if (!allOptionsSelected || !matchingVariant) return;
            if ((matchingVariant.stock ?? 0) <= 0) return;
            addToCartMutation.mutate({
              product_id: product.id,
              variant_id: matchingVariant.id,
              quantity: pickerQty,
            });
            setShowVariantPicker(false);
          }}
        />
      )}
    </div>
  );
}

/* ── VariantPickerSheet ───────────────────────────────────────────────
 * Modal that surfaces the variant chips, qty stepper, and an Add to Cart
 * button when the customer skipped the picker on the main page. Mirrors
 * the Daraz / Shopee pattern: bottom sheet on mobile, centered modal on
 * desktop. Tap backdrop or X to close.
 */
type VariantOptionGroup = { label: string; values: string[] };
function VariantPickerSheet({
  product,
  variantOptions,
  selectedOptions,
  onSelectOption,
  matchingVariant,
  allOptionsSelected,
  stockRemaining,
  qty,
  setQty,
  isAddingToCart,
  onClose,
  onConfirm,
}: {
  product: ProductWithRelated;
  variantOptions: VariantOptionGroup[];
  selectedOptions: Record<string, string>;
  onSelectOption: (label: string, value: string) => void;
  matchingVariant: import('@/lib/api/types').ProductVariant | undefined;
  allOptionsSelected: boolean;
  stockRemaining: number | null;
  qty: number;
  setQty: (n: number) => void;
  isAddingToCart: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const displayedPrice = matchingVariant && parseFloat(String(matchingVariant.price ?? '')) > 0
    ? Math.round(getDiscountedPrice(matchingVariant))
    : Math.round(getDiscountedPrice(product));
  const displayedOriginal = matchingVariant && parseFloat(String(matchingVariant.price ?? '')) > 0
    ? getOriginalPrice(matchingVariant)
    : getOriginalPrice(product);
  const thumbSrc = (product.images || []).find((u) => typeof u === 'string' && !u.startsWith('blob:') && !u.startsWith('data:'))
    || product.featured_image || null;
  const isOos = matchingVariant && (matchingVariant.stock ?? 0) <= 0;
  const cantConfirm = !allOptionsSelected || !matchingVariant || isOos;
  const missingLabels = variantOptions.filter(g => !selectedOptions[g.label]).map(g => g.label);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col animate-[slideUp_200ms_ease-out]"
      >
        {/* Top bar with thumb + price + close */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
          {thumbSrc && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={thumbSrc} alt={product.name} className="w-20 h-20 rounded-lg object-cover bg-gray-100 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-[#2596be]">৳{displayedPrice}</span>
              {displayedOriginal && (
                <span className="text-sm text-gray-400 line-through">৳{Math.round(displayedOriginal)}</span>
              )}
            </div>
            {matchingVariant && (
              <p className="text-xs text-gray-500 mt-1">
                {Object.values(matchingVariant.options ?? {}).join(' / ')}
                {typeof matchingVariant.stock === 'number' && (
                  <span className={`ml-2 ${matchingVariant.stock > 5 ? 'text-green-600' : matchingVariant.stock > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                    {matchingVariant.stock > 0 ? `${matchingVariant.stock} in stock` : 'Out of stock'}
                  </span>
                )}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Variant option groups */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {variantOptions.map((group) => (
            <div key={group.label}>
              <p className="text-sm font-semibold text-gray-900 mb-2">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.values.map((val) => {
                  const isSelected = selectedOptions[group.label] === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onSelectOption(group.label, val)}
                      className={`px-3.5 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-[#2596be] bg-[#2596be]/10 text-[#2596be]'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quantity */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Quantity</p>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border border-gray-200 rounded-lg">
                <button
                  type="button"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  disabled={qty <= 1}
                  aria-label="Decrease"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center text-sm font-medium">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty(qty + 1)}
                  className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  disabled={typeof stockRemaining === 'number' && qty >= stockRemaining}
                  aria-label="Increase"
                >
                  <Plus size={14} />
                </button>
              </div>
              {missingLabels.length > 0 && (
                <span className="text-xs text-orange-600">Pick {missingLabels.join(', ')}</span>
              )}
            </div>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white">
          <button
            type="button"
            onClick={onConfirm}
            disabled={cantConfirm || isAddingToCart}
            className="w-full h-11 bg-[#2596be] text-white rounded-lg font-semibold transition-colors hover:bg-[#1e7a9c] disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isAddingToCart
              ? 'Adding...'
              : isOos
                ? 'Out of stock'
                : cantConfirm
                  ? `Select ${missingLabels.join(' & ')}`
                  : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Related products section — desktop renders a 4-column grid; mobile
 * collapses to a horizontal scroll-snap carousel showing ~2 cards at a
 * time with the third peeking from the right edge as a "more available"
 * affordance. Auto-scrolls every 3.5s on mobile and pauses 6s when the
 * customer touches/wheels/drags so they're not fighting the timer.
 *
 * Same UX pattern as the homepage product carousel
 * (home-section-renderer.tsx) — kept self-contained here because it's a
 * one-off layout for this page.
 */
function RelatedProducts({ items, title }: { items: Product[]; title: string }) {
  const { ProductCard } = useTheme();
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
      const step = el.clientWidth * 0.6;
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
  }, [items.length]);

  return (
    <section className="max-w-7xl mx-auto px-4 pb-16 pt-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">{title}</h2>
      <div
        ref={scrollerRef}
        className={`
          flex sm:grid w-full sm:grid-cols-2 lg:grid-cols-4
          gap-4 sm:gap-5
          overflow-x-auto sm:overflow-visible
          snap-x snap-mandatory sm:snap-none
          [&::-webkit-scrollbar]:hidden
          -mx-4 sm:mx-0 px-4 sm:px-0
          pb-1 sm:pb-0
        `}
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((rp) => (
          <div
            key={rp.id}
            className="snap-start shrink-0 w-[calc(50%-0.5rem)] sm:w-auto sm:shrink"
          >
            <ProductCard
              id={rp.id}
              name={rp.name}
              price={Math.round(getDiscountedPrice(rp))}
              originalPrice={getOriginalPrice(rp)}
              badge={productBadge(rp)}
              rating={0}
              reviews={0}
              image={rp.featured_image}
              category={rp.category?.name}
              availableSizes={getAvailableSizes(rp)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Bundle product detail view ──────────────────────────────────
   Rendered when product.product_type === 'bundle'. Each component
   gets its own inline variant picker; Add to Cart submits the full
   set of picks. The bundle pricing strategy (sum/fixed/percent) was
   already applied server-side, so we just render product.bundle.bundle_price.
*/
function BundleDetailView({
  product, cartError, setCartError,
}: {
  product: ProductWithRelated;
  cartError: string | null;
  setCartError: (s: string | null) => void;
}) {
  const __sb = useShopBase();
  const router = useRouter();
  const qc = useQueryClient();
  const { lang, t } = useLang();
  const [activeTab, setActiveTab] = useState<string>('description');

  const bundle = product.bundle!;
  const components = [...bundle.components].sort((a, b) => a.sort_order - b.sort_order);

  // One picker per component. Picks shape: { componentProductId: { optionLabel: value } }
  const [picks, setPicks] = useState<Record<number, Record<string, string>>>({});
  const [qty, setQty] = useState(1);

  // Resolve each component's chosen variant from its options pick.
  const chosenVariants = useMemo(() => {
    const out: Record<number, { variant_id: number | null; effective_price: number; stock: number }> = {};
    components.forEach((c) => {
      const cp = c.product;
      if (!cp.has_variants) {
        // No variants on this component — single SKU, always selectable.
        const eff = cp.discount && cp.discount_type
          ? cp.discount_type === 'percent'
            ? parseFloat(cp.price) - (parseFloat(cp.price) * parseFloat(cp.discount)) / 100
            : parseFloat(cp.price) - parseFloat(cp.discount)
          : parseFloat(cp.price);
        out[c.component_product_id] = {
          variant_id: null,
          effective_price: Math.max(0, eff),
          stock: cp.stock,
        };
        return;
      }
      const compPicks = picks[c.component_product_id] ?? {};
      const labels = Array.from(new Set(cp.variants.flatMap(v => Object.keys(v.options))));
      const allChosen = labels.every(l => compPicks[l]);
      if (!allChosen) {
        out[c.component_product_id] = { variant_id: null, effective_price: 0, stock: 0 };
        return;
      }
      const matched = cp.variants.find(v => labels.every(l => v.options[l] === compPicks[l]));
      if (!matched) {
        out[c.component_product_id] = { variant_id: null, effective_price: 0, stock: 0 };
        return;
      }
      out[c.component_product_id] = {
        variant_id: matched.id,
        effective_price: matched.effective_price,
        stock: matched.stock,
      };
    });
    return out;
  }, [picks, components]);

  // Recalculate the bundle price based on the customer's actual variant
  // picks (sum strategy uses picks; fixed/percent ignore them but we
  // still compute a "savings vs sum-of-picks" display).
  const sumOfPicks = components.reduce((acc, c) => {
    const ch = chosenVariants[c.component_product_id];
    return acc + (ch?.effective_price ?? 0) * c.quantity;
  }, 0);

  const livePrice = (() => {
    if (bundle.pricing_strategy === 'fixed') return bundle.bundle_price;
    if (bundle.pricing_strategy === 'percent') {
      const pct = bundle.bundle_discount_percent ?? 0;
      return Math.round(sumOfPicks * (1 - pct / 100));
    }
    return sumOfPicks; // 'sum'
  })();

  const liveSavings = Math.max(0, sumOfPicks - livePrice);

  const allChosen = components.every(c => {
    if (!c.is_required) return true;
    return chosenVariants[c.component_product_id]?.variant_id !== null
      || !c.product.has_variants;
  });

  const anyOutOfStock = components.some(c => {
    const ch = chosenVariants[c.component_product_id];
    if (!ch || !ch.variant_id && c.product.has_variants) return false; // not picked yet
    return ch.stock < (c.quantity * qty);
  });

  const heroImage = product.featured_image
    ?? (product.images && product.images[0])
    ?? components[0]?.product.featured_image
    ?? null;

  // Ref so the fly-to-cart animation can grab the hero image's bounding
  // rect at the moment the customer hits Add to Cart.
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);

  const addToCartMutation = useMutation({
    mutationFn: () => cartApi.add({
      product_id: product.id,
      variant_id: null,
      quantity: qty,
      components: components.map(c => ({
        component_product_id: c.component_product_id,
        variant_id: chosenVariants[c.component_product_id]?.variant_id ?? null,
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storefront', 'cart'] });
      flyToCart(heroRef.current);
    },
    onError: (err) => setCartError(getApiErrorMessage(err, 'Could not add bundle to cart.')),
  });

  return (
    <div className="container-app pt-6 pb-10">
      {cartError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {cartError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hero image */}
        <div ref={heroRef} className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
          {heroImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={heroImage} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No image</div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div>
            <span className="inline-flex items-center text-[10px] font-semibold bg-[#2596be]/10 text-[#2596be] px-2 py-0.5 rounded mb-2">
              BUNDLE
            </span>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            {product.short_description && (
              <p className="text-sm text-gray-500 mt-1">{product.short_description}</p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-[#2596be]">৳{Math.round(livePrice).toLocaleString()}</span>
            {bundle.compare_at_price && bundle.compare_at_price > livePrice && (
              <span className="text-base text-gray-400 line-through">৳{Math.round(bundle.compare_at_price).toLocaleString()}</span>
            )}
            {!bundle.compare_at_price && liveSavings > 0 && (
              <span className="text-base text-gray-400 line-through">৳{Math.round(sumOfPicks).toLocaleString()}</span>
            )}
            {liveSavings > 0 && (
              <span className="inline-flex items-center text-xs font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded">
                Save ৳{Math.round(liveSavings).toLocaleString()}
              </span>
            )}
          </div>

          {/* Component pickers */}
          <div className="border-t border-gray-100 pt-4 space-y-5">
            {components.map((c, i) => {
              const cp = c.product;
              const labels = Array.from(new Set(cp.variants.flatMap(v => Object.keys(v.options))));
              const compPicks = picks[c.component_product_id] ?? {};

              // For each label, derive the values that exist in any variant.
              const valuesByLabel: Record<string, string[]> = {};
              labels.forEach(l => {
                valuesByLabel[l] = Array.from(new Set(cp.variants.map(v => v.options[l]).filter(Boolean)));
              });

              return (
                <div key={c.id} className={i > 0 ? 'pt-5 border-t border-gray-100' : ''}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                      {cp.featured_image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cp.featured_image} alt={cp.name} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{cp.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {c.quantity > 1 ? `Quantity in bundle: ${c.quantity}` : 'Included in bundle'}
                      </p>
                    </div>
                  </div>

                  {!cp.has_variants ? (
                    <p className="text-xs text-gray-400">No variants — included as-is</p>
                  ) : (
                    <div className="space-y-2.5">
                      {labels.map(label => (
                        <div key={label}>
                          <p className="text-xs font-medium text-gray-700 mb-1.5">{label}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {valuesByLabel[label].map(value => {
                              const isSelected = compPicks[label] === value;
                              // Disable values that lead to out-of-stock variants
                              // when combined with the other already-picked options.
                              const wouldMatch = cp.variants.find(v => {
                                if (v.options[label] !== value) return false;
                                return labels.every(l =>
                                  l === label ? true : (compPicks[l] ? v.options[l] === compPicks[l] : true)
                                );
                              });
                              const oos = wouldMatch && wouldMatch.stock <= 0;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => setPicks(prev => ({
                                    ...prev,
                                    [c.component_product_id]: { ...(prev[c.component_product_id] ?? {}), [label]: value },
                                  }))}
                                  disabled={oos}
                                  className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors disabled:opacity-50 disabled:line-through ${
                                    isSelected
                                      ? 'border-[#2596be] bg-[#2596be]/10 text-[#2596be]'
                                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                                  }`}
                                >
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {chosenVariants[c.component_product_id]?.variant_id && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          {chosenVariants[c.component_product_id].stock > 0
                            ? `${chosenVariants[c.component_product_id].stock} in stock`
                            : 'Out of stock'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quantity + Add to Cart */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-sm font-medium text-gray-700">Qty</span>
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center text-sm font-medium">{qty}</span>
                <button type="button" onClick={() => setQty(q => q + 1)}
                  className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                disabled={!allChosen || anyOutOfStock || addToCartMutation.isPending}
                onClick={() => addToCartMutation.mutate()}
                className="flex-1 h-12 rounded-lg bg-[#2596be] text-white font-semibold hover:bg-[#1f7fa1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addToCartMutation.isPending
                  ? 'Adding...'
                  : !allChosen
                    ? 'Pick a variant for each item'
                    : anyOutOfStock
                      ? 'Out of stock'
                      : `Add to Cart — ৳${Math.round(livePrice * qty).toLocaleString()}`}
              </button>
              {/* Watch Video — only when the vendor has set a video_url on the bundle. */}
              {product.video_url && (
                <button
                  type="button"
                  onClick={() => setVideoOpen(true)}
                  className="sm:flex-1 h-12 rounded-lg border-2 border-[#2596be] text-[#2596be] font-semibold hover:bg-[#2596be]/5 transition-colors flex items-center justify-center gap-2"
                >
                  <PlayCircleIcon /> {t.storeProductDetail.watchVideo}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Tabs: Description / Custom tabs (vendor-defined) / Reviews — same
          structure customers see on regular product pages, just rendered
          inline rather than via the theme component (the bundle view has
          its own header above and we don't want the theme's variant grid). */}
      <BundleDetailTabs
        product={product}
        lang={lang}
        labels={{
          description: t.storeProductDetail.description,
          reviews: t.storeProductDetail.reviews,
          noReviews: t.storeProductDetail.noReviews,
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Related products — same component the regular product page uses,
          so the auto-scrolling carousel + 4-up desktop grid stays consistent. */}
      {(product.similar_products?.length ?? product.related_products?.length ?? 0) > 0 && (
        <RelatedProducts
          items={product.similar_products ?? product.related_products ?? []}
          title={t.storeProductDetail.relatedProducts}
        />
      )}

      {/* Bundle video modal — same component the regular product page uses. */}
      <VideoModal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        videoUrl={product.video_url}
        title={product.name}
      />
    </div>
  );
}

function BundleDetailTabs({
  product, lang, labels, activeTab, setActiveTab,
}: {
  product: ProductWithRelated;
  lang: 'en' | 'bn';
  labels: { description: string; reviews: string; noReviews: string };
  activeTab: string;
  setActiveTab: (k: string) => void;
}) {
  // Resolve vendor-defined custom tabs to the current language. BN falls back
  // to EN when blank — same convention as the regular detail page.
  const customTabs = useMemo(() => (product.custom_tabs ?? []).map((tt, i) => {
    const label = lang === 'bn'
      ? (tt.name_bn?.trim() || tt.name_en?.trim() || '')
      : (tt.name_en?.trim() || tt.name_bn?.trim() || '');
    const content = lang === 'bn'
      ? (tt.content_bn?.trim() || tt.content_en?.trim() || '')
      : (tt.content_en?.trim() || tt.content_bn?.trim() || '');
    return { key: `custom-${i}`, label, content };
  }).filter(t => t.label), [product.custom_tabs, lang]);

  const tabs = [
    { key: 'description', label: labels.description },
    ...customTabs.map(t => ({ key: t.key, label: t.label })),
    { key: 'reviews', label: labels.reviews },
  ];

  const reviewsList = product.reviews?.data ?? [];
  const reviewsSummary = {
    count: product.reviews_summary?.count ?? 0,
    average: product.reviews_summary?.average ?? 0,
    distribution: product.reviews_summary?.distribution,
  };

  return (
    <div className="mt-12 border-t border-gray-200 pt-8">
      {/* Tab triggers — same spacing/typography as the theme's tab strip
          so the bundle page reads as a continuation of the same surface. */}
      <div className="flex gap-6 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-black text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.key === 'reviews' && reviewsSummary.count > 0 && (
              <span className="ml-1 text-gray-400">({reviewsSummary.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab body — `max-w-3xl` keeps line length to a readable ~75ch
          on wide monitors instead of stretching to the full 1280px
          container, matching the visual rhythm of the regular product
          page where description copy reads as a body of prose, not a
          dashboard row. */}
      {activeTab === 'description' && (
        product.description ? (
          <div className="rich-text text-sm text-gray-700 leading-relaxed max-w-3xl" dangerouslySetInnerHTML={{ __html: product.description }} />
        ) : (
          <p className="text-sm text-gray-400">No description provided.</p>
        )
      )}

      {customTabs.map(t => (
        activeTab === t.key && (
          <div key={t.key} className="rich-text text-sm text-gray-700 leading-relaxed max-w-3xl" dangerouslySetInnerHTML={{ __html: t.content || '' }} />
        )
      ))}

      {activeTab === 'reviews' && (
        <ProductReviews
          productId={product.id}
          reviews={reviewsList}
          summary={reviewsSummary}
        />
      )}
    </div>
  );
}
