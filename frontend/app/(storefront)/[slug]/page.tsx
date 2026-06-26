'use client';

import { useShopBase } from '@/lib/use-shop-base';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RichText } from '@/components/ui/rich-text';
import { publicPagesApi } from '@/lib/api/services/storefront';

/**
 * Generic renderer for vendor-authored CMS pages (Return Policy, Shipping
 * Policy, Terms, Privacy, FAQ, etc.) created from the dashboard's Pages
 * editor. Any slug not matched by a more specific static route under
 * `(storefront)/` (e.g. `/about`, `/blog`) falls through to here — Next.js
 * always prefers a static segment over a `[slug]` catch when both exist at
 * the same level, so this can't shadow `/cart`, `/contact`, etc.
 */
export default function CmsPageRoute() {
  const __sb = useShopBase();
  const params = useParams();
  const slug = params.slug as string;

  const pageQuery = useQuery({
    queryKey: ['storefront', 'cms-page', slug],
    queryFn: () => publicPagesApi.get(slug),
    enabled: !!slug,
    retry: false,
  });

  if (pageQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  const page = pageQuery.data;

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Page not found</h1>
          <p className="text-sm text-gray-400 mb-4">The page you&apos;re looking for doesn&apos;t exist.</p>
          <Link href={__sb || '/'}><Button size="sm"><ArrowLeft size={14} /> Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app pt-8 pb-16 max-w-3xl">
      <nav className="flex gap-2 text-xs text-gray-500 mb-8">
        <Link href={__sb || '/'} className="hover:text-gray-900">Home</Link>
        <span>/</span>
        <span className="text-gray-900">{page.title}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{page.title}</h1>

      <RichText
        html={page.content ?? page.body}
        className="text-sm text-gray-700 leading-relaxed"
        fallback={<p className="text-sm text-gray-400">This page has no content yet.</p>}
      />
    </div>
  );
}
