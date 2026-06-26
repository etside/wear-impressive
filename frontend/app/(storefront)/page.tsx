'use client';

import { useShopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n/context";
import { useTheme } from "@/lib/themes";
import { ArrowRight, Truck, RotateCcw, ShieldCheck, HeadphonesIcon } from "lucide-react";
import {
  publicProductsApi,
  publicCategoriesApi,
  storeInfoApi,
} from "@/lib/api/services/storefront";
import type { Product } from "@/lib/api/types";
import { HomeSectionRenderer } from "@/components/store/home-section-renderer";
import type { HomeSection } from "@/lib/home-sections";
import { getAvailableSizes } from "@/lib/product-variants";

const trustIcons = [
  <Truck size={20} key="truck" />,
  <RotateCcw size={20} key="return" />,
  <ShieldCheck size={20} key="shield" />,
  <HeadphonesIcon size={20} key="support" />,
];

/* ── Helpers ──────────────────────────────────────────────────────── */
function getDiscountedPrice(p: Product): number {
  const price = parseFloat(p.price) || 0;
  if (!p.discount || !p.discount_type) return price;
  const d = parseFloat(p.discount) || 0;
  return p.discount_type === 'percent' ? price - (price * d) / 100 : price - d;
}

function getOriginalPrice(p: Product): number | null {
  if (!p.discount || !p.discount_type) return null;
  const price = parseFloat(p.price) || 0;
  return price;
}

function productBadge(p: Product): string | null {
  if (p.discount) return 'Sale';
  const publishedAt = p.published_at ? new Date(p.published_at).getTime() : 0;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (publishedAt > thirtyDaysAgo) return 'New';
  return null;
}

export default function StorefrontHome() {
  const __sb = useShopBase();
  // No mounted guard needed here — StoreLayoutGate in layout.tsx already
  // suppresses the entire page until store-info-full resolves.

  const { t } = useLang();
  const s = t.store;
  const { Hero, ProductCard, CategoryCard } = useTheme();

  const storeQuery = useQuery({
    queryKey: ['storefront', 'store-info'],
    queryFn: () => storeInfoApi.show(),
  });

  // Vendor-saved homepage sections come from the same /store/info payload
  // (key: home.sections in store_settings). When the vendor hasn't built a
  // homepage yet we fall back to the static layout below.
  const fullStoreInfoQuery = useQuery({
    queryKey: ['storefront', 'store-info-full'],
    queryFn: () => storeInfoApi.full(),
    staleTime: 60_000,
  });
  const homeSections = (() => {
    const raw = fullStoreInfoQuery.data?.settings?.['home.sections'];
    if (!raw) return [] as HomeSection[];
    try {
      const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? (parsed as HomeSection[]) : [];
    } catch {
      return [] as HomeSection[];
    }
  })();

  const categoriesQuery = useQuery({
    queryKey: ['storefront', 'categories', { active: true }],
    queryFn: () => publicCategoriesApi.list({ is_active: true }),
  });

  const featuredQuery = useQuery({
    queryKey: ['storefront', 'products', { featured: true, per_page: 8 }],
    queryFn: () => publicProductsApi.list({ featured: true, per_page: 8 }),
  });

  const store = storeQuery.data;
  const categories = categoriesQuery.data ?? [];
  const products = featuredQuery.data?.data ?? [];
  const storeName = store?.name ?? 'Wear Impressive';

  // If the vendor saved any visible sections, render those exclusively. Else
  // fall back to the legacy static homepage so a brand-new store still has
  // a presentable landing page.
  const visibleSections = homeSections.filter((sec) => sec.visible);
  if (visibleSections.length > 0) {
    return (
      <div>
        <HomeSectionRenderer sections={visibleSections} />
      </div>
    );
  }

  return (
    <div>
      {/* Theme Hero */}
      <Hero
        storeName={storeName}
        tagline={store?.description || "Bangladesh's trusted fashion brand for premium denim cargos and rib-cotton tees."}
        ctaText={t.common.shopNow}
        ctaLink={`${__sb}/products`}
      />

      {/* Theme Categories */}
      <section className="section-md">
        <div className="container-app">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{s.categories.title}</h2>
          {categoriesQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {categories.slice(0, 6).map(cat => (
                <CategoryCard
                  key={cat.slug}
                  name={cat.name}
                  slug={cat.slug}
                  productCount={cat.products_count ?? cat.product_count ?? 0}
                  image={cat.image}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No categories yet.</p>
          )}
        </div>
      </section>

      {/* Flash Sale */}
      <section className="bg-black text-white section-sm">
        <div className="container-app">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{s.flashSale.label}</p>
              <h2 className="text-xl font-semibold">{s.flashSale.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">{s.flashSale.endsIn}</span>
              {["02", "14", "38"].map((time, i) => (
                <span key={i}>
                  <span className="bg-white text-black px-2 py-1 rounded-lg text-sm font-bold">{time}</span>
                  {i < 2 && <span className="text-gray-400 mx-1">:</span>}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {products.filter(p => !!p.discount).slice(0, 4).map(p => {
              const finalPrice = getDiscountedPrice(p);
              const original = getOriginalPrice(p);
              return (
                <Link key={p.id} href={`${__sb}/products/${p.slug}`} className="group">
                  <div className="aspect-square bg-gray-800 rounded-xl overflow-hidden mb-3">
                    {p.featured_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.featured_image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                        Product Image
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold"><Price value={finalPrice} /></span>
                    {original && <span className="text-xs text-gray-500 line-through"><Price value={original} /></span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* New Arrivals — using theme ProductCard */}
      <section className="section-md">
        <div className="container-app">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-gray-900">{s.newArrivals}</h2>
            <Link href={`${__sb}/products`} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
              {t.common.viewAll} <ArrowRight size={14} />
            </Link>
          </div>
          {featuredQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map(p => (
                <ProductCard
                  key={p.id}
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
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No featured products yet.</p>
          )}
        </div>
      </section>

      {/* Trust badges */}
      <section className="bg-gray-50 border-t border-b border-gray-200 section-xs">
        <div className="container-app">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {s.trust.map((item: { title: string; desc: string }, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-700 shrink-0">
                  {trustIcons[i]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
