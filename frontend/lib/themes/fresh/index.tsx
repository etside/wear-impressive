'use client';

import { RichText } from '@/components/ui/rich-text';
import { shopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';
import React from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Plus,
  Star,
  Leaf,
  Clock,
  Phone,
  Mail,
  MapPin,
  Send,
  Menu,
  User,
  ChevronRight,
  ShieldCheck,
  Scale,
  Droplets,
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
  image,
  category,
}) => (
  <Link href={`${shopBase()}/products/${id}`} className="block group">
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-emerald-50 overflow-hidden">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-emerald-200">
            <Leaf className="w-12 h-12" />
          </div>
        )}
        {badge && (
          <span className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {category && (
          <span className="absolute bottom-3 left-3 bg-white/90 text-gray-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
            {category}
          </span>
        )}
        <button className="absolute bottom-3 right-3 w-9 h-9 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-800 leading-snug mb-1 group-hover:text-emerald-700 transition-colors">
          {name}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold text-gray-900"><Price value={price} /></span>
          {originalPrice && originalPrice > price && (
            <span className="text-xs text-gray-400 line-through"><Price value={originalPrice} /></span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">per kg</p>
      </div>
    </div>
  </Link>
);

/* ── Hero ────────────────────────────────────────────────────────── */
const Hero: React.FC<ThemeHeroProps> = ({ storeName, tagline, ctaText, ctaLink }) => (
  <section className="relative">
    <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 py-16 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Leaf className="w-6 h-6 text-emerald-200" />
          <span className="text-emerald-200 text-sm font-medium uppercase tracking-widest">Fresh & Organic</span>
          <Leaf className="w-6 h-6 text-emerald-200" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">{storeName}</h1>
        <p className="text-emerald-100 text-lg mb-8">{tagline}</p>
        <Link
          href={ctaLink}
          className="inline-block bg-white text-emerald-600 font-bold px-8 py-3 rounded-full hover:bg-emerald-50 transition-colors shadow-lg"
        >
          {ctaText}
        </Link>
      </div>
    </div>
    {/* Wave divider */}
    <div className="bg-white">
      <svg viewBox="0 0 1440 60" fill="none" className="w-full -mt-px" preserveAspectRatio="none">
        <path
          d="M0 60V20C240 50 480 0 720 20C960 40 1200 0 1440 20V60H0Z"
          fill="#059669"
        />
      </svg>
    </div>
  </section>
);

/* ── CategoryCard ────────────────────────────────────────────────── */
const CategoryCard: React.FC<ThemeCategoryCardProps> = ({ name, slug, productCount, image }) => (
  <Link href={`${shopBase()}/products?category=${slug}`} className="block group text-center">
    <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border-2 border-transparent group-hover:border-emerald-400 overflow-hidden mb-2 transition-colors">
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-emerald-300">
          <Leaf className="w-6 h-6" />
        </div>
      )}
    </div>
    <p className="text-sm font-medium text-gray-700 group-hover:text-emerald-600 transition-colors">{name}</p>
    <p className="text-[10px] text-gray-400">{productCount} items</p>
  </Link>
);

/* ── Header ──────────────────────────────────────────────────────── */
const Header: React.FC<ThemeHeaderProps> = ({ storeName, cartCount, menuItems }) => (
  <header className="bg-white sticky top-0 z-50 shadow-sm">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button className="md:hidden text-gray-600">
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-500" />
          <span className="font-bold text-gray-900 text-lg">{storeName}</span>
        </Link>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <Link href="/account" className="text-gray-500 hover:text-emerald-600 transition-colors">
          <User className="w-5 h-5" />
        </Link>
        <Link href="/cart" className="relative text-gray-500 hover:text-emerald-600 transition-colors">
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </div>

    {/* Category pills */}
    <div className="max-w-6xl mx-auto px-4 pb-2 hidden md:flex items-center gap-2 overflow-x-auto">
      {menuItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-xs text-gray-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-full whitespace-nowrap transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </div>
  </header>
);

/* ── Footer ──────────────────────────────────────────────────────── */
const Footer: React.FC<ThemeFooterProps> = ({ storeName, description, links, socialLinks }) => (
  <footer className="relative bg-white">
    {/* Wave top */}
    <svg viewBox="0 0 1440 50" fill="none" className="w-full" preserveAspectRatio="none">
      <path
        d="M0 0V30C240 10 480 50 720 30C960 10 1200 50 1440 30V0H0Z"
        fill="white"
      />
      <path
        d="M0 50V30C240 10 480 50 720 30C960 10 1200 50 1440 30V50H0Z"
        fill="#ecfdf5"
      />
    </svg>

    <div className="bg-emerald-50 pb-8 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Leaf className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-gray-900">{storeName}</h3>
          </div>
          <RichText html={description} className="text-sm text-gray-500 leading-relaxed" />
        </div>

        {/* Link columns */}
        {links.slice(0, 2).map((col) => (
          <div key={col.title}>
            <h4 className="font-semibold text-gray-800 text-sm mb-3">{col.title}</h4>
            <ul className="space-y-2">
              {col.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1 transition-colors"
                  >
                    <ChevronRight className="w-3 h-3" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto mt-6 pt-4 border-t border-emerald-100 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} {storeName}. Fresh produce delivered to your door.
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
  <div className="max-w-5xl mx-auto px-4 py-8">
    {/* Image gallery */}
    <div className="grid grid-cols-4 gap-3 mb-8">
      <div className="col-span-4 aspect-[4/3] rounded-2xl bg-emerald-50 overflow-hidden">
        {images[0] ? (
          <img src={images[0]} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-emerald-200">
            <Leaf className="w-16 h-16" />
          </div>
        )}
      </div>
      {images.slice(1, 5).map((img, i) => (
        <div key={i} className="aspect-square rounded-xl bg-emerald-50 overflow-hidden">
          <img src={img} alt={`${name} ${i + 2}`} className="w-full h-full object-cover" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Main info */}
      <div className="md:col-span-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{category}</span>
          <span className="text-xs text-gray-400">{brand}</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{name}</h1>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < Math.round(rating) ? 'fill-emerald-400 text-emerald-400' : 'text-gray-300'}`}
            />
          ))}
          <span className="text-sm text-gray-500 ml-1">{reviews} reviews</span>
        </div>

        {/* Price */}
        <div className="mb-4">
          <span className="text-3xl font-bold text-emerald-600"><Price value={price} /></span>
          {originalPrice && originalPrice > price && (
            <span className="text-lg text-gray-400 line-through ml-2"><Price value={originalPrice} /></span>
          )}
          <span className="text-sm text-gray-400 ml-1">/ kg</span>
        </div>

        {/* Variants */}
        {variants.map((v) => (
          <div key={v.label} className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">{v.label}</p>
            <div className="flex flex-wrap gap-2">
              {v.values.map((val) => (
                <button
                  key={val}
                  className="border border-emerald-200 text-sm px-3 py-1 rounded-full text-gray-700 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                
                  onClick={() => onSelectOption?.(v.label, val)}
                  data-selected={selectedOptions[v.label] === val ? 'true' : undefined}
                  style={selectedOptions[v.label] === val ? { backgroundColor: '#111827', color: '#ffffff', borderColor: '#111827' } : undefined}
                >{val}</button>
              ))}
            </div>
          </div>
        ))}

        {/* Add to Cart */}
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 shadow-lg transition-colors mb-6" onClick={onAddToCart} disabled={isAddingToCart}>
          <ShoppingCart className="w-5 h-5" />
          {isAddingToCart ? 'Adding...' : 'Add to Cart'}
        </button>

        {/* Description */}
        <div className="border-t border-gray-100 pt-6">
          <h2 className="font-bold text-gray-900 mb-2">About this product</h2>
          <RichText html={description} className="text-sm text-gray-600 leading-relaxed" />
        </div>
      </div>

      {/* Sidebar info cards */}
      <div className="space-y-4">
        {/* Freshness badge */}
        <div className="bg-emerald-50 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Freshness Guaranteed</p>
            <p className="text-xs text-gray-500">Sourced and packed within 24 hours</p>
          </div>
        </div>

        {/* Weight/Nutrition info */}
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-500" />
            Product Info
          </h3>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Weight</span>
              <span className="font-medium">1 kg</span>
            </div>
            <div className="flex justify-between">
              <span>Storage</span>
              <span className="font-medium">Refrigerate</span>
            </div>
            <div className="flex justify-between">
              <span>Shelf Life</span>
              <span className="font-medium">5-7 days</span>
            </div>
          </div>
        </div>

        {/* Organic badge */}
        <div className="bg-emerald-50 rounded-2xl p-4 flex items-start gap-3">
          <Droplets className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-800">100% Organic</p>
            <p className="text-xs text-gray-500">No pesticides or chemicals used</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ── Contact ─────────────────────────────────────────────────────── */
const Contact: React.FC<ThemeContactProps> = ({ storeName, email, phone, address }) => (
  <div className="max-w-4xl mx-auto px-4 py-12">
    <div className="text-center mb-10">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Leaf className="w-5 h-5 text-emerald-500" />
        <h1 className="text-2xl font-bold text-gray-900">Contact {storeName}</h1>
        <Leaf className="w-5 h-5 text-emerald-500" />
      </div>
      <p className="text-sm text-gray-500">We would love to hear from you</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* Form */}
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <input
          type="text"
          placeholder="Your Name"
          className="w-full border border-emerald-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
        />
        <input
          type="email"
          placeholder="Your Email"
          className="w-full border border-emerald-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
        />
        <input
          type="text"
          placeholder="Subject"
          className="w-full border border-emerald-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
        />
        <textarea
          placeholder="Your Message"
          rows={5}
          className="w-full border border-emerald-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none transition-colors"
        />
        <button
          type="submit"
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-full flex items-center gap-2 shadow-md transition-colors"
        >
          <Send className="w-4 h-4" />
          Send Message
        </button>
      </form>

      {/* Info cards */}
      <div className="space-y-4">
        <div className="bg-emerald-50 rounded-2xl p-4 flex items-center gap-3">
          <Mail className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-800">{email}</p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 flex items-center gap-3">
          <Phone className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500">Phone</p>
            <p className="text-sm font-medium text-gray-800">{phone}</p>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500">Address</p>
            <p className="text-sm font-medium text-gray-800">{address}</p>
          </div>
        </div>

        {/* Store hours */}
        <div className="bg-white border border-emerald-100 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-emerald-500" />
            Store Hours
          </h3>
          <div className="space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Monday - Friday</span>
              <span className="font-medium">7:00 AM - 9:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span>Saturday</span>
              <span className="font-medium">8:00 AM - 8:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span>Sunday</span>
              <span className="font-medium">9:00 AM - 6:00 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ── Register ────────────────────────────────────────────────────── */
registerTheme({
  meta: {
    id: 'fresh',
    name: 'Fresh',
    description: 'Green, organic-themed design with rounded shapes and friendly grocery/food feel',
    bestFor: 'Grocery stores, organic food shops, fresh produce delivery',
    colors: { primary: '#059669', accent: '#10b981', background: '#ffffff' },
    fonts: { heading: 'system-ui', body: 'system-ui' },
    preview: '/themes/fresh-preview.png',
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
