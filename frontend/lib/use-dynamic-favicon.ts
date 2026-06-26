'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storeInfoApi } from '@/lib/api/services/storefront';

/**
 * Swaps the document's <link rel="icon"> to the store's saved favicon
 * (uploaded via Branding settings) when one is set. Falls back to the
 * static /icon.png that Next.js auto-discovers from app/icon.png otherwise.
 *
 * Both the storefront layout and the dashboard shell call this so a vendor
 * who uploads a new favicon sees it across the whole app.
 */
export function useDynamicFavicon() {
  const { data } = useQuery({
    queryKey: ['storefront', 'store-info-full'],
    queryFn: () => storeInfoApi.full(),
    staleTime: 60_000,
    retry: false,
  });

  const favicon = data?.store?.favicon ?? null;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!favicon) return; // keep the static fallback

    // Backend returns favicon as a *relative* path (e.g.
    // "stores/17/branding/abc.png") while logo comes back absolute. Build
    // the full URL ourselves: anything starting with http/https is already
    // absolute; bare relative paths get prefixed with the API origin's
    // /storage/ public disk.
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api\/?$/, '');
    const url = /^https?:\/\//i.test(favicon)
      ? favicon
      : `${apiBase}/storage/${favicon.replace(/^\/+/, '')}`;

    // Cache-bust so the browser doesn't keep showing the previous icon
    // from disk cache on the very next save.
    const busted = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = busted;
  }, [favicon]);
}
