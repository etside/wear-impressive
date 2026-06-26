'use client';

import { RichText } from '@/components/ui/rich-text';
import { shopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';
import React from 'react';
import Link from 'next/link';
import {
  Search,
  ShoppingCart,
  User,
  ChevronDown,
  ChevronRight,
  Star,
  Truck,
  Store,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Banknote,
  Smartphone,
  Send,
  Plus,
  ChevronUp,
  Menu,
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
const ProductCard: React.FC<ThemeProductCardProps> = ({
  id,
  name,
  price,
  originalPrice,
  badge,
  rating,
  reviews,
  image,
}) => {
  const discount =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  return (
    <Link href={`${shopBase()}/products/${id}`} className="block">
      <div className="border border-gray-200 bg-white rounded-sm hover:shadow-md transition-shadow p-2 flex flex-col h-full">
        <div className="relative aspect-square bg-gray-100 rounded-sm overflow-hidden mb-2">
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Store className="w-10 h-10" />
            </div>
          )}
          {badge && (
            <span className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
              {badge}
            </span>
          )}
          {discount && (
            <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
              -{discount}%
            </span>
          )}
        </div>
        <h3 className="text-sm text-gray-800 line-clamp-2 leading-tight mb-1">{name}</h3>
        <div className="flex items-center gap-0.5 mb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
            />
          ))}
          <span className="text-[10px] text-gray-500 ml-1">({reviews})</span>
        </div>
        <div className="mt-auto">
          <span className="text-base font-bold text-gray-900"><Price value={price} /></span>
          {originalPrice && originalPrice > price && (
            <span className="text-xs text-gray-400 line-through ml-1"><Price value={originalPrice} /></span>
          )}
        </div>
        <button className="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-1.5 rounded-sm flex items-center justify-center gap-1 transition-colors">
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
    </Link>
  );
};

/* ── Hero ────────────────────────────────────────────────────────── */
const Hero: React.FC<ThemeHeroProps> = ({ storeName, tagline, ctaText, ctaLink }) => {
  const quickLinks = ['Electronics', 'Fashion', 'Home', 'Beauty', 'Sports', 'Books'];

  return (
    <section>
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{storeName}</h1>
          <p className="text-amber-100 text-lg mb-6">{tagline}</p>
          <Link
            href={ctaLink}
            className="inline-block bg-white text-amber-600 font-bold px-8 py-3 rounded-sm hover:bg-gray-100 transition-colors"
          >
            {ctaText}
          </Link>
        </div>
      </div>
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex items-center gap-4 px-6 py-3 overflow-x-auto">
          {quickLinks.map((cat) => (
            <Link
              key={cat}
              href={`${shopBase()}/products?category=${cat.toLowerCase()}`}
              className="text-sm text-gray-700 hover:text-amber-600 whitespace-nowrap flex items-center gap-1 transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
              {cat}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ── CategoryCard ────────────────────────────────────────────────── */
const CategoryCard: React.FC<ThemeCategoryCardProps> = ({ name, slug, productCount }) => (
  <Link
    href={`${shopBase()}/products?category=${slug}`}
    className="flex items-center justify-between py-2 px-3 hover:bg-amber-50 rounded-sm group transition-colors"
  >
    <div className="flex items-center gap-2">
      <Store className="w-4 h-4 text-amber-500" />
      <span className="text-sm text-gray-700 group-hover:text-amber-600 transition-colors">{name}</span>
    </div>
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-400">({productCount})</span>
      <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-amber-500 transition-colors" />
    </div>
  </Link>
);

/* ── Header ──────────────────────────────────────────────────────── */
const Header: React.FC<ThemeHeaderProps> = ({ storeName, cartCount, menuItems }) => (
  <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-4">
      {/* Category dropdown */}
      <button className="hidden md:flex items-center gap-1 bg-amber-500 text-white text-sm font-semibold px-4 py-2 rounded-sm hover:bg-amber-600 transition-colors">
        <Menu className="w-4 h-4" />
        Categories
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Logo */}
      <Link href="/" className="font-bold text-lg text-gray-900 shrink-0">
        {storeName}
      </Link>

      {/* Search */}
      <div className="flex-1 max-w-2xl mx-auto">
        <div className="relative">
          <input
            type="text"
            placeholder="Search products, brands and more..."
            className="w-full border border-gray-300 rounded-sm py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
          <button className="absolute right-0 top-0 h-full px-3 bg-amber-500 text-white rounded-r-sm hover:bg-amber-600 transition-colors">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right icons */}
      <div className="flex items-center gap-3">
        <Link href="/account" className="text-gray-600 hover:text-amber-600 transition-colors">
          <User className="w-5 h-5" />
        </Link>
        <Link href="/cart" className="relative text-gray-600 hover:text-amber-600 transition-colors">
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </div>

    {/* Nav links */}
    <div className="max-w-7xl mx-auto px-4 hidden md:flex items-center gap-5 py-1.5 border-t border-gray-100">
      {menuItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-xs text-gray-600 hover:text-amber-600 transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </div>
  </header>
);

/* ── Footer ──────────────────────────────────────────────────────── */
const Footer: React.FC<ThemeFooterProps> = ({ storeName, description, links, socialLinks }) => (
  <footer className="bg-gray-100 border-t border-gray-200">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <h3 className="font-bold text-gray-900 text-sm mb-2">{storeName}</h3>
          <RichText html={description} className="text-xs text-gray-500 leading-relaxed" />
        </div>
        {/* Link columns */}
        {links.map((col) => (
          <div key={col.title}>
            <h4 className="font-semibold text-gray-800 text-xs uppercase tracking-wide mb-2">{col.title}</h4>
            <ul className="space-y-1">
              {col.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-xs text-gray-500 hover:text-amber-600 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Payment badges */}
      <div className="mt-8 pt-4 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} {storeName}. All rights reserved.</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Payment methods:</span>
          <CreditCard className="w-5 h-5 text-gray-400" />
          <Banknote className="w-5 h-5 text-gray-400" />
          <Smartphone className="w-5 h-5 text-gray-400" />
        </div>
      </div>
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
}) => (
  <div className="max-w-6xl mx-auto px-4 py-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Image */}
      <div className="aspect-square bg-gray-100 rounded-sm overflow-hidden">
        {images[0] ? (
          <img src={images[0]} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Store className="w-16 h-16" />
          </div>
        )}
      </div>

      {/* Details */}
      <div>
        <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">{category}</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{name}</h1>
        <p className="text-xs text-gray-500 mb-3">Brand: {brand}</p>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
            />
          ))}
          <span className="text-sm text-gray-500 ml-1">{reviews} reviews</span>
        </div>

        {/* Price */}
        <div className="mb-4">
          <span className="text-3xl font-bold text-gray-900"><Price value={price} /></span>
          {originalPrice && originalPrice > price && (
            <span className="text-lg text-gray-400 line-through ml-2"><Price value={originalPrice} /></span>
          )}
        </div>

        {/* Variants */}
        {variants.map((v) => (
          <div key={v.label} className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">{v.label}</p>
            <div className="flex flex-wrap gap-2">
              {v.values.map((val) => (
                <button
                  key={val}
                  className="border border-gray-300 text-sm px-3 py-1 rounded-sm hover:border-amber-500 hover:text-amber-600 transition-colors"
                
                  onClick={() => onSelectOption?.(v.label, val)}
                  data-selected={selectedOptions[v.label] === val ? 'true' : undefined}
                  style={selectedOptions[v.label] === val ? { backgroundColor: '#111827', color: '#ffffff', borderColor: '#111827' } : undefined}
                >{val}</button>
              ))}
            </div>
          </div>
        ))}

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-sm transition-colors">
            Buy Now
          </button>
          <button className="flex-1 border-2 border-amber-500 text-amber-600 hover:bg-amber-50 font-bold py-3 rounded-sm flex items-center justify-center gap-2 transition-colors" onClick={onAddToCart} disabled={isAddingToCart}>
            <ShoppingCart className="w-4 h-4" />
            {isAddingToCart ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>

        {/* Delivery estimate */}
        <div className="bg-gray-50 border border-gray-200 rounded-sm p-3 mb-4 flex items-center gap-3">
          <Truck className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Estimated Delivery</p>
            <p className="text-xs text-gray-500">3-5 business days</p>
          </div>
        </div>

        {/* Seller info */}
        <div className="bg-gray-50 border border-gray-200 rounded-sm p-3 flex items-center gap-3">
          <Store className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Sold by Marketplace Seller</p>
            <p className="text-xs text-gray-500">98% positive feedback</p>
          </div>
        </div>

        {/* Description */}
        <div className="mt-6">
          <h2 className="font-bold text-gray-900 mb-2">Description</h2>
          <RichText html={description} className="text-sm text-gray-600 leading-relaxed" />
        </div>
      </div>
    </div>
  </div>
);

/* ── Contact ─────────────────────────────────────────────────────── */
const Contact: React.FC<ThemeContactProps> = ({ storeName, email, phone, address }) => {
  const faqs = [
    { q: 'How do I track my order?', a: 'Go to My Orders and click the tracking link on your order.' },
    { q: 'What is the return policy?', a: 'Items can be returned within 7 days of delivery.' },
    { q: 'How do I contact a seller?', a: 'Use the "Message Seller" button on the product page.' },
  ];
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Contact {storeName}</h1>

      {/* Info */}
      <div className="flex flex-wrap gap-6 mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="w-4 h-4 text-amber-500" />
          {email}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="w-4 h-4 text-amber-500" />
          {phone}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-amber-500" />
          {address}
        </div>
      </div>

      {/* Form */}
      <form className="space-y-4 mb-10" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Your Name"
            className="border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
          <input
            type="email"
            placeholder="Your Email"
            className="border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
        <input
          type="text"
          placeholder="Subject"
          className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
        />
        <textarea
          placeholder="Message"
          rows={4}
          className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none"
        />
        <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2 rounded-sm flex items-center gap-2 transition-colors"
        >
          <Send className="w-4 h-4" />
          Send Message
        </button>
      </form>

      {/* FAQ */}
      <h2 className="text-lg font-bold text-gray-900 mb-3">Frequently Asked Questions</h2>
      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <div key={i} className="border border-gray-200 rounded-sm">
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              {faq.q}
              {openFaq === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openFaq === i && (
              <div className="px-4 pb-3 text-sm text-gray-600">{faq.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Register ────────────────────────────────────────────────────── */
registerTheme({
  meta: {
    id: 'bazaar',
    name: 'Bazaar',
    description: 'Dense, marketplace-style layout with Amazon-like feel and orange/amber accents',
    bestFor: 'Multi-vendor marketplaces, large catalogs',
    colors: { primary: '#f59e0b', accent: '#d97706', background: '#ffffff' },
    fonts: { heading: 'system-ui', body: 'system-ui' },
    preview: '/themes/bazaar-preview.png',
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
