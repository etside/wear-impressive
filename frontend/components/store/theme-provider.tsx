'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ThemeProvider as BaseThemeProvider, getTheme } from '@/lib/themes';
import '@/lib/themes/load-all';
import { storeInfoApi } from '@/lib/api/services/storefront';

const ACTIVE_THEME_KEY = 'theme.active_id';
const OVERRIDES_KEY = 'theme.overrides';

interface Overrides {
  primaryColor?: string;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  headingFont?: string;
  bodyFont?: string;
}

const ActiveThemeIdContext = createContext<{
  activeThemeId: string;
  setActiveThemeId: (id: string) => void;
}>({ activeThemeId: 'classic', setActiveThemeId: () => {} });

export function useActiveThemeId() {
  return useContext(ActiveThemeIdContext);
}

function parseOverrides(raw: unknown): Overrides | null {
  if (!raw) return null;
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (obj && typeof obj === 'object') return obj as Overrides;
  } catch { /* fall through */ }
  return null;
}

export function StoreThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeThemeId, setActiveThemeId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('etommerce-active-theme') || 'classic';
    }
    return 'classic';
  });

  // Pull vendor's saved theme + customizer overrides from /api/store/info.
  // Backend settings are the source of truth; localStorage is an optimistic
  // first-paint cache that gets corrected when this query resolves.
  const storeQuery = useQuery({
    queryKey: ['storefront', 'store-info-full'],
    queryFn: () => storeInfoApi.full(),
    staleTime: 60_000,
  });

  const settings = (storeQuery.data?.settings ?? {}) as Record<string, unknown>;
  const serverThemeId = settings[ACTIVE_THEME_KEY];
  const overridesSetting = settings[OVERRIDES_KEY];

  useEffect(() => {
    if (typeof serverThemeId === 'string' && serverThemeId && serverThemeId !== activeThemeId) {
      setActiveThemeId(serverThemeId);
      localStorage.setItem('etommerce-active-theme', serverThemeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverThemeId]);

  // Apply vendor's customizer colors/fonts. Strategy:
  //  1. Set CSS variables on <html> so any theme that opts in can consume them.
  //  2. Inject a scoped <style> block with targeted overrides for the primary-
  //     coloured button/link patterns each built-in theme uses (black, rose,
  //     blue, etc.), so the customizer produces immediately-visible changes
  //     without having to retrofit every theme.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const serverOverrides = parseOverrides(overridesSetting);
    const overrides = serverOverrides
      ?? parseOverrides(localStorage.getItem('etommerce-theme-overrides'));

    // Cache server overrides so the blocking script in layout.tsx can apply
    // them on the NEXT page load before React even hydrates — zero flash.
    if (serverOverrides && overridesSetting) {
      localStorage.setItem(
        'etommerce-theme-overrides',
        typeof overridesSetting === 'string' ? overridesSetting : JSON.stringify(overridesSetting),
      );
    }

    const root = document.documentElement;
    const STYLE_ID = 'etommerce-theme-overrides';
    const existing = document.getElementById(STYLE_ID);

    if (!overrides) {
      existing?.remove();
      return;
    }

    if (overrides.primaryColor) root.style.setProperty('--theme-primary', overrides.primaryColor);
    if (overrides.accentColor)  root.style.setProperty('--theme-accent',  overrides.accentColor);
    if (overrides.bgColor)      root.style.setProperty('--theme-bg',      overrides.bgColor);
    if (overrides.textColor)    root.style.setProperty('--theme-text',    overrides.textColor);
    if (overrides.headingFont)  root.style.setProperty('--theme-heading-font', overrides.headingFont);
    if (overrides.bodyFont)     root.style.setProperty('--theme-body-font',    overrides.bodyFont);

    const p = overrides.primaryColor || '#111827';
    const a = overrides.accentColor  || p;

    // Primary-colour classes each built-in theme uses for its hero button,
    // "Add to Cart", nav links, etc. Everything below `.store-themed` so the
    // rules never leak into the dashboard.
    const css = `
.store-themed .bg-black,
.store-themed .bg-gray-900,
.store-themed .bg-rose-700,
.store-themed .bg-rose-800,
.store-themed .bg-blue-600,
.store-themed .bg-red-600,
.store-themed .bg-pink-600,
.store-themed .bg-orange-500,
.store-themed .bg-amber-500,
.store-themed .bg-green-600,
.store-themed .bg-emerald-600,
.store-themed .bg-violet-600,
.store-themed .bg-indigo-600,
.store-themed .hover\\:bg-gray-800:hover,
.store-themed .hover\\:bg-rose-800:hover { background-color: ${p} !important; }

.store-themed .text-rose-700,
.store-themed .text-rose-800,
.store-themed .text-blue-600,
.store-themed .text-red-600,
.store-themed .text-green-600,
.store-themed .text-orange-500,
.store-themed .text-violet-600,
.store-themed .text-indigo-600 { color: ${p} !important; }

.store-themed .border-rose-700,
.store-themed .border-rose-800,
.store-themed .border-blue-600,
.store-themed .border-red-600,
.store-themed .border-green-600,
.store-themed .border-orange-500 { border-color: ${p} !important; }

.store-themed .accent-bg-swap { background-color: ${a} !important; }
.store-themed .accent-text-swap { color: ${a} !important; }

/* Vendor-picked fonts — apply across the storefront. The Bangla swap
   (handled by the i18n context, which rewrites --font-sans to a Bangla
   font when lang === 'bn') wins automatically: we only override when the
   document is NOT in Bangla mode, so customers reading Bangla still get
   Hind Siliguri / Li Ador Noirrit, regardless of the vendor's pick. */
${overrides.bodyFont ? `
html:not([lang="bn"]) .store-themed,
html:not([lang="bn"]) .store-themed input,
html:not([lang="bn"]) .store-themed button,
html:not([lang="bn"]) .store-themed textarea,
html:not([lang="bn"]) .store-themed select { font-family: '${overrides.bodyFont}', system-ui, sans-serif !important; }
` : ''}
${overrides.headingFont ? `
html:not([lang="bn"]) .store-themed h1,
html:not([lang="bn"]) .store-themed h2,
html:not([lang="bn"]) .store-themed h3,
html:not([lang="bn"]) .store-themed h4,
html:not([lang="bn"]) .store-themed h5,
html:not([lang="bn"]) .store-themed h6 { font-family: '${overrides.headingFont}', system-ui, sans-serif !important; }
` : ''}
`.trim();

    const style = existing ?? document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    if (!existing) document.head.appendChild(style);
  }, [overridesSetting]);

  useEffect(() => {
    localStorage.setItem('etommerce-active-theme', activeThemeId);
  }, [activeThemeId]);

  const theme = getTheme(activeThemeId) || getTheme('classic');

  if (!theme) return <>{children}</>;

  return (
    <ActiveThemeIdContext.Provider value={{ activeThemeId, setActiveThemeId }}>
      <BaseThemeProvider value={theme}>
        {children}
      </BaseThemeProvider>
    </ActiveThemeIdContext.Provider>
  );
}
