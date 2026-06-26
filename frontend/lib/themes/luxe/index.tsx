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
  ShoppingBag,
  Search,
  Star,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  User,
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
  ChevronRight,
} from 'lucide-react';

/* ── ProductCard ───────────────────────────────────────────────────── */
const ProductCard: React.FC<ThemeProductCardProps> = ({
  id,
  name,
  price,
  originalPrice,
  badge,
  image,
}) => (
  <Link
    href={`${shopBase()}/products/${id}`}
    className="group block bg-white overflow-hidden"
  >
    <div className="relative aspect-[3/4] bg-neutral-100">
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Package className="w-16 h-16 text-neutral-300" />
        </div>
      )}
      {badge && (
        <span className="absolute top-4 left-4 bg-black text-[#c9a84c] text-xs font-medium tracking-wider uppercase px-3 py-1">
          {badge}
        </span>
      )}
    </div>
    <div className="border-b-2 border-black pt-4 pb-4">
      <h3 className="font-serif text-base text-black tracking-wide mb-2 line-clamp-1">{name}</h3>
      <div className="flex items-baseline gap-3">
        <span className="text-[#c9a84c] font-serif text-lg"><Price value={price} /></span>
        {originalPrice && (
          <span className="text-sm text-neutral-400 line-through"><Price value={originalPrice} /></span>
        )}
      </div>
    </div>
  </Link>
);

/* ── Hero ──────────────────────────────────────────────────────────── */
const Hero: React.FC<ThemeHeroProps> = ({ storeName, tagline, ctaText, ctaLink }) => (
  <section className="min-h-[100vh] bg-black flex items-center justify-center px-6">
    <div className="max-w-3xl text-center">
      <p className="text-[#c9a84c] tracking-[0.3em] uppercase text-sm mb-6 font-serif">{storeName}</p>
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white mb-8 leading-tight">
        {tagline}
      </h1>
      <Link
        href={ctaLink}
        className="inline-flex items-center gap-3 text-[#c9a84c] border-b border-[#c9a84c] pb-1 hover:text-white hover:border-white transition-colors font-serif text-lg tracking-wide"
      >
        Discover <ArrowRight className="w-5 h-5" />
      </Link>
    </div>
  </section>
);

/* ── CategoryCard ──────────────────────────────────────────────────── */
const CategoryCard: React.FC<ThemeCategoryCardProps> = ({ name, slug, productCount }) => (
  <Link
    href={`${shopBase()}/products?category=${slug}`}
    className="group block bg-black border border-[#c9a84c]/30 hover:border-[#c9a84c] transition-colors p-8 text-center"
  >
    <h3 className="font-serif text-white text-lg tracking-wide mb-2 group-hover:text-[#c9a84c] transition-colors">
      {name}
    </h3>
    <p className="text-[#c9a84c]/60 text-xs tracking-widest uppercase">{productCount} pieces</p>
  </Link>
);

/* ── Header ────────────────────────────────────────────────────────── */
const Header: React.FC<ThemeHeaderProps> = ({ storeName, cartCount, menuItems }) => (
  <header className="bg-black sticky top-0 z-50 border-b border-neutral-800">
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <Link href="/" className="font-serif text-xl text-[#c9a84c] tracking-widest uppercase">
        {storeName}
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm text-white/70 hover:text-[#c9a84c] transition-colors tracking-wide uppercase font-light"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-5">
        <button className="text-white/70 hover:text-[#c9a84c] transition-colors">
          <Search className="w-5 h-5" />
        </button>
        <Link href="/cart" className="relative text-white/70 hover:text-[#c9a84c] transition-colors">
          <ShoppingBag className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#c9a84c] text-black text-[10px] rounded-full flex items-center justify-center font-medium">
              {cartCount}
            </span>
          )}
        </Link>
        <button className="md:hidden text-white/70">
          <Menu className="w-5 h-5" />
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
    <footer className="bg-black border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <p className="font-serif text-[#c9a84c] tracking-widest uppercase text-lg mb-4">{storeName}</p>
            <RichText html={description} className="text-sm text-neutral-500 leading-relaxed mb-6" />
            <div className="flex gap-4">
              {socialLinks.map((link) => {
                const Icon = socialIconMap[link.platform.toLowerCase()];
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-600 hover:text-[#c9a84c] transition-colors"
                  >
                    {Icon ? <Icon className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                  </a>
                );
              })}
            </div>
          </div>
          {links.slice(0, 3).map((group) => (
            <div key={group.title}>
              <h4 className="font-serif text-[#c9a84c] tracking-wide text-sm mb-4">{group.title}</h4>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-neutral-500 hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 pt-8 border-t border-neutral-800 text-center text-xs text-neutral-600 tracking-widest uppercase">
          {storeName} &mdash; Luxury Redefined
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
  <div>
    {/* Full-width image hero */}
    <div className="w-full aspect-[21/9] bg-neutral-100 overflow-hidden">
      {images[0] ? (
        <img src={images[0]} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-neutral-900">
          <Package className="w-24 h-24 text-neutral-700" />
        </div>
      )}
    </div>

    <div className="max-w-4xl mx-auto px-6 py-14">
      <p className="text-xs tracking-[0.3em] uppercase text-neutral-400 mb-3">{category} {brand && `/ ${brand}`}</p>
      <h1 className="text-3xl md:text-4xl font-serif text-black mb-4">{name}</h1>
      <div className="flex items-center gap-2 mb-6">
        <div className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < Math.round(rating) ? 'text-[#c9a84c] fill-[#c9a84c]' : 'text-neutral-200'}`}
            />
          ))}
        </div>
        <span className="text-xs text-neutral-400 tracking-wide">({reviews})</span>
      </div>
      <div className="flex items-baseline gap-4 mb-8 pb-8 border-b border-neutral-200">
        <span className="text-3xl font-serif text-[#c9a84c]"><Price value={price} /></span>
        {originalPrice && (
          <span className="text-lg text-neutral-400 line-through"><Price value={originalPrice} /></span>
        )}
      </div>
      <RichText html={description} className="text-neutral-600 leading-relaxed mb-8" />

      {variants.map((variant) => (
        <div key={variant.label} className="mb-6">
          <label className="text-xs tracking-[0.2em] uppercase text-neutral-500 mb-3 block">{variant.label}</label>
          <div className="flex flex-wrap gap-2">
            {variant.values.map((val) => (
              <button
                key={val}
                className="px-5 py-2.5 border border-neutral-300 text-sm hover:border-black hover:bg-black hover:text-white transition-colors"
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-4 mt-8">
        <div className="flex items-center border border-neutral-300">
          <button className="p-3 hover:bg-neutral-100"><Minus className="w-4 h-4" /></button>
          <span className="px-5 text-sm font-medium">1</span>
          <button className="p-3 hover:bg-neutral-100"><Plus className="w-4 h-4" /></button>
        </div>
        <button className="flex-1 bg-black hover:bg-neutral-900 text-white font-medium py-3.5 tracking-wider uppercase text-sm transition-colors flex items-center justify-center gap-2" onClick={onAddToCart} disabled={isAddingToCart}>
          <ShoppingBag className="w-4 h-4" /> {isAddingToCart ? 'Adding...' : 'Add to Bag'}
        </button>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-6 pt-8 border-t border-neutral-200">
        <div className="text-center">
          <Truck className="w-5 h-5 mx-auto mb-2 text-[#c9a84c]" />
          <span className="text-xs text-neutral-500 tracking-wide">Complimentary Shipping</span>
        </div>
        <div className="text-center">
          <Shield className="w-5 h-5 mx-auto mb-2 text-[#c9a84c]" />
          <span className="text-xs text-neutral-500 tracking-wide">Authenticity Guaranteed</span>
        </div>
        <div className="text-center">
          <Package className="w-5 h-5 mx-auto mb-2 text-[#c9a84c]" />
          <span className="text-xs text-neutral-500 tracking-wide">Gift Packaging</span>
        </div>
      </div>
    </div>
  </div>
);

/* ── Contact ───────────────────────────────────────────────────────── */
const Contact: React.FC<ThemeContactProps> = ({ storeName, email, phone, address }) => (
  <section className="bg-black min-h-screen flex items-center justify-center px-6 py-20">
    <div className="max-w-xl w-full">
      <div className="text-center mb-12">
        <p className="text-[#c9a84c] tracking-[0.3em] uppercase text-xs mb-4">Contact</p>
        <h2 className="text-3xl font-serif text-white mb-3">Get in Touch</h2>
        <p className="text-neutral-500 text-sm">We welcome your inquiries</p>
      </div>

      <div className="flex justify-center gap-10 mb-12">
        <div className="text-center">
          <Mail className="w-5 h-5 mx-auto mb-2 text-[#c9a84c]" />
          <p className="text-xs text-neutral-400">{email}</p>
        </div>
        <div className="text-center">
          <Phone className="w-5 h-5 mx-auto mb-2 text-[#c9a84c]" />
          <p className="text-xs text-neutral-400">{phone}</p>
        </div>
      </div>

      <form className="space-y-6">
        <div>
          <label className="text-xs tracking-[0.2em] uppercase text-neutral-500 mb-2 block">Name</label>
          <input
            type="text"
            placeholder="Your name"
            className="w-full bg-transparent border-b border-neutral-700 focus:border-[#c9a84c] text-white py-3 outline-none text-sm transition-colors placeholder-neutral-600"
          />
        </div>
        <div>
          <label className="text-xs tracking-[0.2em] uppercase text-neutral-500 mb-2 block">Email</label>
          <input
            type="email"
            placeholder="Your email"
            className="w-full bg-transparent border-b border-neutral-700 focus:border-[#c9a84c] text-white py-3 outline-none text-sm transition-colors placeholder-neutral-600"
          />
        </div>
        <div>
          <label className="text-xs tracking-[0.2em] uppercase text-neutral-500 mb-2 block">Message</label>
          <textarea
            rows={4}
            placeholder="Your message"
            className="w-full bg-transparent border-b border-neutral-700 focus:border-[#c9a84c] text-white py-3 outline-none text-sm resize-none transition-colors placeholder-neutral-600"
          />
        </div>
        <button
          type="submit"
          className="w-full border border-[#c9a84c] text-[#c9a84c] hover:bg-[#c9a84c] hover:text-black font-medium py-3.5 tracking-wider uppercase text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" /> Send
        </button>
      </form>
    </div>
  </section>
);

/* ── Register ──────────────────────────────────────────────────────── */
registerTheme({
  meta: {
    id: 'luxe',
    name: 'Luxe',
    description: 'Gold and black luxury theme with serif typography and editorial imagery',
    bestFor: 'Luxury brands, jewelry, fashion houses, premium goods',
    colors: { primary: '#c9a84c', accent: '#000000', background: '#000000' },
    fonts: { heading: 'serif', body: 'sans-serif' },
    preview: '/themes/luxe-preview.png',
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
