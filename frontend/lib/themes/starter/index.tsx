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
  Eye,
  Hand,
  ChevronRight,
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
    className="group block rounded-2xl bg-white border border-orange-100 shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-200 overflow-hidden"
  >
    <div className="relative aspect-square bg-amber-50">
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Package className="w-12 h-12 text-amber-300" />
        </div>
      )}
      {badge && (
        <span className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-medium px-2.5 py-1 rounded-full">
          {badge}
        </span>
      )}
    </div>
    <div className="p-4">
      <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2">{name}</h3>
      <div className="flex items-center gap-1 mb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-orange-600"><Price value={price} /></span>
          {originalPrice && (
            <span className="text-sm text-gray-400 line-through"><Price value={originalPrice} /></span>
          )}
        </div>
        <span className="text-sm text-orange-500 font-medium flex items-center gap-1 group-hover:underline">
          <Eye className="w-4 h-4" /> View
        </span>
      </div>
    </div>
  </Link>
);

/* ── Hero ──────────────────────────────────────────────────────────── */
const Hero: React.FC<ThemeHeroProps> = ({ storeName, tagline, ctaText, ctaLink }) => (
  <section className="bg-gradient-to-br from-amber-50 to-orange-50 py-20 px-6">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
      <div className="flex-1 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
          <Hand className="w-8 h-8 text-orange-400" />
          <span className="text-orange-500 font-medium">Welcome to {storeName}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          {tagline}
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          Discover amazing products at friendly prices. We make shopping easy and fun.
        </p>
        <Link
          href={ctaLink}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-orange-200"
        >
          {ctaText} <ChevronRight className="w-5 h-5" />
        </Link>
      </div>
      <div className="flex-1 flex justify-center">
        <div className="w-72 h-72 rounded-full bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
          <ShoppingCart className="w-24 h-24 text-orange-400" />
        </div>
      </div>
    </div>
  </section>
);

/* ── CategoryCard ──────────────────────────────────────────────────── */
const pastelColors = [
  'bg-amber-100 text-amber-700',
  'bg-orange-100 text-orange-700',
  'bg-yellow-100 text-yellow-700',
  'bg-rose-100 text-rose-700',
  'bg-lime-100 text-lime-700',
  'bg-teal-100 text-teal-700',
];

const CategoryCard: React.FC<ThemeCategoryCardProps> = ({ name, slug, productCount }) => {
  const colorIndex =
    name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % pastelColors.length;
  const colorClass = pastelColors[colorIndex];

  return (
    <Link
      href={`${shopBase()}/products?category=${slug}`}
      className={`block rounded-2xl p-6 text-center transition-transform hover:scale-105 ${colorClass}`}
    >
      <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-white/60 flex items-center justify-center">
        <Package className="w-7 h-7" />
      </div>
      <h3 className="font-semibold text-sm mb-1">{name}</h3>
      <p className="text-xs opacity-75">{productCount} products</p>
    </Link>
  );
};

/* ── Header ────────────────────────────────────────────────────────── */
const Header: React.FC<ThemeHeaderProps> = ({ storeName, cartCount, menuItems }) => (
  <header className="bg-white/95 backdrop-blur sticky top-0 z-50 border-b border-orange-100">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-800">{storeName}</span>
      </Link>

      <nav className="hidden md:flex items-center gap-6">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm text-gray-600 hover:text-orange-600 transition-colors font-medium"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center bg-orange-50 rounded-xl px-3 py-2 gap-2">
          <Search className="w-4 h-4 text-orange-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm outline-none w-32 placeholder-orange-300"
          />
        </div>
        <Link href="/cart" className="relative p-2">
          <ShoppingCart className="w-5 h-5 text-gray-700" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {cartCount}
            </span>
          )}
        </Link>
        <button className="md:hidden p-2">
          <Menu className="w-5 h-5 text-gray-700" />
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
    <footer className="bg-orange-50 border-t border-orange-100">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-800">{storeName}</span>
            </div>
            <RichText html={description} className="text-sm text-gray-600 mb-4" />
            <div className="flex gap-3">
              {socialLinks.map((link) => {
                const Icon = socialIconMap[link.platform.toLowerCase()];
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500 hover:bg-orange-200 transition-colors"
                  >
                    {Icon ? <Icon className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                  </a>
                );
              })}
            </div>
          </div>
          {links.slice(0, 3).map((group) => (
            <div key={group.title}>
              <h4 className="font-semibold text-gray-800 mb-3 text-sm">{group.title}</h4>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-gray-500 hover:text-orange-600 transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-6 border-t border-orange-200 text-center text-sm text-gray-500">
          Thanks for visiting {storeName}! We hope you enjoy your shopping.
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
  onAddToCart,
  isAddingToCart,
  selectedOptions = {},
  onSelectOption,
  isOutOfStock,
}) => (
  <div className="max-w-6xl mx-auto px-4 py-10">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* Images */}
      <div className="space-y-3">
        <div className="aspect-square rounded-2xl bg-amber-50 overflow-hidden">
          {images[0] ? (
            <img src={images[0]} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-20 h-20 text-amber-300" />
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {images.slice(1, 5).map((img, i) => (
              <div key={i} className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 border-orange-200">
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <p className="text-sm text-orange-500 font-medium mb-1">{category} {brand && `/ ${brand}`}</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{name}</h1>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500">({reviews} reviews)</span>
        </div>
        <div className="flex items-baseline gap-3 mb-6">
          <span className="text-3xl font-bold text-orange-600"><Price value={price} /></span>
          {originalPrice && (
            <span className="text-lg text-gray-400 line-through"><Price value={originalPrice} /></span>
          )}
        </div>
        <RichText html={description} className="text-gray-600 mb-6 leading-relaxed" />

        {variants.map((variant) => (
          <div key={variant.label} className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">{variant.label}</label>
            <div className="flex flex-wrap gap-2">
              {variant.values.map((val) => (
                <button
                  key={val}
                  className="px-4 py-2 rounded-xl border border-orange-200 text-sm text-gray-700 hover:border-orange-400 hover:bg-orange-50 transition-colors"
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 mt-6">
          <div className="flex items-center border border-orange-200 rounded-xl">
            <button className="p-2.5 hover:bg-orange-50 rounded-l-xl"><Minus className="w-4 h-4 text-gray-600" /></button>
            <span className="px-4 text-sm font-medium">1</span>
            <button className="p-2.5 hover:bg-orange-50 rounded-r-xl"><Plus className="w-4 h-4 text-gray-600" /></button>
          </div>
          <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2" onClick={onAddToCart} disabled={isAddingToCart}>
            <ShoppingCart className="w-5 h-5" /> {isAddingToCart ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>

      </div>
    </div>
  </div>
);

/* ── Contact ───────────────────────────────────────────────────────── */
const Contact: React.FC<ThemeContactProps> = ({ storeName, email, phone, address }) => (
  <section className="max-w-4xl mx-auto px-4 py-12">
    <div className="text-center mb-10">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Get in Touch</h2>
      <p className="text-gray-500">We would love to hear from you! Drop us a message anytime.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <div className="bg-amber-50 rounded-2xl p-5 text-center">
        <Mail className="w-6 h-6 mx-auto mb-2 text-orange-500" />
        <p className="text-sm font-medium text-gray-800">Email Us</p>
        <p className="text-sm text-gray-500 mt-1">{email}</p>
      </div>
      <div className="bg-amber-50 rounded-2xl p-5 text-center">
        <Phone className="w-6 h-6 mx-auto mb-2 text-orange-500" />
        <p className="text-sm font-medium text-gray-800">Call Us</p>
        <p className="text-sm text-gray-500 mt-1">{phone}</p>
      </div>
      <div className="bg-amber-50 rounded-2xl p-5 text-center">
        <MapPin className="w-6 h-6 mx-auto mb-2 text-orange-500" />
        <p className="text-sm font-medium text-gray-800">Visit Us</p>
        <p className="text-sm text-gray-500 mt-1">{address}</p>
      </div>
    </div>
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-8">
      <form className="space-y-5">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Your Name</label>
          <p className="text-xs text-gray-400 mb-1.5">So we know what to call you!</p>
          <div className="flex items-center border border-orange-200 rounded-xl px-3 py-2.5 focus-within:border-orange-400 transition-colors">
            <User className="w-4 h-4 text-orange-400 mr-2" />
            <input type="text" placeholder="Jane Doe" className="w-full outline-none text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Email Address</label>
          <p className="text-xs text-gray-400 mb-1.5">We will reply here, promise!</p>
          <div className="flex items-center border border-orange-200 rounded-xl px-3 py-2.5 focus-within:border-orange-400 transition-colors">
            <Mail className="w-4 h-4 text-orange-400 mr-2" />
            <input type="email" placeholder="jane@example.com" className="w-full outline-none text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Message</label>
          <p className="text-xs text-gray-400 mb-1.5">Tell us everything, we are all ears!</p>
          <div className="border border-orange-200 rounded-xl px-3 py-2.5 focus-within:border-orange-400 transition-colors">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-orange-400 mt-0.5" />
              <textarea rows={4} placeholder="Your message here..." className="w-full outline-none text-sm resize-none" />
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" /> Send Message
        </button>
      </form>
    </div>
  </section>
);

/* ── Register ──────────────────────────────────────────────────────── */
registerTheme({
  meta: {
    id: 'starter',
    name: 'Starter',
    description: 'Simple, warm, and beginner-friendly theme with amber and orange tints',
    bestFor: 'New stores, personal shops, hobby sellers',
    colors: { primary: '#f97316', accent: '#f59e0b', background: '#fffbeb' },
    fonts: { heading: 'sans-serif', body: 'sans-serif' },
    preview: '/themes/starter-preview.png',
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
