import type { Metadata } from 'next';
import ProductDetailClient from './product-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface PageParams {
  params: Promise<{ handle: string; id: string }>;
}

interface FetchedProduct {
  id: number;
  name: string;
  slug?: string;
  short_description?: string | null;
  description?: string | null;
  featured_image?: string | null;
  images?: string[] | null;
  price?: string;
}

/**
 * Fetches the product server-side just enough to render social-sharing
 * metadata (og:title / og:image / og:description). The actual product page
 * is rendered by the client component below — we don't pass the fetched
 * data through, since the client owns reviews, gallery state, etc.
 */
async function fetchProductForMeta(handle: string, slugOrId: string): Promise<FetchedProduct | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/store/products/${encodeURIComponent(slugOrId)}`, {
      headers: { 'X-Store-Handle': handle, Accept: 'application/json' },
      // Cache for 60s — store catalogues don't change every second, and this
      // metadata is only used by social-link previews. Re-fetched on the
      // first request after expiry.
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? null) as FetchedProduct | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { handle, id } = await params;
  const product = await fetchProductForMeta(handle, id);

  if (!product) {
    return { title: 'Product' };
  }

  const description = (product.short_description ?? product.description ?? '')
    .replace(/<[^>]*>/g, '') // strip any HTML so previews don't render markup
    .slice(0, 200);
  const image = product.featured_image ?? product.images?.[0] ?? null;

  return {
    title: product.name,
    description: description || undefined,
    openGraph: {
      title: product.name,
      description: description || undefined,
      type: 'website',
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: product.name,
      description: description || undefined,
      images: image ? [image] : undefined,
    },
  };
}

export default function ProductDetailPage() {
  return <ProductDetailClient />;
}
