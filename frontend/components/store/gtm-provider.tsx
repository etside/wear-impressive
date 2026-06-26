'use client';
/**
 * Google Tag Manager provider for the storefront.
 *
 * Injects the GTM script into <head> and sets up the dataLayer.
 * GTM config is fetched from the storefront API.
 */
import { useEffect } from 'react';
import Script from 'next/script';

interface GtmConfig {
  enabled: boolean;
  gtm_id?: string;
}

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

export function GtmProvider({ gtmConfig }: { gtmConfig: GtmConfig | null }) {
  if (!gtmConfig?.enabled || !gtmConfig.gtm_id) return null;

  return (
    <>
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmConfig.gtm_id}');
          `,
        }}
      />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmConfig.gtm_id}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  );
}
