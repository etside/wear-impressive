import { NextRequest, NextResponse } from 'next/server';

/**
 * Same-origin proxy for cross-origin images.
 *
 * Why: jsPDF's `loadImageAsDataUrl` does a `fetch(url, { mode: 'cors' })`
 * to embed the store logo. In dev, Laravel's `php artisan serve` returns
 * `/storage/*` files via PHP's built-in static handler, bypassing the
 * CORS middleware — so the browser blocks the request and the PDF falls
 * back to text-only branding.
 *
 * This route fetches the upstream URL server-side (no CORS rules apply
 * here since the request originates from the Next.js node process, not
 * the browser) and streams the bytes back. The client treats it as
 * same-origin so the canvas/data-url path works cleanly.
 *
 * Locked to known image hosts so this can't be abused as an open proxy.
 */

const ALLOWED_HOSTS = new Set([
  // Production hosts. Match the storefront and any backend/storage subdomains
  // the deployment uses for serving uploaded assets (logos, product images).
  'wearimpressive.com',
  'www.wearimpressive.com',
  'api.wearimpressive.com',
  'api.v2.wearimpressive.com',
  'cdn.wearimpressive.com',
]);

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');
  if (!target) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  const upstream = await fetch(parsed.toString(), { cache: 'force-cache' });
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: upstream.status });
  }

  const buffer = await upstream.arrayBuffer();
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      // 1-hour cache — logos rarely change.
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
