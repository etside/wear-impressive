'use client';
import { createContext, useContext } from 'react';

/* ── Theme component interfaces ─────────────────────────────────── */
export interface ThemeProductCardProps {
  id: number;
  name: string;
  price: number;
  originalPrice: number | null;
  badge: string | null;
  rating: number;
  reviews: number;
  image: string | null;
  category?: string;
  /**
   * In-stock variant sizes to advertise on the card (e.g. ["35", "36", "37"]).
   * Empty array / undefined hides the row entirely. Already de-duped and
   * sorted at the call site so themes can render blindly.
   */
  availableSizes?: string[];
}

export interface ThemeHeroProps {
  storeName: string;
  tagline: string;
  ctaText: string;
  ctaLink: string;
}

export interface ThemeCategoryCardProps {
  name: string;
  slug: string;
  productCount: number;
  image: string | null;
}

export interface ThemeHeaderProps {
  storeName: string;
  cartCount: number;
  menuItems: { label: string; href: string }[];
}

export interface ThemeFooterProps {
  storeName: string;
  description: string;
  links: { title: string; items: { label: string; href: string }[] }[];
  socialLinks: { platform: string; url: string }[];
}

export interface ThemeProductTab {
  /** The visible label, already resolved to the current language. */
  label: string;
  /** Rich-text HTML, already resolved to the current language. */
  content: string;
}

export interface ThemeProductDetailProps {
  id: number;
  name: string;
  price: number;
  originalPrice: number | null;
  description: string;
  images: string[];
  rating: number;
  reviews: number;
  variants: { label: string; values: string[] }[];
  category: string;
  brand: string;
  selectedOptions?: Record<string, string>;
  onSelectOption?: (label: string, value: string) => void;
  onAddToCart?: () => void;
  isAddingToCart?: boolean;
  isOutOfStock?: boolean;
  /** Units remaining for the current product/variant selection. `null` when no variant picked yet. */
  stockRemaining?: number | null;
  /**
   * Vendor-defined extra tabs that render after the always-on Description.
   * Already resolved to the current language by the page; themes can render
   * blindly without worrying about i18n fallback.
   */
  customTabs?: ThemeProductTab[];
  /**
   * Localized labels for the built-in tabs. Themes use these to render
   * "Description" / "Reviews" in the customer's chosen language. Pass-through
   * from the page so themes stay i18n-agnostic.
   */
  labels?: {
    description?: string;
    reviews?: string;
    noReviews?: string;
    addToCart?: string;
    adding?: string;
    orderOnWhatsApp?: string;
    whatsappAria?: string;
    shareTitle?: string;
    shareThis?: string;
    shareOnFacebook?: string;
    shareOnInstagram?: string;
    copyLink?: string;
    linkCopied?: string;
    shareInstagramHint?: string;
    cancel?: string;
    shareAria?: string;
  };
  /** Phone number for "Order on WhatsApp" button. Hides the button when null.
   *  Wear Impressive replaced this surface with a "Watch Video" button — kept
   *  on the interface so other themes (bazaar/bold/boutique) still compile. */
  whatsappNumber?: string | null;
  /** Pre-filled message body for the WhatsApp deep link. */
  whatsappMessage?: string;
  /** YouTube URL for the "Watch Video" button. Hides the button when null. */
  videoUrl?: string | null;
  /** Click handler for the "Watch Video" button — opens the video modal. */
  onWatchVideoClick?: () => void;
  /** Localized label for the Watch Video button. */
  watchVideoLabel?: string;
  /** YouTube URL for the "Size Guide" link. Hidden when null. */
  sizeGuideUrl?: string | null;
  /** Click handler for the "Size Guide" link — opens the video modal. */
  onSizeGuideClick?: () => void;
  /** Canonical product page URL — used by share & WhatsApp links. */
  productUrl?: string;
  /** Canonical product image URL — used by share modal previews. */
  productImage?: string | null;
  /**
   * Slot rendered inside the Reviews tab. Themes call out to it instead of
   * showing a "no reviews" placeholder, so the reviews UI lives next to its
   * trigger (the Reviews tab button) rather than as a separate stacked
   * section below the product detail.
   */
  reviewsContent?: React.ReactNode;
}

export interface ThemeContactProps {
  storeName: string;
  email: string;
  phone: string;
  address: string;
}

/* ── Theme definition ───────────────────────────────────────────── */
export interface ThemeComponents {
  ProductCard: React.FC<ThemeProductCardProps>;
  Hero: React.FC<ThemeHeroProps>;
  CategoryCard: React.FC<ThemeCategoryCardProps>;
  Header: React.FC<ThemeHeaderProps>;
  Footer: React.FC<ThemeFooterProps>;
  ProductDetail: React.FC<ThemeProductDetailProps>;
  Contact: React.FC<ThemeContactProps>;
}

export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  colors: { primary: string; accent: string; background: string };
  fonts: { heading: string; body: string };
  preview: string; // placeholder
}

export interface Theme {
  meta: ThemeMeta;
  components: ThemeComponents;
}

/* ── Theme registry ─────────────────────────────────────────────── */
const registry: Record<string, Theme> = {};

export function registerTheme(theme: Theme) {
  registry[theme.meta.id] = theme;
}

export function getTheme(id: string): Theme | undefined {
  return registry[id];
}

export function getAllThemes(): Theme[] {
  return Object.values(registry);
}

/* ── Theme context ──────────────────────────────────────────────── */
const ThemeContext = createContext<Theme | null>(null);

export const ThemeProvider = ThemeContext.Provider;

export function useTheme(): ThemeComponents {
  const theme = useContext(ThemeContext);
  if (!theme) {
    // Fallback to classic if no provider
    const classic = registry['classic'];
    if (classic) return classic.components;
    throw new Error('No theme loaded. Wrap your app in ThemeProvider.');
  }
  return theme.components;
}

export function useThemeMeta(): ThemeMeta | null {
  const theme = useContext(ThemeContext);
  return theme?.meta ?? null;
}
