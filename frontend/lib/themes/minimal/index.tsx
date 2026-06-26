'use client';

import { RichText } from '@/components/ui/rich-text';
import { shopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';
import React from 'react';
import Link from 'next/link';
import {
  Menu,
  ShoppingBag,
  ArrowRight,
  Send,
  Mail,
  Phone,
  MapPin,
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

/* ── ProductCard ─────────────────────────────────────────────────── */
const ProductCard: React.FC<ThemeProductCardProps> = ({ id, name, price, image }) => (
  <Link href={`${shopBase()}/products/${id}`} className="block group p-4">
    <div className="aspect-[3/4] bg-gray-50 mb-4 overflow-hidden">
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-200">
          <ShoppingBag className="w-10 h-10" />
        </div>
      )}
    </div>
    <h3 className="text-sm text-gray-800 group-hover:underline transition-all leading-snug mb-1">{name}</h3>
    <p className="text-sm text-gray-500"><Price value={price} /></p>
  </Link>
);

/* ── Hero ────────────────────────────────────────────────────────── */
const Hero: React.FC<ThemeHeroProps> = ({ storeName, tagline, ctaText, ctaLink }) => (
  <section className="bg-white py-24 px-6">
    <div className="max-w-2xl mx-auto text-center">
      <h1 className="text-4xl md:text-5xl font-light text-gray-900 tracking-tight mb-4">{storeName}</h1>
      <p className="text-lg text-gray-400 font-light mb-8">{tagline}</p>
      <Link
        href={ctaLink}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border-b border-gray-300 pb-0.5 transition-colors"
      >
        {ctaText}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  </section>
);

/* ── CategoryCard ────────────────────────────────────────────────── */
const CategoryCard: React.FC<ThemeCategoryCardProps> = ({ name, slug, productCount }) => (
  <Link
    href={`${shopBase()}/products?category=${slug}`}
    className="block py-3 border-b border-gray-100 hover:border-gray-400 transition-colors"
  >
    <span className="text-sm text-gray-700">{name}</span>
    <span className="text-xs text-gray-400 ml-2">{productCount}</span>
  </Link>
);

/* ── Header ──────────────────────────────────────────────────────── */
const Header: React.FC<ThemeHeaderProps> = ({ storeName, cartCount }) => (
  <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <button className="text-gray-600 hover:text-gray-900 transition-colors">
        <Menu className="w-5 h-5" />
      </button>
      <Link href="/" className="text-lg font-light tracking-widest text-gray-900 uppercase">
        {storeName}
      </Link>
      <Link href="/cart" className="relative text-gray-600 hover:text-gray-900 transition-colors">
        <ShoppingBag className="w-5 h-5" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1.5 text-[10px] font-medium text-gray-900">
            {cartCount}
          </span>
        )}
      </Link>
    </div>
  </header>
);

/* ── Footer ──────────────────────────────────────────────────────── */
const Footer: React.FC<ThemeFooterProps> = ({ storeName }) => (
  <footer className="border-t border-gray-200 bg-white">
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-gray-400">
      <span>&copy; {new Date().getFullYear()} {storeName}</span>
      <span className="hidden sm:inline">|</span>
      <Link href="/about" className="hover:text-gray-600 transition-colors">About</Link>
      <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
      <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
    </div>
  </footer>
);

/* ── ProductDetail ───────────────────────────────────────────────── */
const ProductDetail: React.FC<ThemeProductDetailProps> = ({
  name,
  price,
  originalPrice,
  description,
  images,
  variants,
  category,
  brand,
  onAddToCart,
  isAddingToCart,
  selectedOptions = {},
  onSelectOption,
  isOutOfStock,
}) => (
  <div className="max-w-2xl mx-auto px-4 py-12">
    {/* Image */}
    <div className="aspect-[3/4] bg-gray-50 mb-8 overflow-hidden">
      {images[0] ? (
        <img src={images[0]} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-200">
          <ShoppingBag className="w-16 h-16" />
        </div>
      )}
    </div>

    {/* Info */}
    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">{category} / {brand}</p>
    <h1 className="text-2xl font-light text-gray-900 mb-2">{name}</h1>
    <div className="mb-6">
      <span className="text-lg text-gray-900"><Price value={price} /></span>
      {originalPrice && originalPrice > price && (
        <span className="text-sm text-gray-400 line-through ml-2"><Price value={originalPrice} /></span>
      )}
    </div>

    {/* Variants */}
    {variants.map((v) => (
      <div key={v.label} className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{v.label}</p>
        <div className="flex flex-wrap gap-2">
          {v.values.map((val) => (
            <button
              key={val}
              className="border border-gray-200 text-sm px-4 py-1.5 text-gray-700 hover:border-gray-900 transition-colors"
            
                  onClick={() => onSelectOption?.(v.label, val)}
                  data-selected={selectedOptions[v.label] === val ? 'true' : undefined}
                  style={selectedOptions[v.label] === val ? { backgroundColor: '#111827', color: '#ffffff', borderColor: '#111827' } : undefined}
                >{val}</button>
          ))}
        </div>
      </div>
    ))}

    {/* Add to Cart */}
    <button className="w-full border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white text-sm font-medium py-3 transition-colors mb-8" onClick={onAddToCart} disabled={isAddingToCart}>
      {isAddingToCart ? 'Adding...' : 'Add to Cart'}
    </button>

    {/* Description */}
    <div className="border-t border-gray-100 pt-6">
      <RichText html={description} className="text-sm text-gray-600 leading-relaxed" />
    </div>
  </div>
);

/* ── Contact ─────────────────────────────────────────────────────── */
const Contact: React.FC<ThemeContactProps> = ({ email, phone, address }) => (
  <div className="max-w-md mx-auto px-4 py-16">
    <h1 className="text-2xl font-light text-gray-900 text-center mb-8">Get in Touch</h1>

    <div className="flex flex-col items-center gap-2 mb-10 text-sm text-gray-400">
      <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{email}</span>
      <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{phone}</span>
      <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{address}</span>
    </div>

    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <input
        type="text"
        placeholder="Name"
        className="w-full border-b border-gray-200 bg-transparent pb-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
      />
      <input
        type="email"
        placeholder="Email"
        className="w-full border-b border-gray-200 bg-transparent pb-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
      />
      <textarea
        placeholder="Message"
        rows={4}
        className="w-full border-b border-gray-200 bg-transparent pb-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-900 resize-none transition-colors"
      />
      <button
        type="submit"
        className="w-full border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white text-sm py-2.5 flex items-center justify-center gap-2 transition-colors"
      >
        <Send className="w-3.5 h-3.5" />
        Send
      </button>
    </form>
  </div>
);

/* ── Register ────────────────────────────────────────────────────── */
registerTheme({
  meta: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Ultra-clean, whitespace-heavy design with thin borders and no visual noise',
    bestFor: 'Boutiques, curated collections, lifestyle brands',
    colors: { primary: '#111827', accent: '#6b7280', background: '#ffffff' },
    fonts: { heading: 'system-ui', body: 'system-ui' },
    preview: '/themes/minimal-preview.png',
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
