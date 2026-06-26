'use client';

import { useShopBase } from '@/lib/use-shop-base';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingBag, User, Menu, X, MapPin, Facebook, Instagram, Youtube, ChevronDown } from "lucide-react";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useLang } from "@/lib/i18n/context";
import { StoreThemeProvider } from "@/components/store/theme-provider";
import { CartSlideover } from "@/components/store/cart-slideover";
import { installStorefrontInterceptor } from "@/lib/api/storefront-context";
import { cartApi, storeInfoApi, publicCategoriesApi, publicProductsApi } from "@/lib/api/services/storefront";
import { contrastText, contrastTextMuted, isDarkColor } from "@/lib/color-contrast";
import { useDynamicFavicon } from "@/lib/use-dynamic-favicon";

// Install axios interceptor for storefront (store handle + guest cart token).
installStorefrontInterceptor();

interface MenuItem {
  /** Legacy single-language label, kept so existing saved menus keep working. */
  label?: string;
  /** Bilingual labels — preferred. Storefront picks based on active language. */
  label_en?: string;
  label_bn?: string;
  url: string;
  children?: MenuItem[];
}

function StorefrontNav() {
  const __sb = useShopBase();
  const pathname = usePathname();
  useDynamicFavicon();

  const { t, lang } = useLang();

  const storeInfoQuery = useQuery({
    queryKey: ['storefront', 'store-info-full'],
    queryFn: () => storeInfoApi.full(),
    staleTime: 60_000,
  });

  const cartQuery = useQuery({
    queryKey: ['storefront', 'cart'],
    queryFn: () => cartApi.show(),
    staleTime: 10_000,
    retry: false,
  });

  const store = storeInfoQuery.data?.store;
  const storeName = store?.name ?? 'Wear Impressive';
  const initials = storeName.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase() || 'WI';
  const logoUrl = store?.logo ?? '/images/wi-logo.png';
  const cartCount = cartQuery.data?.items?.reduce((sum, i) => sum + (i.quantity ?? 0), 0) ?? 0;

  // Direct the user-icon link to /account/login when the customer isn't
  // signed in, so they don't bounce through the gated /account page first.
  // Default to /account so SSR/hydration matches; flip on mount if no token.
  const [accountHref, setAccountHref] = useState(`${__sb}/account`);
  useEffect(() => {
    const hasToken = !!localStorage.getItem('etommerce_customer_token');
    setAccountHref(hasToken ? `${__sb}/account` : `${__sb}/account/login`);
  }, [__sb]);

  // Mobile drawer state — auto-closes on route navigation so tapping a
  // menu link both navigates and dismisses the panel.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [desktopDropdown, setDesktopDropdown] = useState<string | null>(null);
  useEffect(() => {
    if (mobileNavOpen) setMobileNavOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Right-side cart slideover. Closes on route change so navigating to
  // /products from inside the drawer doesn't leave it stuck open.
  const [cartOpen, setCartOpen] = useState(false);
  useEffect(() => {
    if (cartOpen) setCartOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Any page can ask us to open the cart by dispatching `cart:open`
  // (e.g. the product detail page after add-to-cart succeeds, paired
  // with the fly-to-cart animation).
  useEffect(() => {
    const handler = () => setCartOpen(true);
    window.addEventListener('cart:open', handler);
    return () => window.removeEventListener('cart:open', handler);
  }, []);

  // Header background follows the customizer's bgColor override; text colors
  // are derived from luminance so the store name + nav stay readable on any
  // brand colour (white, dark teal, etc.). Avatar fallback uses primary color
  // and gets its initials contrasted against THAT, not the header bg.
  const settings = (storeInfoQuery.data?.settings ?? {}) as Record<string, unknown>;
  const overridesRaw = settings['theme.overrides'];
  let overrides: { bgColor?: string; primaryColor?: string } = {};
  try {
    overrides = typeof overridesRaw === 'string'
      ? JSON.parse(overridesRaw)
      : (overridesRaw as { bgColor?: string; primaryColor?: string }) ?? {};
  } catch { /* ignore */ }
  const headerBg = overrides.bgColor || '#ffffff';
  const headerText = contrastText(headerBg);
  const headerTextMuted = contrastTextMuted(headerBg);
  const headerIsDark = isDarkColor(headerBg);
  const avatarBg = overrides.primaryColor || '#000000';
  const avatarText = contrastText(avatarBg);

  // Vendor-managed announcement bar. Falls back to the i18n default copy when
  // the vendor hasn't configured one yet so a freshly-spun-up store still
  // gets a useful banner. Values are read from store settings:
  //   announcement.enabled  (boolean)
  //   announcement.text_en  (string)
  //   announcement.text_bn  (string)
  //   announcement.link_url (string, optional)
  //   announcement.bg_color (string, optional)
  //   announcement.text_color (string, optional)
  const annEnabled = settings['announcement.enabled'];
  const annTextEn = (settings['announcement.text_en'] as string | undefined) ?? '';
  const annTextBn = (settings['announcement.text_bn'] as string | undefined) ?? '';
  const annLinkUrl = (settings['announcement.link_url'] as string | undefined) ?? '';
  const annBgColor = (settings['announcement.bg_color'] as string | undefined) ?? '#000000';
  const annTextColor = (settings['announcement.text_color'] as string | undefined) ?? '#ffffff';
  // If neither bilingual field is filled, the vendor either hasn't configured
  // one or explicitly disabled — but we keep the i18n fallback for empty stores.
  const announcementText =
    (lang === 'bn' ? annTextBn : annTextEn) ||
    (lang === 'bn' ? annTextEn : annTextBn) ||
    `${t.storeNav.announcement} ${t.storeNav.code}`;
  // Only show the announcement bar once store data has loaded.
  // Before that, annEnabled is undefined (undefined !== false = true) which
  // would flash a black bar using the i18n fallback text — we suppress it.
  const showAnnouncement = !!storeInfoQuery.data && annEnabled !== false && !!announcementText.trim();

  // Vendor-managed main menu via /dashboard/content/menus. Falls back to the
  // default i18n links when the store hasn't set one up yet.
  const menusRecord = (storeInfoQuery.data?.menus ?? {}) as Record<string, { items?: MenuItem[] }>;
  const mainMenu = menusRecord['main-menu'] ?? Object.values(menusRecord)[0];
  const fallbackLinks: MenuItem[] = t.storeNav.links.map((label, i) => ({
    label,
    url: [__sb, `${__sb}/products`, `${__sb}/new-arrivals`, `${__sb}/sale`, `${__sb}/about`][i] ?? __sb,
  }));

  /** Resolve a menu item to a single label for the active language with
   *  graceful fallback: BN → EN → legacy label. */
  function resolveLabel(item: MenuItem): string {
    if (lang === 'bn') {
      return item.label_bn?.trim() || item.label_en?.trim() || item.label?.trim() || '';
    }
    return item.label_en?.trim() || item.label?.trim() || item.label_bn?.trim() || '';
  }

  /** Rewrite saved menu URLs to the correct storefront path:
   *  - "/store"          → "{__sb}"          (legacy → new path scheme)
   *  - "/store/products" → "{__sb}/products"
   *  - "/products"       → "{__sb}/products" (new relative format)
   *  - "https://…"       → unchanged (external)
   *  Without this, legacy data (or freshly saved relative URLs) hits the
   *  legacy /store soft-redirect, which falls back to whatever store handle
   *  is in localStorage and can land users on the wrong storefront. */
  // Single-tenant build — `__sb` is always `''` so every storefront URL
  // is just root-relative. We still rewrite legacy `/store/...` and
  // `/shops/<handle>/...` paths from saved menu data in case the vendor's
  // older menu rows still carry those prefixes; both collapse to bare
  // root-relative URLs here.
  function resolveUrl(url: string | undefined): string {
    if (!url) return '/';
    if (/^https?:\/\//i.test(url)) return url;
    if (url === '/' || url === '/store') return '/';
    if (url.startsWith('/store/')) return url.slice('/store'.length) || '/';
    if (url.startsWith('/shops/')) {
      // Strip the `/shops/<handle>` prefix entirely so old menu rows
      // (e.g. `/shops/wi/products`) collapse to `/products`.
      return url.replace(/^\/shops\/[^/]+/, '') || '/';
    }
    return url.startsWith('/') ? url : `/${url}`;
  }

  const rawLinks: MenuItem[] = (mainMenu?.items && mainMenu.items.length > 0)
    ? mainMenu.items
    : fallbackLinks;
  const navLinks = rawLinks
    .map((link) => ({
      url: resolveUrl(link.url),
      label: resolveLabel(link),
      children: link.children?.length
        ? link.children.map(c => ({ url: resolveUrl(c.url), label: resolveLabel(c) })).filter(c => !!c.label)
        : undefined,
    }))
    .filter((l) => !!l.label);

  return (
    <>
      {/* Announcement bar — vendor-managed via /dashboard/settings/general */}
      {showAnnouncement && (
        <div
          className="min-h-9 flex items-center justify-center px-4 py-2 print:hidden"
          style={{ backgroundColor: annBgColor }}
        >
          {annLinkUrl ? (
            <Link href={annLinkUrl} className="text-xs text-center hover:underline" style={{ color: annTextColor }}>
              {announcementText}
            </Link>
          ) : (
            <p className="text-xs text-center" style={{ color: annTextColor }}>
              {announcementText}
            </p>
          )}
        </div>
      )}

      {/* Main header */}
      <header
        className="h-16 border-b sticky top-0 z-20 print:hidden"
        style={{
          backgroundColor: headerBg,
          borderBottomColor: headerIsDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
        }}
      >
        <div className="container-app h-full flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5"
            style={{ color: headerText }}
          >
            <Menu size={20} />
          </button>

          <Link href={__sb || '/'} className="flex items-center mr-4" aria-label={storeName}>
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoUrl} alt={storeName} className="h-10 w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: avatarBg }}
                >
                  <span className="font-bold text-xs" style={{ color: avatarText }}>{initials}</span>
                </div>
                <span
                  className="font-semibold truncate max-w-[200px]"
                  style={{ color: headerText }}
                >
                  {storeName}
                </span>
              </div>
            )}
          </Link>

          <nav className="hidden lg:flex items-center justify-center gap-1 flex-1">
            {navLinks.map((link, i) => {
              const [linkPath, linkQuery = ''] = (link.url || '').split('?');
              const linkCategory = new URLSearchParams(linkQuery).get('category');
              const isHome = linkPath === __sb || linkPath === '/' || linkPath === '';
              const homePath = __sb || '/';
              let isActive: boolean;
              if (isHome) {
                isActive = pathname === homePath;
              } else if (linkCategory) {
                const currentCategory = typeof window !== 'undefined'
                  ? new URLSearchParams(window.location.search).get('category')
                  : null;
                isActive = pathname === linkPath && currentCategory === linkCategory;
              } else {
                isActive = pathname === linkPath;
              }
              const baseColor = isActive ? avatarBg : headerTextMuted;
              const hasChildren = link.children && link.children.length > 0;
              const isOpen = desktopDropdown === link.label;
              return (
                <div
                  key={`${link.label}-${i}`}
                  className="relative"
                  onMouseEnter={() => hasChildren && setDesktopDropdown(link.label)}
                  onMouseLeave={() => setDesktopDropdown(null)}
                >
                  <Link
                    href={link.url}
                    className="px-3 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1"
                    style={{ color: baseColor }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = avatarBg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = baseColor; }}
                  >
                    {link.label}
                    {hasChildren && <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                  </Link>
                  {hasChildren && isOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                      {link.children!.map((child, ci) => (
                        <Link
                          key={ci}
                          href={child.url}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 ml-auto">
            <Link
              href={`${__sb}/search`}
              className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: headerText }}
            >
              <Search size={18} />
            </Link>
            <button
              type="button"
              data-cart-button="true"
              onClick={() => setCartOpen(true)}
              aria-label={t.cart.title}
              className="relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: headerText }}
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full flex items-center justify-center"
                  style={{ backgroundColor: avatarBg, color: avatarText }}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
            <Link
              href={accountHref}
              className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: headerText }}
            >
              <User size={18} />
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile slide-in drawer */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col lg:hidden transition-transform duration-200 ease-out ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: headerBg }}
      >
        <div
          className="h-16 flex items-center justify-between px-4 border-b shrink-0"
          style={{ borderBottomColor: headerIsDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }}
        >
          <Link href={__sb || '/'} onClick={() => setMobileNavOpen(false)} className="flex items-center" aria-label={storeName}>
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoUrl} alt={storeName} className="h-8 w-auto object-contain" />
            ) : (
              <span className="font-semibold" style={{ color: headerText }}>{storeName}</span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5"
            style={{ color: headerText }}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
          {navLinks.map((link, i) => {
            const hasChildren = link.children && link.children.length > 0;
            const isExpanded = mobileExpanded === link.label;
            return (
              <div key={`${link.label}-${i}`}>
                <div className="flex items-center">
                  <Link
                    href={link.url}
                    onClick={() => { if (!hasChildren) setMobileNavOpen(false); }}
                    className="flex-1 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors hover:bg-black/5"
                    style={{ color: headerText }}
                  >
                    {link.label}
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => setMobileExpanded(isExpanded ? null : link.label)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-black/5"
                      style={{ color: headerText }}
                    >
                      <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {hasChildren && isExpanded && (
                  <div className="ml-3 flex flex-col gap-0.5 border-l-2 border-gray-100 pl-3 mb-1">
                    {link.children!.map((child, ci) => (
                      <Link
                        key={ci}
                        href={child.url}
                        onClick={() => setMobileNavOpen(false)}
                        className="px-3 py-2 text-sm rounded-lg transition-colors hover:bg-black/5"
                        style={{ color: headerText }}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div
          className="border-t p-3 flex items-center gap-2"
          style={{ borderTopColor: headerIsDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }}
        >
          <Link
            href={`${__sb}/search`}
            onClick={() => setMobileNavOpen(false)}
            className="flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-black/5"
            style={{ color: headerText }}
          >
            <Search size={16} /> Search
          </Link>
          <Link
            href={accountHref}
            onClick={() => setMobileNavOpen(false)}
            className="flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-black/5"
            style={{ color: headerText }}
          >
            <User size={16} /> Account
          </Link>
        </div>
      </aside>

      {/* Right-side cart drawer — opened by the cart icon in the header. */}
      <CartSlideover open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

function StorefrontFooter() {
  const { t, lang } = useLang();

  const storeQuery = useQuery({
    queryKey: ['storefront', 'store-info-full'],
    queryFn: () => storeInfoApi.full(),
    staleTime: 60_000,
  });

  const storeName = storeQuery.data?.store?.name ?? 'Wear Impressive';
  const initials = storeName.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase() || 'WI';
  const logoUrl = storeQuery.data?.store?.logo ?? '/images/wi-logo.png';
  const year = new Date().getFullYear();

  // Build the formatted address from the store's structured fields. The
  // backend ships them flat on `store` *and* nested on `store.address` for
  // backward compat — read from the flat side. When the active language is
  // Bangla we prefer the BN translations stored in StoreSetting
  // (`store.address_line_1_bn`, `store.district_bn`, `store.division_bn`,
  // `store.thana_bn`), falling back to the canonical English fields when
  // the vendor hasn't translated. Country code "BD" is rendered as
  // "Bangladesh"/"বাংলাদেশ" depending on lang.
  const storeRaw = storeQuery.data?.store as {
    address_line_1?: string | null;
    division?: string | null;
    district?: string | null;
    thana?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | undefined;
  // Pull the BN translations from settings (already loaded above).
  const settingsForAddr = (storeQuery.data?.settings ?? {}) as Record<string, unknown>;
  const pickAddr = (en: string | null | undefined, bnKey: string): string | null => {
    const bn = (settingsForAddr[bnKey] as string | undefined)?.trim() ?? '';
    if (lang === 'bn') return (bn || en || null);
    return (en || bn || null);
  };
  // Postal codes are universal Western digits in DBs; convert to Bangla
  // numerals when displayed in BN to match the rest of the storefront's
  // numeral handling (matches `formatPrice`'s toBanglaDigits helper).
  const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  const localizePostal = (postal: string | null | undefined): string | null => {
    if (!postal) return null;
    return lang === 'bn' ? postal.replace(/\d/g, (d) => BN_DIGITS[Number(d)]) : postal;
  };
  const addressParts: string[] = [];
  const addrLine = pickAddr(storeRaw?.address_line_1, 'store.address_line_1_bn');
  if (addrLine) addressParts.push(addrLine);
  const lowerAddrLine = (addrLine ?? '').toLowerCase();
  const thana = pickAddr(storeRaw?.thana, 'store.thana_bn');
  if (thana && !lowerAddrLine.includes(thana.toLowerCase())) addressParts.push(thana);
  const district = pickAddr(storeRaw?.district, 'store.district_bn');
  if (district && !lowerAddrLine.includes(district.toLowerCase())) addressParts.push(district);
  const country = storeRaw?.country ?? null;
  if (country === 'BD') addressParts.push(lang === 'bn' ? 'বাংলাদেশ' : 'Bangladesh');
  else if (country) addressParts.push(country);
  const postal = localizePostal(storeRaw?.postal_code);
  if (postal) addressParts.push(postal);
  const formattedAddress = addressParts.join(', ');

  // The store description is single-language at the column level; the Bangla
  // version is mirrored into store settings (`store.description_bn`). Pick the
  // right one based on active lang, with fallback to the canonical English
  // description, then to the i18n placeholder for empty stores.
  const settingsForDesc = (storeQuery.data?.settings ?? {}) as Record<string, unknown>;
  const descriptionEn = (storeQuery.data?.store?.description ?? '').trim();
  const descriptionBn = (settingsForDesc['store.description_bn'] as string | undefined)?.trim() ?? '';
  const storeDescription = lang === 'bn'
    ? (descriptionBn || descriptionEn)
    : (descriptionEn || descriptionBn);

  // The footer hardcodes `bg-black` but the storefront override CSS rewrites
  // bg-black to the vendor's primary color — so the *visual* footer bg is the
  // primary color whenever they've customized one. We compute contrast against
  // that, not against the literal black.
  const settings = (storeQuery.data?.settings ?? {}) as Record<string, unknown>;
  const overridesRaw = settings['theme.overrides'];
  let overrides: { primaryColor?: string } = {};
  try {
    overrides = typeof overridesRaw === 'string'
      ? JSON.parse(overridesRaw)
      : (overridesRaw as { primaryColor?: string }) ?? {};
  } catch { /* ignore */ }
  const footerBg = overrides.primaryColor || '#000000';
  const footerText = contrastText(footerBg);
  const footerMuted = contrastTextMuted(footerBg);
  const footerIsDark = isDarkColor(footerBg);
  const dividerColor = footerIsDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const initialsBg = footerText;
  const initialsText = footerBg;

  return (
    <footer className="bg-black section-sm print:hidden" style={{ color: footerText }}>
      <div className="container-app">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="mb-4">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="h-10 w-auto object-contain"
                  style={footerIsDark ? { filter: 'brightness(0) invert(1)' } : undefined}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: initialsBg }}
                  >
                    <span className="font-bold text-xs" style={{ color: initialsText }}>{initials}</span>
                  </div>
                  <span className="font-semibold" style={{ color: footerText }}>{storeName}</span>
                </div>
              )}
            </div>
            <p className="text-sm" style={{ color: footerMuted }}>
              {storeDescription || t.storeFooter.tagline}
            </p>
          </div>
          {t.storeFooter.cols.map(col => (
            <div key={col.title}>
              <h4 className="font-semibold mb-4 text-sm" style={{ color: footerText }}>{col.title}</h4>
              <ul className="flex flex-col gap-2">
                {col.links.map(l => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm transition-colors"
                      style={{ color: footerMuted }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = footerText; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = footerMuted; }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact: structured address from store profile + social icons
              from `contact.*` settings. Icon colour matches the contrast-derived
              text colour so it stays readable on light or dark footers. */}
          <div>
            <h4 className="font-semibold mb-4 text-sm" style={{ color: footerText }}>{t.storeFooter.contactTitle}</h4>
            {formattedAddress && (
              <div className="flex items-start gap-2 mb-4">
                <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: footerMuted }} />
                <p className="text-sm leading-relaxed" style={{ color: footerMuted }}>
                  {formattedAddress}
                </p>
              </div>
            )}
            {(() => {
              const fb = (settings['contact.facebook'] as string | undefined) ?? null;
              const ig = (settings['contact.instagram'] as string | undefined) ?? null;
              const yt = (settings['contact.youtube'] as string | undefined) ?? null;
              const socials: Array<{ name: string; url: string; Icon: typeof Facebook }> = [];
              if (fb) socials.push({ name: 'Facebook', url: fb, Icon: Facebook });
              if (ig) socials.push({ name: 'Instagram', url: ig, Icon: Instagram });
              if (yt) socials.push({ name: 'YouTube', url: yt, Icon: Youtube });
              if (socials.length === 0) return null;
              return (
                <div className="flex items-center gap-3">
                  {socials.map(({ name, url, Icon }) => (
                    <a
                      key={name}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                      style={{ color: footerText, borderColor: dividerColor, borderWidth: 1 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = footerBg; e.currentTarget.style.backgroundColor = footerText; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = footerText; e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <Icon size={16} />
                    </a>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t"
          style={{ borderTopColor: dividerColor }}
        >
          <p className="text-xs" style={{ color: footerMuted }}>
            &copy; {year} {storeName}. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: footerMuted }}>
            Design and Developed by{' '}
            <a
              href="https://engineerstechbd.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{ color: footerText }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              engineersTech
            </a>
          </p>
          <div className="flex items-center gap-3">
            {t.storeFooter.legal.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs transition-colors"
                style={{ color: footerMuted }}
                onMouseEnter={(e) => { e.currentTarget.style.color = footerText; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = footerMuted; }}
              >
                {l.label}
              </Link>
            ))}
            <LanguageSwitcher variant={footerIsDark ? 'dark' : 'light'} />
          </div>
        </div>
      </div>
    </footer>
  );
}

// Gate: suppress the entire layout (header + footer) until ALL critical
// storefront data has loaded. Fires every query the home page needs in
// parallel here so they all resolve together — the spinner stays until
// everything is ready, then the full page appears in one shot.
// React Query deduplicates requests, so child components that use the
// same query keys get the cached results instantly.
function StoreLayoutGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const storeFullQuery = useQuery({
    queryKey: ['storefront', 'store-info-full'],
    queryFn: () => storeInfoApi.full(),
    staleTime: 60_000,
  });
  const storeQuery = useQuery({
    queryKey: ['storefront', 'store-info'],
    queryFn: () => storeInfoApi.show(),
    staleTime: 60_000,
  });
  const categoriesQuery = useQuery({
    queryKey: ['storefront', 'categories', { active: true }],
    queryFn: () => publicCategoriesApi.list({ is_active: true }),
    staleTime: 60_000,
  });
  const featuredQuery = useQuery({
    queryKey: ['storefront', 'products', { featured: true, per_page: 8 }],
    queryFn: () => publicProductsApi.list({ featured: true, per_page: 8 }),
    staleTime: 60_000,
  });

  const isLoading = !mounted
    || storeFullQuery.isLoading
    || storeQuery.isLoading
    || categoriesQuery.isLoading
    || featuredQuery.isLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wearimpicon.png"
          alt="Loading"
          className="w-16 h-16 animate-spin"
          style={{ animationDuration: '1.2s' }}
        />
      </div>
    );
  }

  return <>{children}</>;
}

import { MetaPixelProvider } from "@/components/store/meta-pixel-provider";
import { GtmProvider } from "@/components/store/gtm-provider";
import { metaPixelStorefrontApi, gtmStorefrontApi } from "@/lib/api/services/storefront";

function StoreLayoutWithPixel({ children }: { children: React.ReactNode }) {
  const { data: pixelConfig } = useQuery({
    queryKey: ['storefront', 'meta-pixel'],
    queryFn: () => metaPixelStorefrontApi.config(),
    staleTime: 5 * 60_000,
  });

  const { data: gtmConfig } = useQuery({
    queryKey: ['storefront', 'gtm'],
    queryFn: () => gtmStorefrontApi.config(),
    staleTime: 5 * 60_000,
  });

  return (
    <GtmProvider gtmConfig={gtmConfig ?? null}>
      <MetaPixelProvider pixelConfig={pixelConfig ?? null}>
        <div className="store-themed min-h-screen flex flex-col">
          <StorefrontNav />
          <main className="flex-1 main-content">{children}</main>
          <StorefrontFooter />
        </div>
      </MetaPixelProvider>
    </GtmProvider>
  );
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreThemeProvider>
      <StoreLayoutGate>
        <StoreLayoutWithPixel>{children}</StoreLayoutWithPixel>
      </StoreLayoutGate>
    </StoreThemeProvider>
  );
}
