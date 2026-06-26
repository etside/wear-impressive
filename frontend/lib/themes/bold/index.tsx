'use client';

import { RichText } from '@/components/ui/rich-text';
import { shopBase } from '@/lib/use-shop-base';
import { Price } from '@/lib/format-price';
import Link from 'next/link';
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
import {
  ShoppingCart,
  Search,
  Star,
  Sparkles,
  Zap,
  Phone,
  Mail,
  MapPin,
  User,
  MessageSquare,
  Send,
  Heart,
  Minus,
  Plus,
  Package,
  Truck,
  Shield,
  Facebook,
  Twitter,
  Instagram,
  Menu,
  ArrowRight,
} from 'lucide-react';

/* ── ProductCard ───────────────────────────────────────────────────── */
const ProductCard: React.FC<ThemeProductCardProps> = ({
  id,
  name,
  price,
  originalPrice,
  badge,
  rating,
  image,
}) => (
  <Link
    href={`${shopBase()}/products/${id}`}
    className="group block rounded-3xl bg-white shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative"
  >
    {/* Gradient border effect on hover */}
    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-[1px] scale-[1.02]" />
    <div className="bg-white rounded-3xl overflow-hidden">
      <div className="relative aspect-square bg-gradient-to-br from-purple-50 to-pink-50">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-14 h-14 text-purple-300" />
          </div>
        )}
        {badge && (
          <span className="absolute top-3 left-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-base font-bold text-gray-900 line-clamp-2 mb-2">{name}</h3>
        <div className="flex items-center gap-1 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${i < Math.round(rating) ? 'text-purple-500 fill-purple-500' : 'text-gray-200'}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              <Price value={price} />
            </span>
            {originalPrice && (
              <span className="text-sm text-gray-400 line-through"><Price value={originalPrice} /></span>
            )}
          </div>
          <span className="bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-bold px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            Grab it
          </span>
        </div>
      </div>
    </div>
  </Link>
);

/* ── Hero ──────────────────────────────────────────────────────────── */
const Hero: React.FC<ThemeHeroProps> = ({ storeName, tagline, ctaText, ctaLink }) => (
  <section className="bg-gradient-to-br from-purple-600 to-pink-500 py-24 px-6 relative overflow-hidden">
    {/* Decorative blobs */}
    <div className="absolute top-10 right-10 w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl" />
    <div className="absolute bottom-10 left-10 w-60 h-60 bg-yellow-400/20 rounded-full blur-3xl" />

    <div className="max-w-4xl mx-auto text-center relative z-10">
      <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-white/90 text-sm font-medium mb-8">
        <Sparkles className="w-4 h-4" /> Welcome to {storeName}
      </div>
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
        {tagline}
      </h1>
      <p className="text-white/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
        Discover the boldest collection. Style that speaks louder than words.
      </p>
      <Link
        href={ctaLink}
        className="inline-flex items-center gap-2 bg-white text-purple-700 font-extrabold px-10 py-4 rounded-full text-lg hover:bg-yellow-300 hover:text-purple-900 transition-colors shadow-2xl shadow-purple-900/30"
      >
        <Zap className="w-5 h-5" /> {ctaText}
      </Link>
    </div>
  </section>
);

/* ── CategoryCard ──────────────────────────────────────────────────── */
const gradients = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-cyan-500',
  'from-pink-500 to-rose-500',
  'from-cyan-500 to-teal-500',
  'from-violet-500 to-purple-500',
  'from-fuchsia-500 to-pink-500',
];

const CategoryCard: React.FC<ThemeCategoryCardProps> = ({ name, slug, productCount }) => {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % gradients.length;
  return (
    <Link
      href={`${shopBase()}/products?category=${slug}`}
      className={`block rounded-3xl bg-gradient-to-br ${gradients[idx]} p-6 text-center text-white hover:scale-105 transition-transform duration-200 shadow-lg`}
    >
      <div className="w-14 h-14 mx-auto mb-3 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
        <Package className="w-7 h-7 text-white" />
      </div>
      <h3 className="font-bold text-sm mb-1">{name}</h3>
      <p className="text-xs text-white/70">{productCount} products</p>
    </Link>
  );
};

/* ── Header ────────────────────────────────────────────────────────── */
const Header: React.FC<ThemeHeaderProps> = ({ storeName, cartCount, menuItems }) => (
  <header className="bg-white sticky top-0 z-50 shadow-sm">
    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <Link href="/" className="text-xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
        {storeName}
      </Link>

      <nav className="hidden md:flex items-center gap-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm font-medium text-gray-600 hover:text-purple-600 px-4 py-2 rounded-full hover:bg-purple-50 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <button className="p-2.5 rounded-full hover:bg-purple-50 transition-colors">
          <Search className="w-5 h-5 text-gray-600" />
        </button>
        <Link href="/cart" className="relative p-2.5 rounded-full hover:bg-purple-50 transition-colors">
          <ShoppingCart className="w-5 h-5 text-gray-600" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {cartCount}
            </span>
          )}
        </Link>
        <button className="md:hidden p-2.5">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  </header>
);

/* ── Footer ────────────────────────────────────────────────────────── */
const Footer: React.FC<ThemeFooterProps> = ({ storeName, description, links, socialLinks }) => {
  const socialIconMap: Record<string, React.FC<{ className?: string }>> = {
    facebook: Facebook,
    twitter: Twitter,
    instagram: Instagram,
  };

  return (
    <footer className="bg-gray-950 relative">
      {/* Gradient accent line */}
      <div className="h-1 bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500" />

      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <p className="text-xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
              {storeName}
            </p>
            <RichText html={description} className="text-sm text-gray-500 mb-5" />
            <div className="flex gap-3">
              {socialLinks.map((link) => {
                const Icon = socialIconMap[link.platform.toLowerCase()];
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 hover:text-purple-400 hover:bg-gray-700 transition-colors"
                  >
                    {Icon ? <Icon className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                  </a>
                );
              })}
            </div>
          </div>
          {links.slice(0, 3).map((group) => (
            <div key={group.title}>
              <h4 className="font-bold text-white text-sm mb-4">{group.title}</h4>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-gray-500 hover:text-purple-400 transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-gray-800 text-center text-sm text-gray-600">
          {storeName} &mdash; Stay Bold.
        </div>
      </div>
    </footer>
  );
};

/* ── ProductDetail ─────────────────────────────────────────────────── */
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
  selectedOptions = {},
  onSelectOption,
  isOutOfStock,
}) => (
  <div>
    {/* Gradient header accent */}
    <div className="h-2 bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500" />

    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image */}
        <div className="space-y-3">
          <div className="aspect-square rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
            {images[0] ? (
              <img src={images[0]} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-20 h-20 text-purple-300" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.slice(1, 5).map((img, i) => (
                <div key={i} className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-purple-200">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-sm font-bold text-purple-500 mb-1">{category} {brand && `/ ${brand}`}</p>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">{name}</h1>
          <div className="flex items-center gap-2 mb-5">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(rating) ? 'text-purple-500 fill-purple-500' : 'text-gray-200'}`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-400">({reviews} reviews)</span>
          </div>
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              <Price value={price} />
            </span>
            {originalPrice && (
              <span className="text-lg text-gray-400 line-through"><Price value={originalPrice} /></span>
            )}
          </div>
          <RichText html={description} className="text-gray-600 mb-6 leading-relaxed" />

          {variants.map((variant) => (
            <div key={variant.label} className="mb-5">
              <label className="text-sm font-bold text-gray-700 mb-2 block">{variant.label}</label>
              <div className="flex flex-wrap gap-2">
                {variant.values.map((val) => (
                  <button
                    key={val}
                    className="px-5 py-2.5 rounded-full border-2 border-gray-200 text-sm font-medium hover:border-purple-500 hover:text-purple-600 transition-colors"
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3 mt-8">
            <div className="flex items-center border-2 border-gray-200 rounded-full">
              <button className="p-3 hover:bg-gray-50 rounded-l-full"><Minus className="w-4 h-4 text-gray-600" /></button>
              <span className="px-4 text-sm font-bold">1</span>
              <button className="p-3 hover:bg-gray-50 rounded-r-full"><Plus className="w-4 h-4 text-gray-600" /></button>
            </div>
            <button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-extrabold py-3.5 rounded-full transition-all shadow-lg shadow-purple-300/50 flex items-center justify-center gap-2 text-sm">
              <Zap className="w-5 h-5" /> Grab It Now
            </button>
          </div>

        </div>
      </div>
    </div>
  </div>
);

/* ── Contact ───────────────────────────────────────────────────────── */
const Contact: React.FC<ThemeContactProps> = ({ storeName, email, phone, address }) => (
  <section className="max-w-2xl mx-auto px-4 py-12">
    <div className="rounded-3xl overflow-hidden shadow-xl">
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-8 py-10 text-center">
        <Sparkles className="w-8 h-8 text-white/80 mx-auto mb-3" />
        <h2 className="text-3xl font-extrabold text-white mb-2">Let&apos;s Talk</h2>
        <p className="text-white/80 text-sm">We are just a message away</p>
      </div>

      <div className="bg-white p-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-3 rounded-2xl bg-purple-50">
            <Mail className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className="text-xs text-gray-600 truncate">{email}</p>
          </div>
          <div className="text-center p-3 rounded-2xl bg-pink-50">
            <Phone className="w-5 h-5 mx-auto mb-1 text-pink-500" />
            <p className="text-xs text-gray-600">{phone}</p>
          </div>
          <div className="text-center p-3 rounded-2xl bg-cyan-50">
            <MapPin className="w-5 h-5 mx-auto mb-1 text-cyan-500" />
            <p className="text-xs text-gray-600 truncate">{address}</p>
          </div>
        </div>

        <form className="space-y-5">
          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Name</label>
            <input
              type="text"
              placeholder="Your awesome name"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">Message</label>
            <textarea
              rows={4}
              placeholder="Tell us what you think..."
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-extrabold py-3.5 rounded-full transition-all shadow-lg shadow-purple-300/50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> Send It
          </button>
        </form>
      </div>
    </div>
  </section>
);

/* ── Register ──────────────────────────────────────────────────────── */
registerTheme({
  meta: {
    id: 'bold',
    name: 'Bold',
    description: 'Vibrant gradients and large typography with Gen-Z appeal',
    bestFor: 'Trendy brands, streetwear, youth-focused stores',
    colors: { primary: '#9333ea', accent: '#ec4899', background: '#ffffff' },
    fonts: { heading: 'sans-serif', body: 'sans-serif' },
    preview: '/themes/bold-preview.png',
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
