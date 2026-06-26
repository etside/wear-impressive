'use client';
/**
 * Meta Pixel provider for the storefront.
 *
 * Usage:
 *   - Wrap storefront layout with <MetaPixelProvider>.
 *   - Use useMetaPixel() hook in pages/components to fire events.
 *
 * Events fired:
 *   PageView      — on route change (auto via Script onLoad)
 *   ViewContent   — product detail page
 *   AddToCart     — on add-to-cart success
 *   InitiateCheckout — checkout page mount
 *   Purchase      — order-confirmation page
 *
 * Browser pixel fires client-side. CAPI relay is handled by
 * POST /api/store/meta-pixel/event (server-side deduplication).
 */
import { createContext, useContext, useEffect, useRef } from 'react';
import Script from 'next/script';
import { useQuery } from '@tanstack/react-query';
import { storeInfoApi } from '@/lib/api/services/storefront';

// Minimal fbq type declaration.
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

interface PixelConfig {
  enabled: boolean;
  pixel_id: string;
  track_view_content: boolean;
  track_add_to_cart: boolean;
  track_initiate_checkout: boolean;
  track_purchase: boolean;
}

interface MetaPixelContextValue {
  track: (event: string, data?: Record<string, unknown>) => void;
  trackPurchase: (orderId: string, value: number, currency?: string) => void;
  config: PixelConfig | null;
}

const MetaPixelContext = createContext<MetaPixelContextValue>({
  track: () => {},
  trackPurchase: () => {},
  config: null,
});

export function useMetaPixel() {
  return useContext(MetaPixelContext);
}

function generateEventId(event: string): string {
  return `${event}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function sendCapi(event: string, eventId: string, data?: Record<string, unknown>) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    await fetch(`${baseUrl}/store/meta-pixel/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: event,
        event_id: eventId,
        event_source_url: window.location.href,
        ...data,
      }),
    });
  } catch {
    // Fire-and-forget — CAPI failure must not affect UX
  }
}

export function MetaPixelProvider({ children, pixelConfig }: {
  children: React.ReactNode;
  pixelConfig: PixelConfig | null;
}) {
  const initialized = useRef(false);

  const track = (event: string, data?: Record<string, unknown>) => {
    if (!pixelConfig?.enabled || !pixelConfig.pixel_id) return;
    const eventId = generateEventId(event);
    if (window.fbq) {
      window.fbq('track', event, data ?? {}, { eventID: eventId });
    }
    // CAPI dedup relay
    sendCapi(event, eventId, data);
  };

  const trackPurchase = (orderId: string, value: number, currency = 'BDT') => {
    if (!pixelConfig?.track_purchase) return;
    track('Purchase', { value, currency, order_id: orderId });
  };

  useEffect(() => {
    if (!pixelConfig?.enabled || initialized.current) return;
    initialized.current = true;
  }, [pixelConfig]);

  return (
    <MetaPixelContext.Provider value={{ track, trackPurchase, config: pixelConfig }}>
      {pixelConfig?.enabled && pixelConfig.pixel_id && (
        <Script
          id="meta-pixel-base"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pixelConfig.pixel_id}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}
      {children}
    </MetaPixelContext.Provider>
  );
}
