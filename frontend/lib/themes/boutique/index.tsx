'use client';

import { RichText } from '@/components/ui/rich-text';
import { shopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';
import Link from 'next/link';
import React, { useState } from 'react';
import {
  Star,
  ShoppingBag,
  Search,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Heart,
  Share2,
  Minus,
  Plus,
  Mail,
  Phone,
  MapPin,
  Send,
  Facebook,
  Instagram,
  Twitter,
  ArrowRight,
  Package,
  Truck,
  ShieldCheck,
  User,
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
  image,
}) => {
  return (
    <Link href={`${shopBase()}/products/${id}`} className="group block">
      <div className="overflow-hidden">
        <div className="relative aspect-[3/4] bg-rose-50 overflow-hidden rounded-sm">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-12 h-12 text-rose-200" />
            </div>
          )}
          {badge && (
            <span className="absolute top-4 left-4 bg-rose-700 text-white text-xs tracking-wider uppercase px-3 py-1">
              {badge}
            </span>
          )}
          <button className="absolute top-4 right-4 w-9 h-9 bg-white/80 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Heart className="w-4 h-4 text-rose-600" />
          </button>
        </div>
        <div className="pt-4">
          <h3 className="font-serif text-base text-gray-900 mb-1">{name}</h3>
          <div className="flex items-center gap-1 mb-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < Math.round(rating) ? 'fill-rose-400 text-rose-400' : 'text-gray-200'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900"><Price value={price} /></span>
            {originalPrice && (
              <span className="text-sm text-gray-400 line-through"><Price value={originalPrice} /></span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

/* ── Hero ─────────────────────────────────────────────────────────── */
const Hero: React.FC<ThemeHeroProps> = ({ storeName, tagline, ctaText, ctaLink }) => {
  return (
    <section className="relative w-full min-h-screen bg-rose-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-rose-100/40 to-rose-50/80" />
      <div className="relative z-10 text-center px-4 max-w-3xl">
        <p className="text-sm tracking-[0.3em] uppercase text-rose-500 mb-4 italic">
          Welcome to
        </p>
        <h1 className="font-serif text-5xl md:text-7xl text-gray-900 mb-4 leading-tight">
          {storeName}
        </h1>
        <p className="font-serif text-xl md:text-2xl text-gray-600 italic mb-10 leading-relaxed">
          {tagline}
        </p>
        <Link
          href={ctaLink}
          className="inline-flex items-center gap-3 bg-rose-700 text-white px-10 py-4 text-sm tracking-wider uppercase hover:bg-rose-800 transition-colors"
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
      <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-rose-100 to-rose-200" />
        )}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <h3 className="font-serif text-2xl mb-1">{name}</h3>
          <p className="text-sm text-white/80">{productCount} pieces</p>
        </div>
      </div>
    </Link>
  );
};

/* ── Header ───────────────────────────────────────────────────────── */
const Header: React.FC<ThemeHeaderProps> = ({ storeName, cartCount, menuItems }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top bar */}
        <div className="h-16 md:h-20 flex items-center justify-between">
          {/* Left nav toggle (mobile) / nav (desktop) */}
          <div className="flex items-center gap-6">
            <button
              className="md:hidden text-gray-700"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <nav className="hidden md:flex items-center gap-6">
              {menuItems.slice(0, Math.ceil(menuItems.length / 2)).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-xs tracking-wider uppercase text-gray-600 hover:text-rose-700 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Centered Logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2 font-serif text-2xl text-gray-900">
            {storeName}
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-5">
            <nav className="hidden md:flex items-center gap-6">
              {menuItems.slice(Math.ceil(menuItems.length / 2)).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-xs tracking-wider uppercase text-gray-600 hover:text-rose-700 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <button aria-label="Search" className="text-gray-600 hover:text-rose-700">
              <Search className="w-4.5 h-4.5" />
            </button>
            <button aria-label="Account" className="text-gray-600 hover:text-rose-700 hidden md:block">
              <User className="w-4.5 h-4.5" />
            </button>
            <Link href="/cart" className="relative text-gray-600 hover:text-rose-700">
              <ShoppingBag className="w-4.5 h-4.5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-700 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-rose-100 bg-white px-4 py-4 space-y-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block text-sm tracking-wider uppercase text-gray-700 hover:text-rose-700"
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
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <h3 className="font-serif text-2xl text-amber-100 mb-4">{storeName}</h3>
            <RichText html={description} className="text-sm text-gray-400 leading-relaxed mb-6" />
            <div className="flex items-center gap-4">
              {socialLinks.map((s) => {
                const Icon = socialIconMap[s.platform.toLowerCase()];
                return (
                  <a
                    key={s.platform}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-amber-200 transition-colors"
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
              <h4 className="font-serif text-lg text-amber-100 mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-gray-400 hover:text-amber-200 transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-12 pt-10 border-t border-gray-800">
          <div className="max-w-md mx-auto text-center">
            <h4 className="font-serif text-lg text-amber-100 mb-2">Join Our World</h4>
            <p className="text-sm text-gray-400 mb-4">Subscribe for exclusive previews and offers.</p>
            <form className="flex" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 bg-gray-800 text-sm text-white border border-gray-700 px-4 py-2.5 focus:outline-none focus:border-amber-200/50"
              />
              <button
                type="submit"
                className="bg-rose-700 text-white px-6 py-2.5 text-sm tracking-wider uppercase hover:bg-rose-800 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
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
  const [openAccordion, setOpenAccordion] = useState<string | null>('description');
  const [qty, setQty] = useState(1);

  const accordions = [
    { key: 'description', label: 'Description', content: description },
    { key: 'details', label: 'Details', content: `Brand: ${brand}\nCategory: ${category}` },
    { key: 'shipping', label: 'Shipping & Returns', content: 'Free shipping on orders over $100. 30-day return policy.' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs tracking-wider uppercase text-gray-400 mb-8">
        <Link href="/" className="hover:text-rose-700">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`${shopBase()}/products?category=${category}`} className="hover:text-rose-700">{category}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-600">{name}</span>
      </div>

      {/* Full-width main image */}
      <div className="w-full aspect-[16/9] md:aspect-[2/1] bg-rose-50 rounded-sm overflow-hidden mb-4">
        {images[selectedImage] ? (
          <img src={images[selectedImage]} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-20 h-20 text-rose-200" />
          </div>
        )}
      </div>

      {/* Thumbnail row */}
      {images.length > 1 && (
        <div className="flex gap-2 mb-10">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedImage(i)}
              className={`w-20 h-20 rounded-sm overflow-hidden border-2 transition-colors ${
                selectedImage === i ? 'border-rose-700' : 'border-transparent'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Info section */}
      <div className="max-w-2xl mx-auto text-center mb-10">
        <p className="text-xs tracking-wider uppercase text-rose-500 mb-2">{brand}</p>
        <h1 className="font-serif text-3xl md:text-4xl text-gray-900 mb-3">{name}</h1>
        <div className="flex items-center justify-center gap-1 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < Math.round(rating) ? 'fill-rose-400 text-rose-400' : 'text-gray-200'}`}
            />
          ))}
          <span className="text-sm text-gray-500 ml-2">({reviews})</span>
        </div>
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="font-serif text-3xl text-gray-900"><Price value={price} /></span>
          {originalPrice && (
            <span className="text-lg text-gray-400 line-through"><Price value={originalPrice} /></span>
          )}
        </div>

        {/* Variants */}
        {variants.map((v) => (
          <div key={v.label} className="mb-5">
            <span className="text-xs tracking-wider uppercase text-gray-500 mb-2 block">{v.label}</span>
            <div className="flex flex-wrap justify-center gap-2">
              {v.values.map((val) => (
                <button
                  key={val}
                  className="border border-gray-300 px-5 py-2 text-sm hover:border-rose-700 hover:text-rose-700 transition-colors"
                
                  onClick={() => onSelectOption?.(v.label, val)}
                  data-selected={selectedOptions[v.label] === val ? 'true' : undefined}
                  style={selectedOptions[v.label] === val ? { backgroundColor: '#111827', color: '#ffffff', borderColor: '#111827' } : undefined}
                >{val}</button>
              ))}
            </div>
          </div>
        ))}

        {/* Quantity + Add to bag */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center border border-gray-300">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2.5 hover:bg-rose-50">
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-5 text-sm font-medium">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="p-2.5 hover:bg-rose-50">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button className="bg-rose-700 text-white px-10 py-3 text-sm tracking-wider uppercase hover:bg-rose-800 transition-colors flex items-center gap-2" onClick={onAddToCart} disabled={isAddingToCart}>
            <ShoppingBag className="w-4 h-4" />
            {isAddingToCart ? 'Adding...' : 'Add to Bag'}
          </button>
          <button className="border border-gray-300 p-3 hover:bg-rose-50 transition-colors">
            <Heart className="w-5 h-5 text-gray-500" />
          </button>
        </div>

      </div>

      {/* Accordion */}
      <div className="max-w-2xl mx-auto border-t border-gray-200">
        {accordions.map((acc) => (
          <div key={acc.key} className="border-b border-gray-200">
            <button
              onClick={() => setOpenAccordion(openAccordion === acc.key ? null : acc.key)}
              className="w-full flex items-center justify-between py-5 text-left"
            >
              <span className="font-serif text-base text-gray-900">{acc.label}</span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  openAccordion === acc.key ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openAccordion === acc.key && (
              <div className="pb-5 text-sm text-gray-600 leading-relaxed whitespace-pre-line"><RichText html={acc.content} /></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Contact ──────────────────────────────────────────────────────── */
const Contact: React.FC<ThemeContactProps> = ({ storeName, email, phone, address }) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <p className="text-xs tracking-[0.3em] uppercase text-rose-500 mb-3">Get in Touch</p>
        <h1 className="font-serif text-4xl text-gray-900 mb-3">We Would Love to Hear From You</h1>
        <p className="text-gray-500">Reach out for inquiries, custom orders, or any questions.</p>
      </div>

      {/* Contact info row */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-12 text-sm text-gray-600">
        <span className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-rose-500" /> {email}
        </span>
        <span className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-rose-500" /> {phone}
        </span>
        <span className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-500" /> {address}
        </span>
      </div>

      {/* Form */}
      <form
        className="bg-rose-50/50 rounded-sm p-8 space-y-5"
        onSubmit={(e) => e.preventDefault()}
      >
        <div>
          <label className="block text-xs tracking-wider uppercase text-gray-500 mb-1.5">Name</label>
          <input className="w-full bg-white border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-rose-400" />
        </div>
        <div>
          <label className="block text-xs tracking-wider uppercase text-gray-500 mb-1.5">Email</label>
          <input type="email" className="w-full bg-white border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-rose-400" />
        </div>
        <div>
          <label className="block text-xs tracking-wider uppercase text-gray-500 mb-1.5">Subject</label>
          <input className="w-full bg-white border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-rose-400" />
        </div>
        <div>
          <label className="block text-xs tracking-wider uppercase text-gray-500 mb-1.5">Message</label>
          <textarea rows={5} className="w-full bg-white border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-rose-400 resize-none" />
        </div>
        <div className="text-center">
          <button
            type="submit"
            className="bg-rose-700 text-white px-10 py-3 text-sm tracking-wider uppercase hover:bg-rose-800 transition-colors inline-flex items-center gap-2"
          >
            Send Message
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

/* ── Register Theme ───────────────────────────────────────────────── */
registerTheme({
  meta: {
    id: 'boutique',
    name: 'Boutique',
    description: 'An elegant, serif-driven theme with soft rose and cream tones, designed for luxury and fashion brands.',
    bestFor: 'Fashion boutiques, jewelry, luxury goods, artisan products',
    colors: { primary: '#9F1239', accent: '#FDE8D0', background: '#FFF5F5' },
    fonts: { heading: 'Georgia, serif', body: 'system-ui, sans-serif' },
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
