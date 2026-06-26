'use client';

import { RichText } from '@/components/ui/rich-text';
import { shopBase } from '@/lib/use-shop-base';
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
  Flag,
  MapPinned,
  Building,
  Globe,
  BadgeCheck,
  Clock,
  Store,
} from 'lucide-react';

const BD_GREEN = '#006a4e';
const BD_RED = '#F42A41';

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
    className="group block rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden"
  >
    {/* Green accent top border */}
    <div className="h-1" style={{ backgroundColor: BD_GREEN }} />
    <div className="relative aspect-square bg-gray-50">
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Package className="w-12 h-12 text-gray-300" />
        </div>
      )}
      {badge && (
        <span className="absolute top-3 left-3 text-white text-xs font-semibold px-2.5 py-1 rounded-md" style={{ backgroundColor: BD_RED }}>
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
          <span className="text-lg font-bold" style={{ color: BD_GREEN }}>
            &#2547;{price.toFixed(0)}
          </span>
          {originalPrice && (
            <span className="text-sm text-gray-400 line-through">&#2547;{originalPrice.toFixed(0)}</span>
          )}
        </div>
        <button
          className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: BD_GREEN }}
        >
          Add
        </button>
      </div>
    </div>
  </Link>
);

/* ── Hero ──────────────────────────────────────────────────────────── */
const Hero: React.FC<ThemeHeroProps> = ({ storeName, tagline, ctaText, ctaLink }) => (
  <section className="relative overflow-hidden py-20 px-6" style={{ background: `linear-gradient(135deg, ${BD_GREEN}, #004d38)` }}>
    {/* Subtle pattern overlay */}
    <div className="absolute inset-0 opacity-5" style={{
      backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    }} />

    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 relative z-10">
      <div className="flex-1 text-center md:text-left">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-white/90 text-sm font-medium mb-6">
          <Store className="w-4 h-4" /> Shop Local, Shop {storeName}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          {tagline}
        </h1>
        <p className="text-white/80 mb-8 text-lg">
          Discover authentic Bangladeshi products at the best prices. Quality guaranteed.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href={ctaLink}
            className="inline-flex items-center gap-2 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg"
            style={{ backgroundColor: BD_RED }}
          >
            {ctaText} <ChevronRight className="w-5 h-5" />
          </Link>
          <span className="text-white/70 text-sm flex items-center gap-1">
            <BadgeCheck className="w-4 h-4" /> Prices in BDT
          </span>
        </div>
      </div>
      <div className="flex-1 flex justify-center">
        <div className="w-64 h-64 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
          <div className="text-center">
            <Flag className="w-16 h-16 text-white/80 mx-auto mb-3" />
            <p className="text-white font-semibold text-lg">Made in</p>
            <p className="text-white font-bold text-2xl">Bangladesh</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ── CategoryCard ──────────────────────────────────────────────────── */
const CategoryCard: React.FC<ThemeCategoryCardProps> = ({ name, slug, productCount }) => (
  <Link
    href={`${shopBase()}/products?category=${slug}`}
    className="group block bg-white rounded-xl overflow-hidden hover:shadow-md transition-shadow border border-gray-200"
  >
    <div className="flex items-center gap-4 p-4">
      {/* Green left accent */}
      <div className="w-1 h-12 rounded-full" style={{ backgroundColor: BD_GREEN }} />
      <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${BD_GREEN}15` }}>
        <Package className="w-5 h-5" style={{ color: BD_GREEN }} />
      </div>
      <div>
        <h3 className="font-semibold text-sm text-gray-800 group-hover:text-green-800 transition-colors">{name}</h3>
        <p className="text-xs text-gray-500">{productCount} products</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-green-700 transition-colors" />
    </div>
  </Link>
);

/* ── Header ────────────────────────────────────────────────────────── */
const Header: React.FC<ThemeHeaderProps> = ({ storeName, cartCount, menuItems }) => (
  <header className="sticky top-0 z-50 text-white" style={{ backgroundColor: BD_GREEN }}>
    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
          <Store className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold text-white">{storeName}</span>
      </Link>

      <nav className="hidden md:flex items-center gap-6">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-sm text-white/80 hover:text-white transition-colors font-medium"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center bg-white/15 rounded-lg px-3 py-2 gap-2">
          <Search className="w-4 h-4 text-white/60" />
          <input
            type="text"
            placeholder="Search products..."
            className="bg-transparent text-sm outline-none w-36 placeholder-white/50 text-white"
          />
        </div>
        <span className="hidden lg:inline-flex items-center text-xs font-medium bg-white/15 rounded-lg px-2.5 py-1.5 text-white/80">
          <Globe className="w-3.5 h-3.5 mr-1" /> BDT &#2547;
        </span>
        <Link href="/cart" className="relative p-2">
          <ShoppingCart className="w-5 h-5 text-white" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: BD_RED }}>
              {cartCount}
            </span>
          )}
        </Link>
        <button className="md:hidden p-2">
          <Menu className="w-5 h-5 text-white" />
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
    <footer style={{ backgroundColor: '#003d2e' }} className="text-white">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Store className="w-5 h-5 text-white/80" />
              <span className="font-bold text-lg">{storeName}</span>
            </div>
            <RichText html={description} className="text-sm text-white/60 mb-4" />

            {/* Made in Bangladesh badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 mb-4">
              <Flag className="w-4 h-4" style={{ color: BD_RED }} />
              <span className="text-xs font-semibold text-white/80">Made in Bangladesh</span>
            </div>

            <div className="flex gap-3 mt-2">
              {socialLinks.map((link) => {
                const Icon = socialIconMap[link.platform.toLowerCase()];
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                  >
                    {Icon ? <Icon className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                  </a>
                );
              })}
            </div>
          </div>
          {links.slice(0, 3).map((group) => (
            <div key={group.title}>
              <h4 className="font-semibold text-white text-sm mb-3">{group.title}</h4>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-white/50 hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <span>{storeName} &mdash; Proudly Bangladeshi</span>
          <span className="flex items-center gap-1">
            <Flag className="w-3 h-3" /> Serving customers across Bangladesh
          </span>
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
        <div className="aspect-square rounded-xl bg-gray-50 overflow-hidden border border-gray-200">
          {images[0] ? (
            <img src={images[0]} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-20 h-20 text-gray-300" />
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {images.slice(1, 5).map((img, i) => (
              <div key={i} className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2" style={{ borderColor: BD_GREEN }}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <p className="text-sm font-medium mb-1" style={{ color: BD_GREEN }}>{category} {brand && `/ ${brand}`}</p>
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

        {/* BDT pricing */}
        <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-100">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold" style={{ color: BD_GREEN }}>&#2547;{price.toFixed(0)}</span>
            {originalPrice && (
              <span className="text-lg text-gray-400 line-through">&#2547;{originalPrice.toFixed(0)}</span>
            )}
            {originalPrice && (
              <span className="text-sm font-medium px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: BD_RED }}>
                {Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF
              </span>
            )}
          </div>
        </div>

        <RichText html={description} className="text-gray-600 mb-6 leading-relaxed" />

        {/* Variants with green accent tabs */}
        {variants.map((variant) => (
          <div key={variant.label} className="mb-4">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">{variant.label}</label>
            <div className="flex flex-wrap gap-2">
              {variant.values.map((val) => (
                <button
                  key={val}
                  className="px-4 py-2 rounded-lg border-2 border-gray-200 text-sm text-gray-700 hover:border-green-600 hover:text-green-800 transition-colors"
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 mt-6">
          <div className="flex items-center border-2 border-gray-200 rounded-lg">
            <button className="p-2.5 hover:bg-gray-50 rounded-l-lg"><Minus className="w-4 h-4 text-gray-600" /></button>
            <span className="px-4 text-sm font-medium">1</span>
            <button className="p-2.5 hover:bg-gray-50 rounded-r-lg"><Plus className="w-4 h-4 text-gray-600" /></button>
          </div>
          <button
            className="flex-1 text-white font-semibold py-3 rounded-lg transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            style={{ backgroundColor: BD_RED }}
          >
            <ShoppingCart className="w-5 h-5" /> Buy Now
          </button>
          <button
            className="text-white font-semibold py-3 px-5 rounded-lg transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            style={{ backgroundColor: BD_GREEN }}
           onClick={onAddToCart} disabled={isAddingToCart}>
            <ShoppingCart className="w-5 h-5" /> {isAddingToCart ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>

        {/* Local delivery info */}
        <div className="mt-8 bg-green-50 rounded-xl p-5 border border-green-100">
          <h3 className="text-sm font-semibold mb-3" style={{ color: BD_GREEN }}>Delivery Information</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Truck className="w-4 h-4" style={{ color: BD_GREEN }} />
              <span>Inside Dhaka: 1-2 business days (&#2547;60)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Truck className="w-4 h-4" style={{ color: BD_GREEN }} />
              <span>Outside Dhaka: 3-5 business days (&#2547;120)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Clock className="w-4 h-4" style={{ color: BD_GREEN }} />
              <span>Cash on Delivery available</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Shield className="w-4 h-4" style={{ color: BD_GREEN }} />
              <span>7-day return policy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ── Contact ───────────────────────────────────────────────────────── */
const Contact: React.FC<ThemeContactProps> = ({ storeName, email, phone, address }) => (
  <section className="max-w-4xl mx-auto px-4 py-12">
    <div className="text-center mb-10">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h2>
      <p className="text-gray-500">Have questions? We are here to help across Bangladesh.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <div className="rounded-xl p-5 text-center border border-green-100" style={{ backgroundColor: `${BD_GREEN}08` }}>
        <Mail className="w-6 h-6 mx-auto mb-2" style={{ color: BD_GREEN }} />
        <p className="text-sm font-medium text-gray-800">Email</p>
        <p className="text-sm text-gray-500 mt-1">{email}</p>
      </div>
      <div className="rounded-xl p-5 text-center border border-green-100" style={{ backgroundColor: `${BD_GREEN}08` }}>
        <Phone className="w-6 h-6 mx-auto mb-2" style={{ color: BD_GREEN }} />
        <p className="text-sm font-medium text-gray-800">Phone</p>
        <p className="text-sm text-gray-500 mt-1">{phone}</p>
      </div>
      <div className="rounded-xl p-5 text-center border border-green-100" style={{ backgroundColor: `${BD_GREEN}08` }}>
        <MapPin className="w-6 h-6 mx-auto mb-2" style={{ color: BD_GREEN }} />
        <p className="text-sm font-medium text-gray-800">Address</p>
        <p className="text-sm text-gray-500 mt-1">{address}</p>
      </div>
    </div>

    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
      <form className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name</label>
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2.5 focus-within:border-green-600 transition-colors">
              <User className="w-4 h-4 text-gray-400 mr-2" />
              <input type="text" placeholder="Your full name" className="w-full outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone Number</label>
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2.5 focus-within:border-green-600 transition-colors">
              <Phone className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-400 mr-1">+880</span>
              <input type="tel" placeholder="1XXXXXXXXX" className="w-full outline-none text-sm" />
            </div>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2.5 focus-within:border-green-600 transition-colors">
            <Mail className="w-4 h-4 text-gray-400 mr-2" />
            <input type="email" placeholder="your@email.com" className="w-full outline-none text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Division</label>
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2.5 focus-within:border-green-600 transition-colors">
              <MapPinned className="w-4 h-4 text-gray-400 mr-2" />
              <select className="w-full outline-none text-sm bg-transparent text-gray-600">
                <option value="">Select Division</option>
                <option value="dhaka">Dhaka</option>
                <option value="chittagong">Chittagong</option>
                <option value="rajshahi">Rajshahi</option>
                <option value="khulna">Khulna</option>
                <option value="barisal">Barisal</option>
                <option value="sylhet">Sylhet</option>
                <option value="rangpur">Rangpur</option>
                <option value="mymensingh">Mymensingh</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">District</label>
            <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2.5 focus-within:border-green-600 transition-colors">
              <Building className="w-4 h-4 text-gray-400 mr-2" />
              <input type="text" placeholder="Your district" className="w-full outline-none text-sm" />
            </div>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Message</label>
          <div className="border border-gray-300 rounded-lg px-3 py-2.5 focus-within:border-green-600 transition-colors">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
              <textarea rows={4} placeholder="How can we help you?" className="w-full outline-none text-sm resize-none" />
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="w-full text-white font-semibold py-3 rounded-lg transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
          style={{ backgroundColor: BD_GREEN }}
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
    id: 'deshi',
    name: 'Deshi',
    description: 'Bangladesh-first theme with national colors, BDT pricing, and local delivery info',
    bestFor: 'Bangladeshi businesses, local e-commerce, BDT-focused stores',
    colors: { primary: BD_GREEN, accent: BD_RED, background: '#ffffff' },
    fonts: { heading: 'sans-serif', body: 'sans-serif' },
    preview: '/themes/deshi-preview.png',
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
