'use client';

import { RichText } from '@/components/ui/rich-text';
import { shopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';
import Link from 'next/link';
import React, { useState } from 'react';
import {
  Star,
  ShoppingCart,
  Search,
  Menu,
  X,
  ChevronRight,
  Heart,
  Share2,
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
  Cpu,
  Package,
  Truck,
  ShieldCheck,
  Zap,
  Monitor,
  ArrowRight,
  User,
  ChevronDown,
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
  category,
}) => {
  return (
    <Link href={`${shopBase()}/products/${id}`} className="group block">
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white transition-shadow duration-200 hover:shadow-md">
        {/* Dark header strip */}
        <div className="bg-gray-900 px-3 py-2 flex items-center justify-between">
          {badge ? (
            <span className="bg-blue-600 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded">
              {badge}
            </span>
          ) : (
            <span />
          )}
          {category && (
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{category}</span>
          )}
        </div>

        {/* Image */}
        <div className="relative aspect-square bg-gray-50">
          {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Monitor className="w-12 h-12 text-gray-200" />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{name}</h3>
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < Math.round(rating) ? 'fill-blue-500 text-blue-500' : 'text-gray-200'}`}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">{reviews}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-gray-900 font-mono">
                <Price value={price} />
              </span>
              {originalPrice && (
                <span className="text-xs text-gray-400 line-through font-mono">
                  <Price value={originalPrice} />
                </span>
              )}
            </div>
          </div>
          <button className="mt-3 w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Add to Cart
          </button>
        </div>
      </div>
    </Link>
  );
};

/* ── Hero ─────────────────────────────────────────────────────────── */
const Hero: React.FC<ThemeHeroProps> = ({ storeName, tagline, ctaText, ctaLink }) => {
  return (
    <section className="relative w-full bg-gradient-to-br from-gray-900 via-gray-900 to-blue-900 py-24 md:py-32 overflow-hidden">
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative z-10 max-w-5xl mx-auto text-center px-4">
        <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-medium tracking-wider uppercase px-4 py-1.5 rounded-full mb-6">
          <Zap className="w-3.5 h-3.5" />
          {storeName}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
          Next-Gen Tech,{' '}
          <span className="text-blue-400">Delivered</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto">{tagline}</p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href={ctaLink}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {ctaText}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 border border-gray-600 text-gray-300 px-8 py-3.5 rounded-lg font-medium hover:border-gray-400 hover:text-white transition-colors"
          >
            Browse Categories
          </Link>
        </div>
      </div>
    </section>
  );
};

/* ── CategoryCard ─────────────────────────────────────────────────── */
const CategoryCard: React.FC<ThemeCategoryCardProps> = ({ name, slug, productCount, image }) => {
  return (
    <Link href={`${shopBase()}/products?category=${slug}`} className="group block">
      <div className="bg-gray-900 rounded-lg p-5 border-l-4 border-blue-600 hover:border-blue-400 transition-colors">
        <div className="flex items-center gap-4">
          {image ? (
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
              <img src={image} alt={name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
              <Cpu className="w-6 h-6 text-blue-400" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{name}</h3>
            <p className="text-xs text-gray-500">{productCount} products</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600 ml-auto group-hover:text-blue-400 transition-colors" />
        </div>
      </div>
    </Link>
  );
};

/* ── Header ───────────────────────────────────────────────────────── */
const Header: React.FC<ThemeHeaderProps> = ({ storeName, cartCount, menuItems }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="text-lg font-bold text-white shrink-0 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-500" />
          {storeName}
        </Link>

        {/* Search bar */}
        <div className="hidden md:flex flex-1 max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full bg-gray-800 border border-gray-700 text-sm text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-5">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-4 ml-auto lg:ml-0">
          <button aria-label="Search" className="md:hidden text-gray-400 hover:text-white">
            <Search className="w-5 h-5" />
          </button>
          <button aria-label="Account" className="hidden md:block text-gray-400 hover:text-white">
            <User className="w-5 h-5" />
          </button>
          <Link href="/cart" className="relative text-gray-400 hover:text-white">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
          <button
            className="lg:hidden text-gray-400"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="lg:hidden border-t border-gray-800 bg-gray-900 px-4 py-3 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block py-2 text-sm text-gray-400 hover:text-white"
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
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-white">{storeName}</h3>
            </div>
            <RichText html={description} className="text-sm text-gray-500 mb-4" />
            <div className="flex items-center gap-3">
              {socialLinks.map((s) => {
                const Icon = socialIconMap[s.platform.toLowerCase()];
                return (
                  <a
                    key={s.platform}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-400 transition-colors"
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
              <h4 className="text-sm font-semibold text-white mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-gray-500 hover:text-blue-400 transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Stay Updated</h4>
            <p className="text-sm text-gray-500 mb-3">Latest products and tech deals.</p>
            <form className="flex" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 bg-gray-800 text-sm text-white border border-gray-700 rounded-l-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 text-center text-xs text-gray-600">
          &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

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
}) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);

  const specs = [
    { label: 'Brand', value: brand },
    { label: 'Category', value: category },
    { label: 'Rating', value: `${rating}/5 (${reviews} reviews)` },
    ...variants.map((v) => ({ label: v.label, value: v.values.join(', ') })),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-blue-500">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`${shopBase()}/products?category=${category}`} className="hover:text-blue-500">{category}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-900">{name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Dark sidebar - specs */}
        <aside className="lg:col-span-3 bg-gray-900 rounded-lg p-5 order-2 lg:order-1 h-fit">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            Specifications
          </h3>
          <table className="w-full text-sm">
            <tbody>
              {specs.map((s, i) => (
                <tr key={s.label} className={i < specs.length - 1 ? 'border-b border-gray-800' : ''}>
                  <td className="py-2.5 text-gray-500 pr-3">{s.label}</td>
                  <td className="py-2.5 text-gray-300 text-right">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

        </aside>

        {/* Main content area */}
        <div className="lg:col-span-9 order-1 lg:order-2">
          {/* Image */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
            <div className="aspect-[16/10] bg-gray-50">
              {images[selectedImage] ? (
                <img src={images[selectedImage]} alt={name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Monitor className="w-20 h-20 text-gray-200" />
                </div>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 mb-6">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === i ? 'border-blue-600' : 'border-gray-200'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">{brand}</p>
                <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
              </div>
              <div className="flex gap-2">
                <button className="border border-gray-200 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <Heart className="w-5 h-5 text-gray-400" />
                </button>
                <button className="border border-gray-200 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <Share2 className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(rating) ? 'fill-blue-500 text-blue-500' : 'text-gray-200'}`}
                />
              ))}
              <span className="text-sm text-gray-500 ml-2">{reviews} reviews</span>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold text-gray-900 font-mono"><Price value={price} /></span>
              {originalPrice && (
                <span className="text-lg text-gray-400 line-through font-mono"><Price value={originalPrice} /></span>
              )}
              {originalPrice && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded">
                  SAVE <Price value={originalPrice - price} />
                </span>
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
                      className="border border-gray-300 rounded-lg px-4 py-2 text-sm hover:border-blue-500 hover:text-blue-600 transition-colors"
                    
                  onClick={() => onSelectOption?.(v.label, val)}
                  data-selected={selectedOptions[v.label] === val ? 'true' : undefined}
                  style={selectedOptions[v.label] === val ? { backgroundColor: '#111827', color: '#ffffff', borderColor: '#111827' } : undefined}
                >{val}</button>
                  ))}
                </div>
              </div>
            ))}

            {/* Add to cart */}
            <div className="flex items-center gap-3 mt-6">
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2.5 hover:bg-gray-50">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-medium font-mono">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="p-2.5 hover:bg-gray-50">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2" onClick={onAddToCart} disabled={isAddingToCart}>
                <ShoppingCart className="w-5 h-5" />
                {isAddingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>

            {/* Description */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Description</h3>
              <RichText html={description} className="text-sm text-gray-600 leading-relaxed" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Contact ──────────────────────────────────────────────────────── */
const Contact: React.FC<ThemeContactProps> = ({ storeName, email, phone, address }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Dark header */}
      <div className="bg-gray-900 rounded-t-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Contact Us</h1>
        <p className="text-gray-400">Have a question? Our team is here to help.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-gray-200 border-t-0 rounded-b-lg overflow-hidden">
        {/* Form */}
        <div className="md:col-span-2 p-8 bg-white">
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea rows={5} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none" />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              Send Message
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Info sidebar */}
        <div className="bg-gray-50 p-8 space-y-6 border-l border-gray-200">
          <div>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-3">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Email</h3>
            <p className="text-sm text-gray-600">{email}</p>
          </div>
          <div>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-3">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Phone</h3>
            <p className="text-sm text-gray-600">{phone}</p>
          </div>
          <div>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Address</h3>
            <p className="text-sm text-gray-600">{address}</p>
          </div>
          <div>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Store</h3>
            <p className="text-sm text-gray-600">{storeName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Register Theme ───────────────────────────────────────────────── */
registerTheme({
  meta: {
    id: 'techhub',
    name: 'TechHub',
    description: 'A bold, dark-accented theme with blue highlights and sharp design, built for electronics and tech stores.',
    bestFor: 'Electronics, gadgets, computer hardware, tech accessories',
    colors: { primary: '#111827', accent: '#2563EB', background: '#FFFFFF' },
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
