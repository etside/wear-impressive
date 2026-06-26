'use client';

import { RichText } from '@/components/ui/rich-text';
import { shopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import {
  Star,
  ShoppingCart,
  Search,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Copy,
  Check as CheckIcon,
  PlayCircle,
  Minus,
  Plus,
  Mail,
  Phone,
  MapPin,
  Send,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Grid3X3,
  Package,
  Truck,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

import {
  registerTheme,
  type ThemeProductCardProps,
  type ThemeHeroProps,
  type ThemeCategoryCardProps,
  type ThemeHeaderProps,
  type ThemeFooterProps,
  type ThemeProductDetailProps,
  type ThemeContactProps,
} from '../index';

/* ── ProductCard ──────────────────────────────────────────────────── */
const ProductCard: React.FC<ThemeProductCardProps> = ({
  id,
  name,
  price,
  originalPrice,
  badge,
  rating,
  reviews,
  image,
  availableSizes = [],
}) => {
  // Discount % shown as a badge if there's a sale price. Falls back to the
  // generic `badge` ("Sale" / "New") when no original price is set.
  const discountPct = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null;
  // Card-level link target. Sized chips below get their own ?size= deep-link.
  const productHref = `${shopBase()}/products/${id}`;
  // Whole-card click handler. We can't wrap the outer element in a <Link>
  // because the size chips inside must be their own <Link>s (different
  // ?size= URLs, and HTML disallows nested anchors). The surface navigates
  // programmatically when the click lands somewhere that's NOT already an
  // anchor / button. Inner deep-links keep working untouched.
  const navigateToProduct = () => {
    if (typeof window !== 'undefined') window.location.href = productHref;
  };
  return (
    <div
      className="group rounded-xl bg-white overflow-hidden transition-shadow duration-300 hover:shadow-lg border border-gray-200 cursor-pointer"
      role="link"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a, button')) return;
        navigateToProduct();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigateToProduct();
        }
      }}
    >
      <Link href={productHref} className="block relative aspect-square bg-gray-100">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-300" />
          </div>
        )}
        {discountPct !== null ? (
          <span className="absolute top-3 left-3 bg-black text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
            -{discountPct}%
          </span>
        ) : badge ? (
          <span className="absolute top-3 left-3 bg-black text-white text-xs font-medium px-2.5 py-1 rounded-full">
            {badge}
          </span>
        ) : null}
      </Link>
      <div className="p-3 sm:p-4 text-center">
        {/* In-stock variant sizes. Each chip deep-links to the product page
            with that size pre-selected via ?size= so the customer lands on
            the variant they tapped without re-picking it. */}
        {availableSizes.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mb-3">
            {availableSizes.map((sz) => (
              <Link
                key={sz}
                href={`${productHref}?size=${encodeURIComponent(sz)}`}
                className="text-[10px] sm:text-[11px] leading-none text-gray-700 border border-gray-200 rounded px-1.5 py-1 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-colors whitespace-nowrap"
              >
                Size/{sz}
              </Link>
            ))}
          </div>
        )}
        <Link href={productHref} className="block">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 hover:underline">{name}</h3>
        </Link>
        {/* Hide the rating row entirely when there are no reviews — gray stars
            with "(0)" looks like a placeholder and clutters the card. */}
        {reviews > 0 && (
          <div className="flex items-center justify-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">({reviews})</span>
          </div>
        )}
        <Link href={productHref} className="flex items-center justify-center gap-2">
          <span className="text-base font-semibold text-[#2596be]">
            <Price value={price} />
          </span>
          {originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              <Price value={originalPrice} />
            </span>
          )}
        </Link>
      </div>
    </div>
  );
};

/* ── Hero ─────────────────────────────────────────────────────────── */
const Hero: React.FC<ThemeHeroProps> = ({ storeName, tagline, ctaText, ctaLink }) => {
  return (
    <section className="w-full bg-gray-50 py-20 md:py-28">
      <div className="max-w-4xl mx-auto text-center px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{storeName}</h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">{tagline}</p>
        <Link
          href={ctaLink}
          className="inline-flex items-center gap-2 bg-black text-white px-8 py-3.5 rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          {ctaText}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
};

/* ── CategoryCard ─────────────────────────────────────────────────── */
const CategoryCard: React.FC<ThemeCategoryCardProps> = ({ name, slug, productCount, image }) => {
  return (
    <Link href={`${shopBase()}/products?category=${slug}`} className="group block">
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center transition-all duration-200 hover:border-gray-300 hover:shadow-sm">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-gray-200 transition-colors">
          {image ? (
            <img src={image} alt={name} className="w-10 h-10 object-contain rounded-full" />
          ) : (
            <Grid3X3 className="w-7 h-7 text-gray-400" />
          )}
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{name}</h3>
        <p className="text-xs text-gray-500">{productCount} products</p>
      </div>
    </Link>
  );
};

/* ── Header ───────────────────────────────────────────────────────── */
const Header: React.FC<ThemeHeaderProps> = ({ storeName, cartCount, menuItems }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-gray-900 shrink-0">
          {storeName}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-4">
          <button aria-label="Search" className="text-gray-600 hover:text-gray-900">
            <Search className="w-5 h-5" />
          </button>
          <Link href="/cart" className="relative text-gray-600 hover:text-gray-900">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            className="md:hidden text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};

/* ── Footer ───────────────────────────────────────────────────────── */
const Footer: React.FC<ThemeFooterProps> = ({ storeName, description, links, socialLinks }) => {
  const socialIconMap: Record<string, React.FC<{ className?: string }>> = {
    facebook: Facebook,
    twitter: Twitter,
    instagram: Instagram,
    youtube: Youtube,
  };

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Store info */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">{storeName}</h3>
            <RichText html={description} className="text-sm text-gray-600 mb-4" />
            <div className="flex items-center gap-3">
              {socialLinks.map((s) => {
                const Icon = socialIconMap[s.platform.toLowerCase()];
                return (
                  <a
                    key={s.platform}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={s.platform}
                  >
                    {Icon ? <Icon className="w-5 h-5" /> : null}
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link columns */}
          {links.slice(0, 2).map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Newsletter</h4>
            <p className="text-sm text-gray-600 mb-3">Get updates on new arrivals and sales.</p>
            <form className="flex" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 text-sm border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <button
                type="submit"
                className="bg-black text-white px-4 py-2 rounded-r-lg hover:bg-gray-800 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

/* ── ProductGallery ───────────────────────────────────────────────── *
 * Mobile  : main image on top, horizontal thumb strip below with arrows.
 * Desktop : vertical thumb strip on the left of the main image.
 *
 * In both layouts the thumb strip is windowed (5 visible at a time) so the
 * main image's height never depends on how many images the product has.
 * Up/down (or left/right on mobile) arrows page the window when there are
 * more than 5 images. Left/right arrows on the main image cycle through
 * every image regardless of which thumbs are currently visible.
 */
const VISIBLE_THUMBS = 5;

function ProductGallery({
  images, selectedImage, setSelectedImage, name,
}: {
  images: string[];
  selectedImage: number;
  setSelectedImage: (i: number) => void;
  name: string;
}) {
  const list = images.length > 0 ? images : [''];
  const total = list.length;

  // Window into thumb strip — moves along with selection so the active
  // thumb is always in view, never further than VISIBLE_THUMBS-1 from the
  // edge of the visible window.
  const [windowStart, setWindowStart] = useState(0);

  useEffect(() => {
    if (selectedImage < windowStart) setWindowStart(selectedImage);
    else if (selectedImage >= windowStart + VISIBLE_THUMBS) {
      setWindowStart(selectedImage - VISIBLE_THUMBS + 1);
    }
  }, [selectedImage, windowStart]);

  const canScrollPrev = windowStart > 0;
  const canScrollNext = windowStart + VISIBLE_THUMBS < total;
  const visible = list.slice(windowStart, windowStart + VISIBLE_THUMBS);

  const goPrev = () => setSelectedImage((selectedImage - 1 + total) % total);
  const goNext = () => setSelectedImage((selectedImage + 1) % total);
  const scrollThumbsBack = () => setWindowStart(Math.max(0, windowStart - 1));
  const scrollThumbsFwd = () => setWindowStart(Math.min(total - VISIBLE_THUMBS, windowStart + 1));
  const showsArrows = total > VISIBLE_THUMBS;

  const renderThumb = (img: string, idxInList: number) => {
    const i = idxInList; // absolute index into list
    const active = selectedImage === i;
    return (
      <button
        key={i}
        onClick={() => setSelectedImage(i)}
        className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
          active ? 'border-black' : 'border-gray-200'
        }`}
        aria-label={`Show image ${i + 1}`}
      >
        {img ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={img} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col-reverse md:flex-row gap-3 md:gap-4">
      {/* Thumbnails — vertical on desktop, horizontal on mobile. */}
      <div className="flex md:flex-col items-center gap-2 md:w-[72px]">
        {showsArrows && (
          <button
            onClick={scrollThumbsBack}
            disabled={!canScrollPrev}
            className="hidden md:flex w-16 h-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Show earlier thumbnails"
          >
            <ChevronUp size={16} />
          </button>
        )}
        {showsArrows && (
          <button
            onClick={scrollThumbsBack}
            disabled={!canScrollPrev}
            className="md:hidden w-7 h-16 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Show earlier thumbnails"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        <div className="flex md:flex-col gap-2 overflow-hidden">
          {visible.map((img, vi) => renderThumb(img, windowStart + vi))}
        </div>

        {showsArrows && (
          <button
            onClick={scrollThumbsFwd}
            disabled={!canScrollNext}
            className="hidden md:flex w-16 h-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Show more thumbnails"
          >
            <ChevronDown size={16} />
          </button>
        )}
        {showsArrows && (
          <button
            onClick={scrollThumbsFwd}
            disabled={!canScrollNext}
            className="md:hidden w-7 h-16 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Show more thumbnails"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Main image — always square, height never depends on thumb count. */}
      <div className="relative flex-1 aspect-square bg-gray-100 rounded-xl overflow-hidden">
        {list[selectedImage] ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={list[selectedImage]} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-300" />
          </div>
        )}

        {total > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-gray-700"
              aria-label="Previous image"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center text-gray-700"
              aria-label="Next image"
            >
              <ChevronRight size={18} />
            </button>
            <span className="absolute bottom-3 right-3 text-[11px] font-medium bg-black/60 text-white px-2 py-0.5 rounded-full">
              {selectedImage + 1} / {total}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ── ProductDetail ────────────────────────────────────────────────── */
const ProductDetail: React.FC<ThemeProductDetailProps> = ({
  name,
  price,
  originalPrice,
  description,
  images,
  rating,
  reviews,
  variants,
  category,
  brand,
  onAddToCart,
  isAddingToCart,
  selectedOptions = {},
  onSelectOption,
  isOutOfStock,
  stockRemaining,
  customTabs = [],
  labels,
  whatsappNumber: _whatsappNumber,    // unused in Wear Impressive — replaced by Watch Video
  whatsappMessage: _whatsappMessage,
  videoUrl,
  onWatchVideoClick,
  watchVideoLabel,
  sizeGuideUrl,
  onSizeGuideClick,
  productUrl,
  productImage,
  reviewsContent,
}) => {
  const [selectedImage, setSelectedImage] = useState(0);
  // Tab id space: 'description' | 'reviews' | 'custom-{idx}' for vendor tabs.
  const [activeTab, setActiveTab] = useState<string>('description');
  const [qty, setQty] = useState(1);
  const [linkCopied, setLinkCopied] = useState(false);

  const descriptionLabel = labels?.description ?? 'Description';
  const reviewsLabel = labels?.reviews ?? 'Reviews';
  const noReviewsText = labels?.noReviews ?? 'No reviews yet. Be the first to write one.';
  const addToCartLabel = labels?.addToCart ?? 'Add to Cart';
  const addingLabel = labels?.adding ?? 'Adding...';
  const watchVideoLabelResolved = watchVideoLabel ?? 'Watch Video';

  // Build the canonical share URL once. We prefer the prop (the page passes a
  // store-handle-aware URL), then fall back to the current location for
  // robustness when the prop isn't wired.
  const resolvedUrl = productUrl ?? (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-gray-900">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`${shopBase()}/products?category=${category}`} className="hover:text-gray-900">{category}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900">{name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image Gallery */}
        <ProductGallery
          images={images}
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
          name={name}
        />

        {/* Info */}
        <div>
          <p className="text-sm text-gray-500 mb-1">{brand}</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{name}</h1>
          {reviews > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">({reviews} reviews)</span>
            </div>
          )}

          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl font-bold text-[#2596be]"><Price value={price} /></span>
            {originalPrice && (
              <span className="text-lg text-gray-400 line-through"><Price value={originalPrice} /></span>
            )}
          </div>

          {/* Variants */}
          {variants.map((v) => (
            <div key={v.label} className="mb-4">
              <span className="text-sm font-medium text-gray-700 mb-2 block">{v.label}</span>
              <div className="flex flex-wrap gap-2">
                {v.values.map((val) => (
                  <button
                    key={val}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm hover:border-black transition-colors"

                  onClick={() => onSelectOption?.(v.label, val)}
                  data-selected={selectedOptions[v.label] === val ? 'true' : undefined}
                  style={selectedOptions[v.label] === val ? { backgroundColor: '#111827', color: '#ffffff', borderColor: '#111827' } : undefined}
                >{val}</button>
                ))}
              </div>
            </div>
          ))}

          {/* Quantity + stock pill side-by-side */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Qty</span>
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2 hover:bg-gray-50">
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-medium">{qty}</span>
              <button
                onClick={() => setQty(typeof stockRemaining === 'number' ? Math.min(stockRemaining, qty + 1) : qty + 1)}
                disabled={typeof stockRemaining === 'number' && qty >= stockRemaining}
                className="p-2 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {typeof stockRemaining === 'number' && (
              stockRemaining <= 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Out of stock
                </span>
              ) : stockRemaining <= 5 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Only {stockRemaining} left
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> {stockRemaining} in stock
                </span>
              )
            )}
          </div>

          {/* Actions — Add to Cart + Watch Video are equal-width siblings,
              capped to ~480px so they don't stretch the full info column.
              Watch Video only renders when the vendor set a video_url. */}
          <div className="flex gap-2 mb-4 max-w-md">
            <button
              className="flex-1 bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              onClick={onAddToCart}
              disabled={isAddingToCart || isOutOfStock}
            >
              <ShoppingCart className="w-5 h-5" />
              {isAddingToCart ? addingLabel : addToCartLabel}
            </button>

            {videoUrl && onWatchVideoClick && (
              <button
                type="button"
                onClick={onWatchVideoClick}
                aria-label={watchVideoLabelResolved}
                className="flex-1 border-2 border-[#2596be] text-[#2596be] py-3 rounded-lg font-medium hover:bg-[#2596be]/5 transition-colors flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-5 h-5" />
                <span>{watchVideoLabelResolved}</span>
              </button>
            )}
          </div>

          {sizeGuideUrl && onSizeGuideClick && (
            <button
              type="button"
              onClick={onSizeGuideClick}
              className="text-xs text-[#2596be] hover:underline mt-1 text-left"
            >
              Size Guide
            </button>
          )}

        </div>
      </div>

      {/* Tabs */}
      <div className="mt-12 border-t border-gray-200 pt-8">
        <div className="flex gap-6 border-b border-gray-200 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('description')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'description' ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {descriptionLabel}
          </button>
          {customTabs.map((tab, idx) => {
            const id = `custom-${idx}`;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === id ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'reviews' ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {reviewsLabel} ({reviews})
          </button>
        </div>

        {activeTab === 'description' && (
          <>
            <RichText html={description} className="text-sm text-gray-700 leading-relaxed" />
            {/* Share row — sits at the very end of the description so customers
                hit it after they've read the product details. */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-3">
              <span className="text-sm text-gray-500">{labels?.shareThis ?? 'Share this:'}</span>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(resolvedUrl)}&quote=${encodeURIComponent(name)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={labels?.shareOnFacebook ?? 'Share on Facebook'}
                className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(resolvedUrl); } catch { /* ignore */ }
                  window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
                }}
                aria-label={labels?.shareOnInstagram ?? 'Share on Instagram'}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-yellow-400 text-white flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Instagram className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resolvedUrl);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 1500);
                  } catch { /* ignore */ }
                }}
                aria-label={labels?.copyLink ?? 'Copy link'}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                {linkCopied ? <CheckIcon className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
              {linkCopied && (
                <span className="text-xs text-green-600">{labels?.linkCopied ?? 'Link copied!'}</span>
              )}
            </div>
          </>
        )}
        {activeTab.startsWith('custom-') && (() => {
          const idx = Number(activeTab.slice('custom-'.length));
          const tab = customTabs[idx];
          if (!tab) return null;
          return tab.content
            ? <RichText html={tab.content} className="text-sm text-gray-700 leading-relaxed" />
            : <p className="text-sm text-gray-400">This tab has no content yet.</p>;
        })()}
        {activeTab === 'reviews' && (
          reviewsContent
            ? <div>{reviewsContent}</div>
            : <div className="text-sm text-gray-500"><p>{noReviewsText}</p></div>
        )}
      </div>
    </div>
  );
};

/* ── Contact ──────────────────────────────────────────────────────── */
const Contact: React.FC<ThemeContactProps> = ({ storeName, email, phone, address }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Get in Touch</h1>
      <p className="text-gray-600 text-center mb-12">We would love to hear from you.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Form */}
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea rows={5} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none" />
          </div>
          <button
            type="submit"
            className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            Send Message
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Info Cards */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Email</h3>
              <p className="text-sm text-gray-600">{email}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Phone</h3>
              <p className="text-sm text-gray-600">{phone}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Address</h3>
              <p className="text-sm text-gray-600">{address}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Store</h3>
              <p className="text-sm text-gray-600">{storeName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Register Theme ───────────────────────────────────────────────── */
registerTheme({
  meta: {
    id: 'classic',
    name: 'Classic',
    description: 'A clean, professional theme with a white background, standard grid layout, and timeless design.',
    bestFor: 'General stores, multi-category shops, everyday retail',
    colors: { primary: '#111111', accent: '#000000', background: '#FFFFFF' },
    fonts: { heading: 'system-ui, sans-serif', body: 'system-ui, sans-serif' },
    preview: '',
  },
  components: {
    ProductCard,
    Hero,
    CategoryCard,
    Header,
    Footer,
    ProductDetail,
    Contact,
  },
});
